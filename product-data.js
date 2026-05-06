/* =============================================
   SLOW FIRE SHOP — Product detail data
   各ラブの詳細情報（フレーバー・食材適性・関連料理・関連商品）
   ============================================= */

const PRODUCT_DETAILS = {

  // ============ Low n Slow Basics ============
  'steak-shooter': {
    id: 'steak-shooter',
    name: 'Steak Shooter',
    nameja: 'ステーキシューター',
    subtitle: 'Steak & Beef Rub',
    brand: 'lownslow',
    brandLabel: 'Low n Slow Basics',
    brandOrigin: '🇦🇺 Australia',
    price: 3800,
    badge: null,
    image: 'https://www.lownslowbasics.com.au/wp-content/uploads/2023/09/STEAK-SHOOTER-1.jpg',
    desc: '牛肉のポテンシャルを最大限引き出すスタンダードラブ。バックヤードでも競技大会でも通用する発色と旨みの黄金ブレンド。',
    flavorNotes: '塩・ガーリック・パプリカの王道3軸 / 甘みは控えめ',
    spiceLevel: 1,
    bestFor: { beef: 5, pork: 3, chicken: 2, fish: 1, veggie: 2 },
    bestRecipes: ['pork-steak', 'cheeseburger', 'tomahawk', 'carne-asada'],
    usage: [
      { title: '振りかけ', desc: '焼く30分前に肉表面が見えなくなるまで振り、室温に戻す' },
      { title: 'マリネ', desc: '一晩寝かせるとさらに深みが増す。塩分が浸透し旨みUP' },
      { title: '重ねがけ', desc: 'Beef Bounceとレイヤーすると競技会レベルのバークに' }
    ],
    relatedRubs: ['butchers-bullseye', 'butchers-stampede', 'beef-bounce']
  },

  'steak-shooter-spicy': {
    id: 'steak-shooter-spicy',
    name: 'Steak Shooter SPICY',
    nameja: 'ステーキシューター スパイシー',
    subtitle: 'Spicy Steak & Beef Rub',
    brand: 'lownslow',
    brandLabel: 'Low n Slow Basics',
    brandOrigin: '🇦🇺 Australia',
    price: 3800,
    badge: 'SPICY',
    image: 'https://www.lownslowbasics.com.au/wp-content/uploads/2023/09/STEAK-SHOOTER-SPICY.jpg',
    desc: 'ステーキシューターの辛口版。辛さレベル2/5で、刺激を楽しみながらも旨みはそのまま。チキンウィングや豚チョップにも。',
    flavorNotes: 'カイエン・チリの刺激 / 牛・豚・鶏で発色◎',
    spiceLevel: 3,
    bestFor: { beef: 5, pork: 4, chicken: 4, fish: 1, veggie: 2 },
    bestRecipes: ['carne-asada', 'jerk-chicken', 'tomahawk'],
    usage: [
      { title: '振りかけ', desc: 'たっぷりが基本。ステーキ・チキンウィングに' },
      { title: 'マリネ', desc: '長く漬けるほど辛味が肉に染み込む' }
    ],
    relatedRubs: ['steak-shooter', 'chilli-citrus-charge', 'butchers-ranger']
  },

  'beef-bounce': {
    id: 'beef-bounce',
    name: 'Beef Bounce',
    nameja: 'ビーフバウンス',
    subtitle: 'Beef & Brisket Rub',
    brand: 'lownslow',
    brandLabel: 'Low n Slow Basics',
    brandOrigin: '🇦🇺 Australia',
    price: 3800,
    badge: null,
    image: 'https://www.lownslowbasics.com.au/wp-content/uploads/2023/09/BEEF-BOUNCE.jpg',
    desc: 'コーヒーノートとブラックペッパーの深みが特徴。ブリスケットや牛リブのバーク（外皮）を完璧に仕上げる本格派ラブ。',
    flavorNotes: 'コーヒー・ブラックペッパー・スモーキー / 深い苦みと旨み',
    spiceLevel: 2,
    bestFor: { beef: 5, pork: 3, chicken: 1, fish: 1, veggie: 1 },
    bestRecipes: ['spare-ribs', 'back-ribs', 'tomahawk', 'pulled-pork'],
    usage: [
      { title: 'ロー&スロー', desc: 'ブリスケット・牛リブの主役ラブ。前日仕込み推奨' },
      { title: '重ねがけ', desc: 'Steak Shooterのベースの上に。コーヒーが効いて深みが出る' }
    ],
    relatedRubs: ['butchers-big-bark', 'butchers-bullseye', 'steak-shooter']
  },

  'honey-soy-slammer': {
    id: 'honey-soy-slammer',
    name: 'Honey Soy Slammer',
    nameja: 'ハニーソイスラマー',
    subtitle: 'Pork & Chicken Rub',
    brand: 'lownslow',
    brandLabel: 'Low n Slow Basics',
    brandOrigin: '🇦🇺 Australia',
    price: 3800,
    badge: 'BEST SELLER',
    image: 'https://www.lownslowbasics.com.au/wp-content/uploads/2023/09/HONEY-SOY.jpg',
    desc: '蜂蜜と醤油の絶妙なブレンド。ポークリブ、プルドポーク、チキンウィングに最高のグレーズと深みある風味を生む。',
    flavorNotes: '蜂蜜の甘み × 醤油のコク / 日本人の味覚に最も馴染む',
    spiceLevel: 1,
    bestFor: { beef: 2, pork: 5, chicken: 5, fish: 2, veggie: 2 },
    bestRecipes: ['spare-ribs', 'pulled-pork', 'beer-can-chicken', 'lemon-chicken'],
    usage: [
      { title: 'グレーズ', desc: '焼き上がり直前にもう一振り。艶と香りが立つ' },
      { title: 'マリネ', desc: '一晩漬けるとポーク・チキンの内部まで風味が浸透' }
    ],
    relatedRubs: ['stef-pork-hunt', 'butchers-ranger', 'hook-shot']
  },

  'lamb-layup': {
    id: 'lamb-layup',
    name: 'Lamb Layup',
    nameja: 'ラムレイアップ',
    subtitle: 'Lamb & Game Rub',
    brand: 'lownslow',
    brandLabel: 'Low n Slow Basics',
    brandOrigin: '🇦🇺 Australia',
    price: 3800,
    badge: null,
    image: 'https://www.lownslowbasics.com.au/wp-content/uploads/2023/09/LAMB-LAYUP.jpg',
    desc: 'スマックとハーブのブレンドがラムとジビエを格上げ。カンガルー、アヒル、鴨から鹿まで、ワイルドな食材に。',
    flavorNotes: 'スマック・ローズマリー・タイム / 中東〜地中海の香り',
    spiceLevel: 1,
    bestFor: { beef: 2, pork: 2, chicken: 3, fish: 4, veggie: 3 },
    bestRecipes: ['cedar-salmon', 'shrimp-grill'],
    usage: [
      { title: '振りかけ', desc: 'ラム・ジビエに直接振る。ハーブが香りを纏わせる' },
      { title: '魚にも', desc: 'シダープランクサーモンの仕上げに散らすと格上げ' }
    ],
    relatedRubs: ['butchers-hunter', 'stef-deep-bush', 'garlic-goals']
  },

  'garlic-goals': {
    id: 'garlic-goals',
    name: 'Garlic Goals',
    nameja: 'ガーリックゴールズ',
    subtitle: 'All Purpose Rub',
    brand: 'lownslow',
    brandLabel: 'Low n Slow Basics',
    brandOrigin: '🇦🇺 Australia',
    price: 3800,
    badge: null,
    image: 'https://www.lownslowbasics.com.au/wp-content/uploads/2023/09/GARLIC-GOALS-1.jpg',
    desc: 'ガーリックとパルメザンチーズの万能ラブ。肉・野菜・ローストポテトまで何でも合う最もフレキシブルなブレンド。',
    flavorNotes: 'ガーリック・パルメザン・ハーブ / マイルドで万能',
    spiceLevel: 0,
    bestFor: { beef: 3, pork: 4, chicken: 4, fish: 4, veggie: 5 },
    bestRecipes: ['veg-grill', 'shrimp-grill', 'mushroom-grill', 'gratin'],
    usage: [
      { title: '万能', desc: '迷ったらこれ。何にでも振れる初心者の救世主' },
      { title: '野菜の主役', desc: '野菜グリル・ポテトグラタンに特に効く' }
    ],
    relatedRubs: ['butchers-basecamp', 'butchers-woodlands', 'stef-rub-one-out']
  },

  'chilli-citrus-charge': {
    id: 'chilli-citrus-charge',
    name: 'Chilli Citrus Charge',
    nameja: 'チリシトラスチャージ',
    subtitle: 'Chicken & Pork Rub',
    brand: 'lownslow',
    brandLabel: 'Low n Slow Basics',
    brandOrigin: '🇦🇺 Australia',
    price: 3800,
    badge: 'NEW',
    image: 'https://www.lownslowbasics.com.au/wp-content/uploads/2024/11/Chilli-Charge-Colour-600x600.png',
    desc: 'チリの辛さとシトラスの爽やかさが絶妙なコンビ。チキンや豚肉に鮮やかな発色とフレッシュな風味を。',
    flavorNotes: 'チリ × オレンジピール × ライム / 辛さと爽やかさの両立',
    spiceLevel: 3,
    bestFor: { beef: 2, pork: 4, chicken: 5, fish: 3, veggie: 2 },
    bestRecipes: ['jerk-chicken', 'lemon-chicken', 'beer-can-chicken', 'carne-asada'],
    usage: [
      { title: 'マリネ', desc: '鶏肉に一晩。皮目がオレンジ色に発色する' },
      { title: '振りかけ', desc: 'チキンウィングに大胆に振る' }
    ],
    relatedRubs: ['butchers-el-hacha', 'steak-shooter-spicy', 'butchers-ranger']
  },

  'hook-shot': {
    id: 'hook-shot',
    name: 'Hook Shot',
    nameja: 'フックショット',
    subtitle: 'Signature BBQ Sauce',
    brand: 'lownslow',
    brandLabel: 'Low n Slow Basics',
    brandOrigin: '🇦🇺 Australia',
    price: 4200,
    badge: null,
    image: 'https://www.lownslowbasics.com.au/wp-content/uploads/2023/09/HOOK-SHOT.png',
    desc: 'Low n Slow Basicsのシグネチャーソース。ラブと組み合わせることでコンペティション級のフレーバーが完成。仕上げがけ・ディップ・グレーズに。',
    flavorNotes: 'ハラペーニョ × ウィスキー × トマト / 甘辛深いBBQソース',
    spiceLevel: 2,
    bestFor: { beef: 4, pork: 5, chicken: 4, fish: 2, veggie: 3 },
    bestRecipes: ['spare-ribs', 'pulled-pork', 'cheeseburger'],
    usage: [
      { title: '仕上げグレーズ', desc: 'ロー&スローの最後10分で塗る。艶と香りが完成' },
      { title: 'ディップ', desc: 'バーガー・チキンウィングのつけだれとして' }
    ],
    relatedRubs: ['honey-soy-slammer', 'beef-bounce', 'butchers-big-bark']
  },

  // ============ Butcher's Axe BBQ ============
  'butchers-bullseye': {
    id: 'butchers-bullseye',
    name: 'Bullseye',
    nameja: 'ブルズアイ',
    subtitle: "Champion Beef Seasoning",
    brand: 'butchers-axe',
    brandLabel: "Butcher's Axe BBQ",
    brandOrigin: '🇦🇺 Stagg & Co Australia',
    price: 2980,
    badge: null,
    image: 'https://www.staggandco.com.au/cdn/shop/files/ButchersAxe-bullseye-front.png?v=1739404920&width=800',
    desc: 'オーストラリアのコンペティションBBQで磨かれたビーフ専用シーズニング。「ど真ん中（Bullseye）」の名の通り、迷いのない牛肉特化ブレンド。',
    flavorNotes: 'ガーリック・パプリカ・コショウのストレートな牛肉系',
    spiceLevel: 2,
    bestFor: { beef: 5, pork: 3, chicken: 2, fish: 1, veggie: 2 },
    bestRecipes: ['tomahawk', 'cheeseburger', 'carne-asada'],
    usage: [
      { title: '振りかけ', desc: '牛肉に直接振るだけで競技会レベル' },
      { title: 'ロー&スロー', desc: 'ブリスケットでBig Barkとレイヤー' }
    ],
    relatedRubs: ['steak-shooter', 'butchers-stampede', 'butchers-big-bark']
  },

  'butchers-hunter': {
    id: 'butchers-hunter',
    name: 'Hunter',
    nameja: 'ハンター',
    subtitle: "Lamb & Game Seasoning",
    brand: 'butchers-axe',
    brandLabel: "Butcher's Axe BBQ",
    brandOrigin: '🇦🇺 Stagg & Co Australia',
    price: 2980,
    badge: null,
    image: 'https://www.staggandco.com.au/cdn/shop/files/ButchersAxe-hunter-front.png?v=1739405308&width=800',
    desc: 'ラム、鹿、カンガルーなどジビエ専用。ハーブと深いスパイスがゲーム肉のクセを抑えながら、野性味を残す。Lamb Layupとは異なる、より骨太な香り。',
    flavorNotes: 'ローズマリー・タイム・ジュニパー / 骨太なジビエ系',
    spiceLevel: 2,
    bestFor: { beef: 3, pork: 3, chicken: 2, fish: 2, veggie: 2 },
    bestRecipes: ['shrimp-grill', 'pork-steak'],
    usage: [
      { title: 'ジビエに', desc: 'ラム・鹿・カンガルーのクセを抑えつつ野性味は残す' },
      { title: 'マリネ', desc: '一晩漬けると深みが増す' }
    ],
    relatedRubs: ['lamb-layup', 'stef-deep-bush', 'butchers-ranger']
  },

  'butchers-ranger': {
    id: 'butchers-ranger',
    name: 'Ranger',
    nameja: 'レンジャー',
    subtitle: "Big Red Seasoning",
    brand: 'butchers-axe',
    brandLabel: "Butcher's Axe BBQ",
    brandOrigin: '🇦🇺 Stagg & Co Australia',
    price: 2980,
    badge: null,
    image: 'https://www.staggandco.com.au/cdn/shop/files/ButchersAxe-ranger-front.png?v=1739402780&width=800',
    desc: '赤系スパイスを核にした「赤の探検家」。豚・鶏・牛のどれにも適応。グリルに大胆な発色とスモーキーな深みを与える、汎用性の高い濃厚ラブ。',
    flavorNotes: 'パプリカ・チリ・スモーク / 濃厚な赤系',
    spiceLevel: 3,
    bestFor: { beef: 4, pork: 5, chicken: 4, fish: 2, veggie: 2 },
    bestRecipes: ['spare-ribs', 'pulled-pork', 'jerk-chicken'],
    usage: [
      { title: '振りかけ', desc: '豚リブ・チキンウィングに大胆に。発色が映える' },
      { title: 'プルドポーク', desc: 'Big Barkとレイヤーすると黒バークに深みが追加される' }
    ],
    relatedRubs: ['butchers-big-bark', 'chilli-citrus-charge', 'butchers-el-hacha']
  },

  'butchers-big-bark': {
    id: 'butchers-big-bark',
    name: 'Big Bark',
    nameja: 'ビッグバーク',
    subtitle: "Secret Black Seasoning",
    brand: 'butchers-axe',
    brandLabel: "Butcher's Axe BBQ",
    brandOrigin: '🇦🇺 Stagg & Co Australia',
    price: 2980,
    badge: 'BEST VALUE',
    image: 'https://www.staggandco.com.au/cdn/shop/files/ButchersAxe-bigbark-front.png?v=1739404322&width=800',
    desc: 'ロー&スローで分厚い黒い「バーク（外皮）」を作るための競技会向け秘密ブレンド。ブリスケットやプルドポークの仕上がりが激変する、ピットマスター御用達。',
    flavorNotes: 'コーヒー・モラセス・コショウ / 深く濃い黒バーク系',
    spiceLevel: 2,
    bestFor: { beef: 5, pork: 5, chicken: 3, fish: 1, veggie: 2 },
    bestRecipes: ['back-ribs', 'pulled-pork', 'spare-ribs', 'tomahawk'],
    usage: [
      { title: 'ロー&スロー専用', desc: 'ブリスケット12時間。前日仕込み必須' },
      { title: 'プルドポーク', desc: '97℃まで持っていくと黒バークが完成' }
    ],
    relatedRubs: ['beef-bounce', 'butchers-bullseye', 'butchers-stampede']
  },

  'butchers-stampede': {
    id: 'butchers-stampede',
    name: 'Stampede',
    nameja: 'スタンピード',
    subtitle: "Champion Steak Seasoning",
    brand: 'butchers-axe',
    brandLabel: "Butcher's Axe BBQ",
    brandOrigin: '🇦🇺 Stagg & Co Australia',
    price: 2980,
    badge: null,
    image: 'https://www.staggandco.com.au/cdn/shop/files/ButchersAxe-stampede-front.png?v=1739406111&width=800',
    desc: 'ステーキ専用。「群れ（Stampede）」を駆け抜けるような濃厚な存在感。リブアイ、トマホーク、サーロインに直接振るだけで、競技会レベルの仕上がりへ。',
    flavorNotes: 'ガーリック・コショウ・スモーク / 濃厚直球のステーキ系',
    spiceLevel: 2,
    bestFor: { beef: 5, pork: 3, chicken: 1, fish: 1, veggie: 1 },
    bestRecipes: ['tomahawk', 'pork-steak', 'cheeseburger'],
    usage: [
      { title: 'ステーキ専用', desc: 'リブアイ・トマホークに大胆に振る。リバースシア法と相性◎' },
      { title: '休ませ', desc: '焼く30分前から塗って室温に戻す' }
    ],
    relatedRubs: ['butchers-bullseye', 'beef-bounce', 'steak-shooter']
  },

  'butchers-el-hacha': {
    id: 'butchers-el-hacha',
    name: 'El Hacha',
    nameja: 'エル・アチャ',
    subtitle: "Tex-Mex Seasoning",
    brand: 'butchers-axe',
    brandLabel: "Butcher's Axe BBQ",
    brandOrigin: '🇦🇺 Stagg & Co Australia',
    price: 2980,
    badge: 'NEW',
    image: 'https://www.staggandco.com.au/cdn/shop/files/ButchersAxe-elhacha-front.png?v=1739403261&width=800',
    desc: 'スペイン語で「斧」を意味するEl Hacha。クミン、コリアンダー、唐辛子、ライム — テックスメックスの香りが織りなす、メキシコ国境の風。カルネ・アサーダ、ファヒータに。',
    flavorNotes: 'クミン・コリアンダー・唐辛子・ライム / テックスメックス',
    spiceLevel: 3,
    bestFor: { beef: 5, pork: 3, chicken: 4, fish: 2, veggie: 3 },
    bestRecipes: ['carne-asada', 'jerk-chicken'],
    usage: [
      { title: 'マリネ', desc: 'フランクステーキに2時間以上。トルティーヤに包んで' },
      { title: 'チキンファヒータ', desc: '鶏胸肉のスライスに振って高温短時間' }
    ],
    relatedRubs: ['steak-shooter-spicy', 'chilli-citrus-charge', 'butchers-ranger']
  },

  'butchers-gyro': {
    id: 'butchers-gyro',
    name: 'Gyro',
    nameja: 'ジャイロ',
    subtitle: "Rotisserie Seasoning",
    brand: 'butchers-axe',
    brandLabel: "Butcher's Axe BBQ",
    brandOrigin: '🇦🇺 Stagg & Co Australia',
    price: 2980,
    badge: null,
    image: 'https://www.staggandco.com.au/cdn/shop/files/ButchersAxe-gyro-front.png?v=1739405696&width=800',
    desc: 'ロティサリー（回転焼き）専用に設計された地中海風シーズニング。鶏丸焼き、ラムシュワルマ、ビア缶チキンが一段格上に。ガーリック、オレガノ、レモンの三重奏。',
    flavorNotes: 'ガーリック・オレガノ・レモン / 地中海ハーブ系',
    spiceLevel: 1,
    bestFor: { beef: 2, pork: 3, chicken: 5, fish: 3, veggie: 3 },
    bestRecipes: ['beer-can-chicken', 'lemon-chicken'],
    usage: [
      { title: 'ロティサリー', desc: '鶏丸焼き・ビア缶チキンの専用ブレンド' },
      { title: 'ラム', desc: 'シュワルマ・ラムチョップにも◎' }
    ],
    relatedRubs: ['butchers-scout', 'lamb-layup', 'butchers-basecamp']
  },

  'butchers-woodlands': {
    id: 'butchers-woodlands',
    name: 'Woodlands',
    nameja: 'ウッドランズ',
    subtitle: "Wild Garlic Seasoning",
    brand: 'butchers-axe',
    brandLabel: "Butcher's Axe BBQ",
    brandOrigin: '🇦🇺 Stagg & Co Australia',
    price: 2980,
    badge: null,
    image: 'https://www.staggandco.com.au/cdn/shop/files/ButchersAxe-woodlands-front.png?v=1745364106&width=800',
    desc: 'ワイルドガーリック（野生ニンニク）を主軸にした、森のように深い香り。Garlic Goalsより骨太で、肉以外（野菜、魚、ピザ、ポテト）にも幅広く効く。',
    flavorNotes: 'ワイルドガーリック・ハーブ・スモーク / 森の香り',
    spiceLevel: 1,
    bestFor: { beef: 3, pork: 4, chicken: 4, fish: 3, veggie: 5 },
    bestRecipes: ['mushroom-grill', 'pizza', 'gratin', 'veg-grill'],
    usage: [
      { title: '野菜・ピザ', desc: 'ピザ生地・ポテトに振るとガーリックブレッドのような香り' },
      { title: 'マッシュルーム', desc: 'ポートベロー・しいたけに最適' }
    ],
    relatedRubs: ['garlic-goals', 'butchers-basecamp', 'butchers-scout']
  },

  'butchers-scout': {
    id: 'butchers-scout',
    name: 'Scout',
    nameja: 'スカウト',
    subtitle: "Lemon Pepper Seasoning",
    brand: 'butchers-axe',
    brandLabel: "Butcher's Axe BBQ",
    brandOrigin: '🇦🇺 Stagg & Co Australia',
    price: 2980,
    badge: null,
    image: 'https://www.staggandco.com.au/cdn/shop/files/ButchersAxe-scout-front.png?v=1745364053&width=800',
    desc: "レモンペッパーの王道をButcher's Axe流に再構築。鶏胸肉、白身魚、エビ、サラダの仕上げまで万能に。爽やかさと辛味のバランスが絶妙。",
    flavorNotes: 'レモン・ブラックペッパー / 爽やかで万能',
    spiceLevel: 2,
    bestFor: { beef: 1, pork: 2, chicken: 5, fish: 5, veggie: 4 },
    bestRecipes: ['shrimp-grill', 'cedar-salmon', 'salmon-pro', 'lemon-chicken'],
    usage: [
      { title: '魚・エビ', desc: '白身魚・エビに直接振る。仕上げレモン不要' },
      { title: '鶏胸', desc: 'マリネ→グリルでさっぱり仕上げ' }
    ],
    relatedRubs: ['stef-aquadesiac', 'butchers-basecamp', 'lamb-layup']
  },

  'butchers-basecamp': {
    id: 'butchers-basecamp',
    name: 'Basecamp',
    nameja: 'ベースキャンプ',
    subtitle: "All-Purpose Seasoning",
    brand: 'butchers-axe',
    brandLabel: "Butcher's Axe BBQ",
    brandOrigin: '🇦🇺 Stagg & Co Australia',
    price: 2980,
    badge: 'BEST SELLER',
    image: 'https://www.staggandco.com.au/cdn/shop/files/WEB-Basecamp-Front.png?v=1747206655&width=800',
    desc: '迷ったらこれ、というBBQの「拠点」。万能シーズニングとして、肉・魚・野菜・卵料理・ポテトまですべてに使える。最初の一本、または常備の一本に最適。',
    flavorNotes: 'バランス型・マイルド / 何にでも合う',
    spiceLevel: 1,
    bestFor: { beef: 4, pork: 4, chicken: 4, fish: 4, veggie: 5 },
    bestRecipes: ['veg-grill', 'shrimp-grill', 'gratin', 'asparagus-grill', 'pizza'],
    usage: [
      { title: '万能', desc: '迷ったらこれ。何にでも振れる' },
      { title: '卵・チャーハン', desc: '仕上げに振るだけで完成' }
    ],
    relatedRubs: ['garlic-goals', 'stef-rub-one-out', 'butchers-woodlands']
  },

  // ============ Stef the Maori ============
  'stef-rub-one-out': {
    id: 'stef-rub-one-out',
    name: 'Rub One Out',
    nameja: 'ラブ・ワン・アウト',
    subtitle: "All-Purpose Seasoning",
    brand: 'stef-the-maori',
    brandLabel: "Stef the Maori",
    brandOrigin: '🇳🇿 New Zealand × Stagg & Co',
    price: 3500,
    badge: null,
    image: 'https://www.staggandco.com.au/cdn/shop/files/Stefthemaoriruboneout-front.png?v=1739318375&width=800',
    desc: 'アオテアロア（ニュージーランド）北部発祥の万能シーズニング。ヒマラヤピンクソルト、黒胡椒、ガーリック、マスタード、ハーブの絶妙な配合で、肉・魚・野菜「ほぼ何にでも」効く一本。',
    flavorNotes: 'ヒマラヤピンク塩・マスタード・ハーブ / マオリの森的なバランス',
    spiceLevel: 1,
    bestFor: { beef: 4, pork: 4, chicken: 4, fish: 4, veggie: 5 },
    bestRecipes: ['veg-grill', 'shrimp-grill', 'salmon-pro', 'cheeseburger'],
    usage: [
      { title: '万能', desc: '「ほぼ何にでも」効くNZ発の万能型' },
      { title: '海鮮', desc: 'Aquadesiacと並んで魚介との相性も良い' }
    ],
    relatedRubs: ['butchers-basecamp', 'garlic-goals', 'stef-aquadesiac']
  },

  'stef-pork-hunt': {
    id: 'stef-pork-hunt',
    name: 'Pork Hunt',
    nameja: 'ポーク・ハント',
    subtitle: "Pork & White Meat Rub",
    brand: 'stef-the-maori',
    brandLabel: "Stef the Maori",
    brandOrigin: '🇳🇿 New Zealand × Stagg & Co',
    price: 3500,
    badge: null,
    image: 'https://www.staggandco.com.au/cdn/shop/files/StefthemaoriPorkhunt-front.png?v=1745364300&width=800',
    desc: 'BBQポークリブとチキンウィングのために設計された白身肉特化シーズニング。ココナッツシュガーとパプリカ、スモークパウダーが織りなす、骨太でフルフレーバーな一本。',
    flavorNotes: 'ココナッツシュガー・パプリカ・スモーク / 骨太な甘旨スモーキー',
    spiceLevel: 2,
    bestFor: { beef: 2, pork: 5, chicken: 5, fish: 2, veggie: 2 },
    bestRecipes: ['spare-ribs', 'pulled-pork', 'beer-can-chicken'],
    usage: [
      { title: 'ポーク・チキン', desc: '白身肉に骨太な甘み・スモーキーさ' },
      { title: 'マリネ', desc: '一晩で繊維まで風味が浸透' }
    ],
    relatedRubs: ['honey-soy-slammer', 'butchers-ranger', 'butchers-gyro']
  },

  'stef-deep-bush': {
    id: 'stef-deep-bush',
    name: 'Deep Bush',
    nameja: 'ディープ・ブッシュ',
    subtitle: "Horopito Herb Rub",
    brand: 'stef-the-maori',
    brandLabel: "Stef the Maori",
    brandOrigin: '🇳🇿 New Zealand × Stagg & Co',
    price: 3500,
    badge: 'NEW',
    image: 'https://www.staggandco.com.au/cdn/shop/files/StefthemaoriDeepbush-front.png?v=1739317303&width=800',
    desc: 'ニュージーランド原産の薬用ハーブ「ホロピト」を主軸にした、世界に唯一無二のブレンド。微妙な辛味とハーブの深みが、肉料理に「マオリの森」の風を吹き込む。',
    flavorNotes: 'ホロピト（NZ薬用ハーブ）・ハーブ / 微辛味と森の深み',
    spiceLevel: 2,
    bestFor: { beef: 4, pork: 3, chicken: 3, fish: 2, veggie: 3 },
    bestRecipes: ['tomahawk', 'spare-ribs', 'jerk-chicken'],
    usage: [
      { title: '牛・ラム', desc: 'NZ原産ホロピトが赤身肉と独特の相性' },
      { title: 'ジビエ', desc: '鹿・カンガルーのクセを引き立てる' }
    ],
    relatedRubs: ['butchers-hunter', 'lamb-layup', 'butchers-ranger']
  },

  'stef-aquadesiac': {
    id: 'stef-aquadesiac',
    name: 'Aquadesiac',
    nameja: 'アクアデジアック',
    subtitle: "Seafood & Universal Rub",
    brand: 'stef-the-maori',
    brandLabel: "Stef the Maori",
    brandOrigin: '🇳🇿 New Zealand × Stagg & Co',
    price: 3500,
    badge: null,
    image: 'https://www.staggandco.com.au/cdn/shop/files/WEB_-Aquadesiac_-_new.png?v=1750822318&width=800',
    desc: '海鮮（エビ、ホタテ、白身魚、イカ）のために設計された東南アジア風シーズニング。ライムパウダーと海苔の組み合わせが秀逸。「Throw this at anything」を地で行く万能性も魅力。',
    flavorNotes: 'ライム・海苔・スパイス / 東南アジア風の海鮮万能',
    spiceLevel: 1,
    bestFor: { beef: 2, pork: 3, chicken: 3, fish: 5, veggie: 4 },
    bestRecipes: ['salmon-pro', 'shrimp-grill', 'cedar-salmon', 'saikyo-fish'],
    usage: [
      { title: '海鮮', desc: '魚・エビ・イカに直接。Throw this at anything' },
      { title: 'チャーハン', desc: '炒飯・卵料理の仕上げにも' }
    ],
    relatedRubs: ['butchers-scout', 'stef-rub-one-out', 'lamb-layup']
  }
};

