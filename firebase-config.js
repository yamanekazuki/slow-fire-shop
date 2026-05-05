// =====================================================
// SLOW FIRE SHOP — Firebase & Stripe 設定ファイル
// =====================================================
// セットアップ手順:
//
// [Firebase]
// 1. https://console.firebase.google.com でプロジェクトを作成
// 2. 「ウェブアプリを追加」→ 設定をコピー → 下記に貼り付け
// 3. Authentication → ログイン方法 → メール/パスワード を有効化
// 4. Firestore Database → 本番モードで作成
// 5. Storage → バケットを作成
//
// [Stripe]
// 1. https://stripe.com でアカウント作成
// 2. ダッシュボード → 開発者 → API キー → 公開可能キー を貼り付け
//
// [管理者アカウント]
// Firebase Authentication で管理者メール/パスワードのユーザーを作成後、
// Firestore の `admins` コレクションにそのUIDをドキュメントIDで追加:
//   admins/{UID} → { email: "your@email.com" }
// =====================================================

const SF_CONFIG = {
  firebase: {
    apiKey:            "YOUR_FIREBASE_API_KEY",
    authDomain:        "YOUR_PROJECT_ID.firebaseapp.com",
    projectId:         "YOUR_PROJECT_ID",
    storageBucket:     "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId:             "YOUR_APP_ID"
  },
  // Stripe 公開キー (テスト: pk_test_... / 本番: pk_live_...)
  stripeKey: "pk_test_YOUR_STRIPE_PUBLISHABLE_KEY",
  // Cloud Functions リージョン（変更不要）
  functionsRegion: "asia-northeast1",
};

// =====================================================
// 初期化（以下は変更不要）
// =====================================================
let db = null, sfAuth = null, sfStorage = null, sfStripe = null, sfFunctions = null;
const FIREBASE_READY = (() => {
  try {
    if (SF_CONFIG.firebase.apiKey.startsWith("YOUR_")) {
      console.warn('[SLOW FIRE] ⚠ Firebase未設定。firebase-config.jsを編集してください。');
      return false;
    }
    if (typeof firebase === 'undefined') {
      console.warn('[SLOW FIRE] Firebase SDK が読み込まれていません');
      return false;
    }
    if (!firebase.apps.length) firebase.initializeApp(SF_CONFIG.firebase);
    db        = firebase.firestore();
    sfAuth    = firebase.auth();
    if (firebase.storage) sfStorage = firebase.storage();
    if (firebase.functions) {
      sfFunctions = firebase.functions(SF_CONFIG.functionsRegion || 'asia-northeast1');
    }
    if (typeof Stripe !== 'undefined' && !SF_CONFIG.stripeKey.startsWith('pk_test_YOUR')) {
      sfStripe = Stripe(SF_CONFIG.stripeKey);
    }
    // Expose to window for cross-script access
    window.db = db;
    window.sfAuth = sfAuth;
    window.sfStorage = sfStorage;
    window.sfFunctions = sfFunctions;
    window.sfStripe = sfStripe;
    window.FIREBASE_READY = true;
    console.log('[SLOW FIRE] Firebase 初期化完了');
    return true;
  } catch(e) {
    console.error('[SLOW FIRE] 初期化エラー:', e);
    window.FIREBASE_READY = false;
    return false;
  }
})();
window.FIREBASE_READY = FIREBASE_READY;
