/* =============================================
   SLOW FIRE SHOP — Cloud Functions
   - createCheckoutSession : Stripe Checkout Session（Apple/Google Pay対応）
   - stripeWebhook         : 決済完了時に注文ステータス更新
   - fetchProductMeta      : URL→OGPメタデータ取得（管理画面のAI入力支援）
   ============================================= */
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
    }
    res.json({ received: true });
  }
);

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
