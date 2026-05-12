# SLOW FIRE SHOP — セットアップ手順

## 全体像

本プロジェクトは以下の3層で動きます。

| 層 | 内容 | 所要時間 |
|---|---|---|
| **Firebase** | Auth（会員登録）・Firestore（商品・注文）・Storage（画像）・Hosting（公開）・Functions（サーバー処理） | 15分 |
| **Stripe** | 決済（カード・Apple Pay・Google Pay） | 10分 |
| **Claude API**（任意） | 管理画面でURL→商品文章自動生成 | 5分 |

---

## ステップ 1：Firebase プロジェクトを作る（5分）

1. https://console.firebase.google.com にアクセス
2. **「プロジェクトを追加」** → 名前を入力（例：`slow-fire-shop`）
3. Google Analyticsは「**有効にしない**」でOK
4. プロジェクト作成完了 → ダッシュボードに入る

### 1-1. ウェブアプリを登録

1. プロジェクトトップ画面 → **`</>`（ウェブ）アイコン**をクリック
2. アプリのニックネーム：`slow-fire-shop` 等
3. **「Firebase Hosting も設定する」にチェック**
4. 「アプリを登録」 → 表示される設定オブジェクト（`firebaseConfig`）をコピー

```js
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "your-id.firebaseapp.com",
  projectId: "your-id",
  storageBucket: "your-id.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:..."
};
```

### 1-2. `firebase-config.js` に貼り付け

このリポジトリの `firebase-config.js` を開き、`SF_CONFIG.firebase` に上記の値をコピー。

### 1-3. `.firebaserc` を編集

```json
{
  "projects": {
    "default": "your-id"   ← projectId をここに
  }
}
```

### 1-4. Firebase の各機能を有効化

Firebaseコンソールで以下を有効にします（左メニュー）：

| 機能 | 操作 |
|---|---|
| **Authentication** | 「使ってみる」→ ログインプロバイダ → **メール/パスワード** と **Google** を有効化 |
| **Firestore Database** | 「データベースを作成」→ 本番モード → ロケーション `asia-northeast1`（東京） |
| **Storage** | 「使ってみる」→ 本番モード → 同じくロケーション `asia-northeast1` |
| **Functions** | Cloud Functionsはコマンドからデプロイ。**Blazeプラン（従量課金）が必要**。月¥0〜¥数百で済みます。 |

### 1-5. 管理者として自分を登録

1. Authentication → 「ユーザーを追加」→ あなたのメール / パスワードを登録
2. そのユーザーの **UID** をコピー
3. Firestore Database → コレクションを開始 → `admins` → ドキュメントID = 上記のUID → フィールド `email` にあなたのメールを入力 → 保存

これで `admin.html` にログインできるようになります。

---

## ステップ 2：Stripe アカウント（10分）

1. https://stripe.com → サインアップ
2. ダッシュボード → **開発者 → APIキー**
3. **公開可能キー**（`pk_test_...` または `pk_live_...`）をコピー → `firebase-config.js` の `stripeKey` に貼り付け
4. **シークレットキー**（`sk_test_...` または `sk_live_...`）はサーバー側で使うので、後ほど Cloud Functions の Secret に登録します

### 2-1. Apple Pay / Google Pay を有効化

Stripeダッシュボード → **設定 → 決済方法** → Apple Pay と Google Pay の項目で「**有効にする**」をクリック。
ドメインを登録する必要があるので、Hosting URL（例：`your-id.web.app`）を追加してください。

---

## ステップ 3：Cloud Functions のデプロイ（10分）

### 3-1. Firebase CLI のインストール

```bash
npm install -g firebase-tools
firebase login
```

### 3-2. Stripeシークレットキーを Firebase Secrets に登録

```bash
cd /Users/yamanekazuki/Documents/bbq-shop
firebase functions:secrets:set STRIPE_SECRET_KEY
# プロンプトで sk_test_... を貼り付け

firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
# Webhookエンドポイント作成後（下記）に貼り付け
```

### 3-3. 依存パッケージのインストール

```bash
cd functions
npm install
cd ..
```

### 3-4. Functions をデプロイ

```bash
firebase deploy --only functions
```

**初回は Blazeプランへのアップグレード確認** が出るので承認してください（無料枠が広く、本商用前にコストはほぼ発生しません）。

### 3-5. Stripe Webhook を設定

1. Stripeダッシュボード → **開発者 → Webhook → エンドポイントを追加**
2. URL：`https://asia-northeast1-<project-id>.cloudfunctions.net/stripeWebhook`
3. イベント：`checkout.session.completed`
4. 表示される **署名シークレット**（`whsec_...`）をコピー
5. ターミナルで：
   ```bash
   firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
   # whsec_... を貼り付け
   firebase deploy --only functions
   ```

---

## ステップ 3.6：購入通知メール（Firebase拡張）の設定（5分）

注文が入ったとき `yamane@potentialight.com` にメール通知が届くようにします。
公式の Firebase拡張「**Trigger Email from Firestore**」を使うので、コードは既に対応済みです。

### 3.6-1. Gmailアプリパスワードを取得（Google Workspaceでも可）

1. https://myaccount.google.com/security にアクセス
2. **「2段階認証プロセス」** を有効化（未設定の場合）
3. https://myaccount.google.com/apppasswords を開く
4. アプリ名「Slow Fire Shop」で生成 → 16桁のパスワードをコピー

> Workspace管理者でSMTPリレーを許可している場合は、リレーホスト経由でも可。

### 3.6-2. 拡張機能をインストール

