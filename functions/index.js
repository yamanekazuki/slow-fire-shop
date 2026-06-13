/* =============================================
   SLOW FIRE SHOP — Cloud Functions
   - createCheckoutSession : Stripe Checkout Session（Apple/Google Pay対応）
   - stripeWebhook         : 決済完了時に注文ステータス更新 + 管理者通知メール
   - fetchProductMeta      : URL→OGPメタデータ取得（管理画面のAI入力支援）
   ============================================= */

// 管理者への購入通知メール送信先（Firebase拡張 "Trigger Email" が拾う）
const ADMIN_NOTIFY_EMAILS = ['yamane@potentialight.com'];
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { onRequest } = require('firebase-functions/v2/https');
const { setGlobalOptions } = require('firebase-functions/v2');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');
const fetch = require('node-fetch');

admin.initializeApp();

setGlobalOptions({ region: 'asia-northeast1', maxInstances: 10 });

// Stripeのキーは Firebase Secrets で安全に管理
// 設定: firebase functions:secrets:set STRIPE_SECRET_KEY
const STRIPE_SECRET_KEY = defineSecret('STRIPE_SECRET_KEY');
const STRIPE_WEBHOOK_SECRET = defineSecret('STRIPE_WEBHOOK_SECRET');
// Anthropic（Claude）API キー — みんなのBBQ記録の写真AI解析に使用
// 設定: firebase functions:secrets:set ANTHROPIC_API_KEY
const ANTHROPIC_API_KEY = defineSecret('ANTHROPIC_API_KEY');