// Recipe info for related-recipes section (matches cookbook IDs)
const RECIPE_INFO = {
  'cedar-salmon':      { name: 'シダープランクサーモン',       icon: '🐟', level: '初級', image: 'images/recipes/cedar-salmon.jpg?v=20260506' },
  'veg-grill':         { name: '季節の野菜グリル',             icon: '🥬', level: '初級', image: 'images/recipes/veg-grill.jpg?v=20260506' },
  'pork-steak':        { name: 'ポークステーキ',               icon: '🥩', level: '初級', image: '' },
  'bratwurst':         { name: 'ブラートソーセージ',           icon: '🌭', level: '初級', image: 'images/recipes/bratwurst.jpg?v=20260506' },
  'cheeseburger':      { name: 'クラシックチーズバーガー',     icon: '🍔', level: '初級', image: '' },
  'shiitake':          { name: '肉詰めしいたけ',               icon: '🍄', level: '中級', image: '' },
  'veg-skewer':        { name: 'スキュアーベジタブル',         icon: '🥒', level: '中級', image: '' },
  'spare-ribs':        { name: 'スペアリブ',                   icon: '🍖', level: '中級', image: '' },
  'pizza':             { name: 'マルゲリータピッツァ',         icon: '🍕', level: '中級', image: 'images/recipes/pizza.jpg?v=20260506' },
  'lemon-chicken':     { name: 'ガーリックレモンチキン',       icon: '🍗', level: '中級', image: 'images/recipes/lemon-chicken.jpg?v=20260506' },
  'apple-pie':         { name: 'アップルパイ',                 icon: '🥧', level: '中級', image: '' },
  'gratin':            { name: 'BBQポテトグラタン',            icon: '🥔', level: '上級', image: '' },
  'beer-can-chicken':  { name: 'ビア缶チキン',                 icon: '🍺', level: '上級', image: '' },
  'back-ribs':         { name: 'バックリブ（ロー&スロー）',     icon: '💎', level: '上級', image: '' },
  'salmon-pro':        { name: '上級サーモン',                 icon: '🍯', level: '上級', image: '' },
  'banana':            { name: 'バナナグリル',                 icon: '🍌', level: '上級', image: '' },
  'pulled-pork':       { name: 'プルドポーク',                 icon: '🐷', level: '上級', image: '' },
  'jerk-chicken':      { name: 'ジャマイカン ジャークチキン',   icon: '🌶️', level: '中級', image: '' },
  'saikyo-fish':       { name: 'さわらの西京焼き',             icon: '🍱', level: '中級', image: '' },
  'carne-asada':       { name: 'カルネ・アサーダ',             icon: '🌮', level: '中級', image: '' },
  'tomahawk':          { name: 'トマホークステーキ',           icon: '🪓', level: '上級', image: '' },
  'shrimp-grill':      { name: 'ガーリックシュリンプ',         icon: '🦐', level: '初級', image: 'images/recipes/shrimp-grill.jpg?v=20260506' },
  'mushroom-grill':    { name: 'ポートベローマッシュルーム',   icon: '🍄', level: '初級', image: '' },
  'asparagus-grill':   { name: 'アスパラガスのグリル',         icon: '🌿', level: '初級', image: '' },
  'pepper-sesame-beef':{ name: 'ペッパー&セサミ・ビーフ',      icon: '🥩', level: '上級', image: 'images/recipes/pepper-sesame-beef.jpg?v=20260506f' },
  'skillet-apple':     { name: 'スキレットアップル',           icon: '🍎', level: '中級', image: 'images/recipes/skillet-apple.jpg?v=20260506f' },
  'chicken-thigh':     { name: 'グリルチキンソテー',           icon: '🍗', level: '初級', image: 'images/recipes/chicken-thigh.jpg?v=20260506f' },
  'sanma':             { name: '炭火さんまの塩焼き',           icon: '🐟', level: '中級', image: 'images/recipes/sanma.jpg?v=20260506f' },
  'cedar-shrimp-herb': { name: '杉板ハーブシュリンプ',         icon: '🦐', level: '中級', image: 'images/recipes/cedar-shrimp-herb.jpg?v=20260506f' },
  'jerk-ribs-pineapple':{ name: 'ジャークリブ&パイナップル',   icon: '🍍', level: '上級', image: 'images/recipes/jerk-ribs-pineapple.jpg?v=20260506f' },
  'cedar-camembert':   { name: '杉板カマンベール&ホタテ',      icon: '🧀', level: '中級', image: 'images/recipes/cedar-camembert.jpg?v=20260506f' },
  'tomato-cheese-skillet':{ name: 'スキレットトマト&チーズ',   icon: '🍅', level: '初級', image: 'images/recipes/tomato-cheese-skillet.jpg?v=20260506f' },
  'pumpkin-camembert': { name: '丸ごとかぼちゃのカマンベール', icon: '🎃', level: '上級', image: 'images/recipes/pumpkin-camembert.jpg?v=20260506f' },
  'cedar-whitefish':   { name: '杉板の白身魚',                 icon: '🐠', level: '中級', image: 'images/recipes/cedar-whitefish.jpg?v=20260506f' },
  'grilled-corn':      { name: 'グリルコーン',                 icon: '🌽', level: '初級', image: 'images/recipes/grilled-corn.jpg?v=20260506f' }
};

window.PRODUCT_DETAILS = PRODUCT_DETAILS;
window.RECIPE_INFO = RECIPE_INFO;