```bash
cd /Users/yamanekazuki/Documents/bbq-shop
firebase ext:install firebase/firestore-send-email
```

プロンプトで以下を入力：

| 設定項目 | 値 |
|---|---|
| Cloud Functions location | `asia-northeast1` |
| SMTP connection URI | `smtps://yamane%40potentialight.com:【アプリパスワード】@smtp.gmail.com:465` |
| SMTP password (secret) | （アプリパスワードを再入力、または上記URIに含めればスキップ可） |
| Default FROM address | `SLOW FIRE SHOP <yamane@potentialight.com>` |
| Default REPLY-TO address | `yamane@potentialight.com` |
| Email documents collection | `mail` |
| Users collection | （空欄でOK） |
| Templates collection | （空欄でOK） |

> ⚠️ メールアドレスの `@` はURI内では `%40` にエンコード必須。
> 例: `yamane%40potentialight.com`

### 3.6-3. 動作確認

1. Stripeテスト決済（`4242 4242 4242 4242`）を実行
2. `yamane@potentialight.com` に「【SLOW FIRE SHOP】新規注文 …」が届けばOK
3. Firebase Console → **Extensions → Trigger Email → ログ** で配信状況を確認できる
4. Firestore `mail/{自動ID}` ドキュメントに `delivery.state = SUCCESS` が記録される

### 3.6-4. 通知先を変更したいとき

`functions/index.js` 冒頭の `ADMIN_NOTIFY_EMAILS` 配列にメールアドレスを追加し、`firebase deploy --only functions:stripeWebhook` で反映。

---

## ステップ 4：Hosting にデプロイ（3分）

```bash
firebase deploy --only hosting
```

完了後、コンソールに表示されるURL（例：`https://your-id.web.app`）でECサイトが公開されます。

**追加で**：

```bash
# Firestore / Storage ルールも本番反映
firebase deploy --only firestore:rules,firestore:indexes,storage:rules
```

---

## ステップ 5：商品をインポート（2分）

1. デプロイ済みURL `/admin.html` にアクセス
2. ステップ1-5で登録した管理者メール/パスワードでログイン
3. 「**商品管理 → デフォルト商品をインポート**」 → Firestoreに13商品が登録される
4. 必要なら「+ 商品を追加」→ URLを貼ると自動的に名前・画像・説明が埋まります

---

## ステップ 6：（任意）Claude API キー登録 — AI商品紹介文生成

URLからより自然な日本語の紹介文をAIに書かせたい場合：

1. https://console.anthropic.com → API Keys → 新規作成
2. 管理画面 → 設定タブ → Claude APIキー欄に貼り付け
3. 以後、URL貼付時にAIが2〜3文の紹介文を自動生成

なお、このキーはあなたのブラウザの localStorage にのみ保存され、サーバーには送信されません。

---

## 動作確認チェックリスト

| ✅ | 項目 |
|---|---|
| ☐ | `https://<project>.web.app` でECサイトが開く |
| ☐ | ナビ右上の「ログイン」から会員登録できる |
| ☐ | Googleログインボタンが動作する |
| ☐ | 商品をカートに入れ、「決済画面に進む」でStripe Checkoutに遷移する |
| ☐ | テストカード `4242 4242 4242 4242` で決済できる |
| ☐ | 決済後 `?payment=success` で戻り、注文がFirestoreに記録される |
| ☐ | スマホで Apple Pay / Google Pay ボタンが表示される |
| ☐ | `/admin.html` で管理者ログインでき、商品の追加・編集ができる |
| ☐ | 管理画面でURLを貼ると商品情報が自動入力される |
| ☐ | スマホでハンバーガーメニューが正しく開閉する |
| ☐ | テスト決済後 `yamane@potentialight.com` に購入通知メールが届く |

---

## トラブルシューティング

**「Firebase未設定」と表示される**
→ `firebase-config.js` の値が `YOUR_...` のままです。プロジェクト設定をコピーし直してください。

**Stripe Checkoutが起動しない**
→ Cloud Functionsがデプロイされていない、またはStripeシークレットキーが未登録です。`firebase functions:log` でエラー確認。

**Firestore権限エラー**
→ 自分のUIDが `admins` コレクションに登録されていないか、Firestoreルールが未デプロイです。

**Apple Pay ボタンが出ない**
→ Stripeダッシュボードでドメイン認証が完了していない、または HTTPS でアクセスしていない可能性があります。

**購入通知メールが届かない**
→ Firebase Console → Extensions → Trigger Email → ログ を確認。SMTP URIのアプリパスワードまたは `@` のURLエンコード（`%40`）漏れが典型的な原因。Firestoreの `mail/{ID}/delivery` フィールドにエラー詳細が記録される。

---

## ファイル一覧

| ファイル | 役割 |
|---|---|
| `index.html` | ECサイトトップ |
| `admin.html` | 管理画面 |
| `style.css` | 共通スタイル |
| `script.js` | 顧客側ロジック（カート / Auth / Checkout） |
| `mobile-nav.js` | スマホメニュー（共通） |
| `firebase-config.js` | Firebase + Stripe 公開キー |
| `firebase.json` | Hosting / Functions / Firestore 設定 |
| `firestore.rules` | DB セキュリティルール |
| `storage.rules` | 画像 セキュリティルール |
| `functions/index.js` | Stripe Checkout / Webhook / OGP取得 |
| `functions/package.json` | Functions の依存関係 |
| `team.html`, `pairing-guide.html`, `rub-guide.html` | サブページ |