// =============================================
// createCheckoutSession — Stripe Checkout を開始
// =============================================
exports.createCheckoutSession = onCall(
  { secrets: [STRIPE_SECRET_KEY], cors: true },
  async (request) => {
    const stripe = require('stripe')(STRIPE_SECRET_KEY.value());
    const data = request.data || {};
    const items = Array.isArray(data.items) ? data.items : [];
    if (!items.length) throw new HttpsError('invalid-argument', 'カートが空です');

    const subtotal = items.reduce((s, i) => s + (i.price || 0) * (i.qty || 1), 0);
    const shippingFee = subtotal >= 15000 ? 0 : 990;

    const lineItems = items.map(i => ({
      quantity: i.qty || 1,
      price_data: {
        currency: 'jpy',
        unit_amount: i.price,
        product_data: {
          name: i.name,
          images: i.image ? [i.image] : [],
        },
      },
    }));

    if (shippingFee > 0) {
      lineItems.push({
        quantity: 1,
        price_data: {
          currency: 'jpy',
          unit_amount: shippingFee,
          product_data: { name: '配送料（全国一律）' },
        },
      });
    }

    const origin = request.rawRequest?.headers?.origin || data.origin || 'https://yamanekazuki.github.io';

    try {
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: ['card'],
        line_items: lineItems,
        customer_email: data.email || undefined,
        locale: 'ja',
        billing_address_collection: 'auto',
        shipping_address_collection: { allowed_countries: ['JP'] },
        success_url: `${origin}/?payment=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url:  `${origin}/?payment=cancel`,
        metadata: {
          orderId: data.orderId || '',
          uid: request.auth?.uid || '',
        },
      });
      return { url: session.url, id: session.id };
    } catch (err) {
      console.error('Stripe error:', err);
      throw new HttpsError('internal', err.message);
    }
  }
);

// =============================================
// stripeWebhook — 決済完了で注文ステータスを更新
// 設定: Stripeダッシュボード → Webhook → エンドポイント追加
//   URL: https://<region>-<project>.cloudfunctions.net/stripeWebhook
//   イベント: checkout.session.completed
// =============================================
exports.stripeWebhook = onRequest(
  { secrets: [STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET], cors: false },
  async (req, res) => {
    const stripe = require('stripe')(STRIPE_SECRET_KEY.value());
    const sig = req.headers['stripe-signature'];
    let event;
    try {
      event = stripe.webhooks.constructEvent(req.rawBody, sig, STRIPE_WEBHOOK_SECRET.value());
    } catch (err) {
      console.error('Webhook signature error:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const orderId = session.metadata?.orderId;
      if (orderId) {
        await admin.firestore().collection('orders').doc(orderId).set({
          status: 'paid',
          stripeSessionId: session.id,
          paymentIntent: session.payment_intent,
          paidAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
      }

      // 管理者へ購入通知メール（Firebase拡張 "Trigger Email from Firestore" が mail コレクションを監視して送信）
      try {
        await sendAdminOrderNotification(stripe, session, orderId);
      } catch (mailErr) {
        // 通知失敗は決済処理自体を巻き戻さない（Stripe側のリトライを避ける）
        console.error('Order notification email error:', mailErr);
      }
    }
    res.json({ received: true });
  }
);

// =============================================
// sendAdminOrderNotification — 管理者宛に購入通知メールを作成
// Firebase拡張「Trigger Email from Firestore」が `mail` コレクションを監視し
// 自動送信する仕組みのため、ここでは Firestore に書き込むだけ
// =============================================
async function sendAdminOrderNotification(stripe, session, orderId) {
  // Stripe Sessionから明細・配送先を取得（line_itemsはretrieveで展開が必要）
  const full = await stripe.checkout.sessions.retrieve(session.id, {
    expand: ['line_items.data.price.product'],
  });

  const items = (full.line_items?.data || []).map((li) => ({
    name: li.description || li.price?.product?.name || '商品',
    qty: li.quantity || 1,
    amount: li.amount_total || 0,
  }));

  const customer = full.customer_details || {};
  const shipping =
    full.collected_information?.shipping_details ||
    full.shipping_details ||
    full.shipping ||
    {};
  const addr = shipping.address || {};

  const itemRows = items.length
    ? items.map((i) => `・${i.name} × ${i.qty}　¥${(i.amount || 0).toLocaleString()}`).join('\n')
    : '（明細取得失敗）';

  const addressBlock = [
    shipping.name || customer.name || '',
    addr.postal_code ? `〒${addr.postal_code}` : '',
    [addr.state, addr.city, addr.line1, addr.line2].filter(Boolean).join(' '),
  ]
    .filter(Boolean)
    .join('\n');

  const total = full.amount_total || 0;
  const subject = `【SLOW FIRE SHOP】新規注文 ${orderId || session.id}（¥${total.toLocaleString()}）`;

  const text = [
    '新しい注文が入りました。',
    '',
    `■ 注文ID: ${orderId || '（なし）'}`,
    `■ Stripe Session: ${session.id}`,
    '',
    '■ 購入者',
    `${customer.name || '（名前なし）'} <${customer.email || ''}>`,
    customer.phone ? `電話: ${customer.phone}` : '',
    '',
    '■ 商品',
    itemRows,
    '',
    `■ 合計金額: ¥${total.toLocaleString()}`,
    '',
    '■ 配送先',
    addressBlock || '（未入力）',
    '',
    '管理画面: https://yamanekazuki.github.io/slow-fire-shop/admin.html',
  ]
    .filter((line) => line !== null && line !== undefined)
    .join('\n');

  await admin.firestore().collection('mail').add({
    to: ADMIN_NOTIFY_EMAILS,
    message: {
      subject,
      text,
      html: text.replace(/\n/g, '<br>'),
    },
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

// =============================================
// fetchProductMeta — URLからOGPメタデータを取得
// 管理画面で「URL貼付 → 自動入力」のために使用
// =============================================
exports.fetchProductMeta = onCall({ cors: true }, async (request) => {
  const url = request.data?.url;
  if (!url || typeof url !== 'string') {
    throw new HttpsError('invalid-argument', 'URLを指定してください');
  }
  if (!/^https?:\/\//.test(url)) {
    throw new HttpsError('invalid-argument', '有効なHTTP(S) URLを指定してください');
  }

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 SlowFireBot/1.0' },
      timeout: 15000,
    });
    if (!res.ok) throw new HttpsError('not-found', `ページ取得失敗: ${res.status}`);
    const html = await res.text();

    const meta = (name, attr = 'property') => {
      const re = new RegExp(`<meta\\s+[^>]*${attr}=[\"']${name}[\"'][^>]*content=[\"']([^\"']+)[\"']`, 'i');
      const re2 = new RegExp(`<meta\\s+[^>]*content=[\"']([^\"']+)[\"'][^>]*${attr}=[\"']${name}[\"']`, 'i');
      const m = html.match(re) || html.match(re2);
      return m ? m[1] : null;
    };

    const title = meta('og:title') || meta('twitter:title', 'name') ||
                  (html.match(/<title[^>]*>([^<]+)<\/title>/i) || [])[1] || '';
    const description = meta('og:description') || meta('description', 'name') ||
                        meta('twitter:description', 'name') || '';
    const image = meta('og:image') || meta('twitter:image', 'name') || '';
    const siteName = meta('og:site_name') || '';
    const price = meta('product:price:amount') || meta('og:price:amount') || '';

    // Plain text excerpt for AI augmentation
    const stripped = html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .slice(0, 5000);

    return {
      title: title.trim(),
      description: description.trim(),
      image: image.trim(),
      siteName: siteName.trim(),
      price: price.trim(),
      excerpt: stripped.trim(),
      sourceUrl: url,
    };
  } catch (err) {
    console.error('OGP fetch error:', err);
    throw new HttpsError('internal', err.message);
  }
});

// =============================================
// analyzeCookPhoto — BBQ写真をClaude（Vision）で解析し
// 料理名・タグ・作り方メモ・道具・温度帯を自動推定して返す
// （みんなのBBQ記録の投稿コンポーザーの自動入力）
// =============================================
const COOK_TAGS = ['牛', '豚', '鶏', 'ラム', '魚介', '野菜', 'スモーク', 'ロースト', '直火', '低温長時間', '燻製', 'デザート', '初挑戦', '自信作'];

exports.analyzeCookPhoto = onCall(
  { secrets: [ANTHROPIC_API_KEY], cors: true, memory: '512MiB', timeoutSeconds: 60 },
  async (request) => {
    const data = request.data || {};
    const imageB64 = data.image;                 // base64（data URLプレフィックス無し）
    const mime = data.mime || 'image/jpeg';
    if (!imageB64 || typeof imageB64 !== 'string') {
      throw new HttpsError('invalid-argument', '画像データがありません');
    }

    const Anthropic = require('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY.value() });

    const schema = {
      type: 'object',
      additionalProperties: false,
      properties: {
        dishName:  { type: 'string', description: '料理名。簡潔で具体的に（例：スペアリブのスモーク）' },
        tags:      { type: 'array', items: { type: 'string', enum: COOK_TAGS }, description: '当てはまるタグ（最大4つ）' },
        method:    { type: 'string', description: '写真から推測できる調理法・火加減・ポイントのメモ（2〜3文、日本語）' },
        gear:      { type: 'string', description: '使っていそうなグリル/道具。不明なら空文字' },
        tempLabel: { type: 'string', description: '推測される温度帯（例：高温直火 / 低温110℃）。不明なら空文字' },
        isFood:    { type: 'boolean', description: '料理・食材の写真ならtrue、そうでなければfalse' }
      },
      required: ['dishName', 'tags', 'method', 'gear', 'tempLabel', 'isFood']
    };

    try {
      const response = await client.messages.create({
        model: 'claude-opus-4-8',
        max_tokens: 1024,
        system: 'あなたはBBQ・グリル料理の専門家です。アップロードされた写真を見て、何の料理かを推測し、日本語でタイトル・タグ・作り方メモを生成します。確信が持てない部分は無理に断定せず、自然な範囲で推測してください。タグは指定された候補からのみ選びます。',
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mime, data: imageB64 } },
            { type: 'text', text: 'このBBQ/料理写真を解析して、料理名・タグ・作り方メモ・道具・温度帯を埋めてください。料理でない写真ならisFoodをfalseにしてください。' }
          ]
        }],
        output_config: { format: { type: 'json_schema', schema } }
      });

      const textBlock = (response.content || []).find(b => b.type === 'text');
      if (!textBlock) throw new HttpsError('internal', 'AI応答が空でした');
      const parsed = JSON.parse(textBlock.text);
      return parsed;
    } catch (err) {
      console.error('analyzeCookPhoto error:', err);
      throw new HttpsError('internal', err.message || 'AI解析に失敗しました');
    }
  }
);
