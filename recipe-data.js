/* ===================================================================
   RECIPE DATA — used by cookbook.html, recipe.html, product.html
   =================================================================== */

/* Image override map — overrides local images/recipes/{id}.jpg.
   Used when a local image does not exist; provides Unsplash CDN images
   so every recipe has a visual presence. */
window.RECIPE_IMAGE_OVERRIDES = {
  'pork-steak':       'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=800&q=80&auto=format&fit=crop',
  'cheeseburger':     'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=800&q=80&auto=format&fit=crop',
  'shiitake':         'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=800&q=80&auto=format&fit=crop',
  'veg-skewer':       'https://images.unsplash.com/photo-1593708659671-595be1c95128?w=800&q=80&auto=format&fit=crop',
  'spare-ribs':       'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&q=80&auto=format&fit=crop',
  'gratin':           'https://images.unsplash.com/photo-1768204039572-9e62db7b39fd?w=800&q=80&auto=format&fit=crop',
  'beer-can-chicken': 'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=800&q=80&auto=format&fit=crop',
  'back-ribs':        'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&q=80&auto=format&fit=crop',
  'salmon-pro':       'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=800&q=80&auto=format&fit=crop',
  'banana':           'https://images.unsplash.com/photo-1572383672419-ab35444a6934?w=800&q=80&auto=format&fit=crop',
  'jerk-chicken':     'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=800&q=80&auto=format&fit=crop',
  'saikyo-fish':      'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=800&q=80&auto=format&fit=crop',
  'carne-asada':      'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=800&q=80&auto=format&fit=crop',
  'tomahawk':         'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=800&q=80&auto=format&fit=crop',
  'mushroom-grill':   'https://images.unsplash.com/photo-1593708659671-595be1c95128?w=800&q=80&auto=format&fit=crop',
  'asparagus-grill':  'https://images.unsplash.com/photo-1593708659671-595be1c95128?w=800&q=80&auto=format&fit=crop'
};

/* Local images (in /images/recipes/) — these take precedence over overrides */
window.RECIPE_LOCAL_IMAGES = new Set([
  'cedar-salmon', 'veg-grill', 'bratwurst', 'lemon-chicken', 'pizza', 'shrimp-grill',
  'apple-pie', 'pulled-pork', 'bread-pudding'
]);

/* Helper: resolve image URL for a given recipe id */
window.getRecipeImage = function(id) {
  if (window.RECIPE_LOCAL_IMAGES.has(id)) {
    return `images/recipes/${id}.jpg?v=20260506`;
  }
  return window.RECIPE_IMAGE_OVERRIDES[id] || `images/recipes/${id}.jpg?v=20260506`;
};

window.RECIPES = [
  {
    id: 'cedar-salmon', name: 'シダープランク・シーフード', nameEn: 'Cedar Plank Seafood (Salmon・Shrimp・Scallop)', icon: '🐟',
    level: 1, levelLabel: '初級', category: 'fish', categoryLabel: '🐟 魚',
    timeMin: 12, timeBucket: 'short', timeLabel: '⚡ 約12分',
    essence: '杉板から立ちのぼる微かな煙が、魚介に「森の記憶」を与える。BBQで初めて「料理が場の空気を変える」瞬間を体験できる、入口にして頂点。<strong>サーモン・エビ・ホタテを一枚の板で同時に焼ける</strong>万能料理。',
    specs: [{ label: 'グリル温度', value: '230℃' },{ label: '焼き時間', value: '8〜12分' },{ label: '中心温度', value: '53℃（サーモン）' }],
    points: ['杉板は最低30分、できれば1時間以上水に浸す','板のツルツル面を下にして、グリルに置く','<strong>「パチッ」と音が鳴ったら</strong>魚介を乗せる合図','<strong>サーモンを中央、エビ・ホタテを両脇</strong>に配置すると同時に焼ける','ローズマリーを枝ごと乗せると、杉と相まって香りに奥行きが出る','養殖サーモンが安全。天然はアニサキス対策に75℃以上推奨','エビは殻ごと焼く。ホタテは塩・胡椒のみで素材の甘みを引き出す'],
    philosophy: '杉板料理は、テーブルで歓声が上がる料理。魚介を焼くのではなく、杉板を介して<strong>「香りを贈る」</strong>料理として捉えるとよい。一枚の板に複数の魚介を乗せると、それぞれの香りが混ざり合い、海の盛り合わせになる。',
    pairedRubs: ['lamb-layup', 'garlic-goals', 'stef-aquadesiac']
  },
  {
    id: 'veg-grill', name: '季節の野菜グリル', nameEn: 'Seasonal Grilled Vegetables', icon: '🥬',
    level: 1, levelLabel: '初級', category: 'veggie', categoryLabel: '🥬 野菜',
    timeMin: 9, timeBucket: 'short', timeLabel: '⚡ 約9分',
    essence: '水分を飛ばすほど甘くなる。野菜は「焼く」のではなく「水を抜く」料理だと気づいた瞬間、BBQの解像度が一段上がる。',
    specs: [{ label: 'グリル温度', value: '230〜250℃' },{ label: '焼き時間', value: '3分×3回' },{ label: '合図', value: '焼き色' }],
    points: ['野菜は<strong>大きく</strong>切る — 大きいほど柔らかく仕上がる','エリンギは輪切り、パプリカは4等分','オリーブオイルは網ではなく<strong>食材に塗る</strong>','後からオイルは追加しない','焼き色＝完成の合図。焼きすぎない'],
    philosophy: 'オリーブオイルは食材の水分をコーティングする。ナスがパリパリにならないのも、エリンギがジューシーなのも、すべて<strong>オイルの仕事</strong>。',
    pairedRubs: ['garlic-goals']
  },
  {
    id: 'pork-steak', name: 'ポークステーキ', nameEn: 'Pork Steak (2cm)', icon: '🥩',
    level: 1, levelLabel: '初級', category: 'meat', categoryLabel: '🥩 肉',
    timeMin: 5, timeBucket: 'short', timeLabel: '⚡ 約5分',
    essence: '「見た目」ではなく「中心温度63℃」を信じる。最初の高温＋短時間の組み合わせは、BBQで最も再現性の高い火入れだ。',
    specs: [{ label: 'グリル温度', value: '230〜250℃' },{ label: '焼き時間', value: '2.5分×2' },{ label: '中心温度', value: '63℃' }],
    points: ['網に対して<strong>45度</strong>に置く（焼き目が美しくなる）','軽く押すだけ。動かさない','焼いた時間の<strong>1/3</strong>はレストタイム','カットはフォークではなく<strong>スプーン</strong>','仕上げにコンパウンドバター（バター＋メープル＋ローズマリー＋マスタード）'],
    philosophy: 'BBQの火力は「強くする」のではなく<strong>「配置する」</strong>もの。初心者がまず学ぶべきは火加減ではなく、火の置き方。',
    pairedRubs: ['honey-soy-slammer', 'garlic-goals']
  },
  {
    id: 'bratwurst', name: 'ブラートソーセージ', nameEn: 'Bratwurst Sausage', icon: '🌭',
    level: 1, levelLabel: '初級', category: 'meat', categoryLabel: '🥩 肉',
    timeMin: 8, timeBucket: 'short', timeLabel: '⚡ 約8分',
    essence: '仕込み5分。場が温まる前の「つなぎ」として完璧。会話が始まる前にテーブルに到着する、最初の一品の役割を担う。',
    specs: [{ label: 'グリル温度', value: '200℃' },{ label: '焼き時間', value: '2分×4面' },{ label: '中心温度', value: '63℃' }],
    points: ['網目に沿って、網と網の間に乗せて安定させる','4面を均等に焼く（転がすイメージ）','仕上げのリッチハニーマスタード：蜂蜜＋粒マスタード＋マヨ＋カイエン','レストタイムは数分でOK'],
    philosophy: 'BBQは「仕込みは一括、提供は順番」が鉄則。ソーセージは仕込み時間が短いので、<strong>メインの待ち時間に出す</strong>と、場のテンポが崩れない。',
    pairedRubs: ['steak-shooter']
  },
  {
    id: 'cheeseburger', name: 'クラシックチーズバーガー', nameEn: 'Classic Cheeseburger', icon: '🍔',
    level: 1, levelLabel: '初級', category: 'meat', categoryLabel: '🥩 肉',
    timeMin: 6, timeBucket: 'short', timeLabel: '⚡ 約6分',
    essence: 'バーガーは、BBQのアイコンであり、BBQの宣言だ。「これがアメリカン」と一目で伝わる、最も雄弁な一品。',
    specs: [{ label: 'グリル温度', value: '230℃' },{ label: '焼き時間', value: '2.5分×2＋30秒' },{ label: '中心温度', value: '63℃' }],
    points: ['パテは150g、塩胡椒＋オリーブオイルでシンプルに','裏返すのは<strong>1回だけ</strong>。動かさない','チーズは焼き上がる30秒前に乗せる','バンズの内側を直火で20秒、焼き目をつける','サウザンアイランドソース：マヨ＋ケチャップ＋レリッシュ'],
    philosophy: 'バーガーは<strong>「個別配膳できる」</strong>料理。一人一個ずつ手渡す瞬間に、テーブルの表情が変わる。料理を「渡す」体験は、料理を「並べる」体験より深い。',
    pairedRubs: ['steak-shooter', 'beef-bounce']
  },
  {
    id: 'shiitake', name: '肉詰めしいたけ', nameEn: 'Meat Stuffed Shiitake', icon: '🍄',
    level: 2, levelLabel: '中級', category: 'meat', categoryLabel: '🥩 肉',
    timeMin: 10, timeBucket: 'short', timeLabel: '⚡ 約10分',
    essence: '和の食材に、アメリカンBBQの火入れ思想を当てる。インダイレクトでじっくり火を通すと、しいたけは肉と一体になる。',
    specs: [{ label: 'グリル温度', value: '200〜250℃' },{ label: '焼き時間', value: '約10分' },{ label: '中心温度', value: '63℃' }],
    points: ['しいたけのヘタは<strong>手で取る</strong>（包丁では旨味が逃げる）','豚ミンチ＋大葉＋オリーブオイル＋塩胡椒','<strong>インダイレクト必須</strong> — ダイレクトだと、しいたけが先に焦げて中の肉が焼けない','ラック＆シールドを使うと安定する','仕上げに焼き鳥のタレを塗ると、和に寄る'],
    philosophy: 'BBQはアメリカ的な肉文化の象徴に見えるが、しいたけ・大葉・焼き鳥のタレを介すると、日本人の身体に届く。普遍を語るには、まず<strong>翻訳</strong>が必要だ。',
    pairedRubs: ['honey-soy-slammer']
  },
  {
    id: 'veg-skewer', name: 'スキュアーベジタブル（串野菜）', nameEn: 'Skewered Vegetables', icon: '🥒',
    level: 2, levelLabel: '中級', category: 'veggie', categoryLabel: '🥬 野菜',
    timeMin: 6, timeBucket: 'short', timeLabel: '⚡ 約6分',
    essence: '串に刺す行為そのものが、「これからBBQが始まる」という宣言になる。視覚的な多幸感が、テーブルの期待値を引き上げる。',
    specs: [{ label: 'グリル温度', value: '200℃' },{ label: '焼き時間', value: '3分×2' },{ label: '合図', value: '焼き目' }],
    points: ['竹串は30分以上水に浸す（焦げ防止）','パプリカ・ズッキーニ・茄子・エリンギ・季節野菜','バジルペースト＋オリーブオイル＋塩胡椒のタレを刷毛で塗る','一口大にカットしてから串に刺す','焼き目がしっかり付いたら完成'],
    philosophy: 'BBQは料理であると同時に<strong>「振る舞い」</strong>だ。串野菜は手元に運ぶ動きが美しいので、提供時の所作まで含めて設計するとよい。',
    pairedRubs: ['garlic-goals']
  },
  {
    id: 'spare-ribs', name: 'スペアリブ', nameEn: 'Spare Ribs', icon: '🍖',
    level: 2, levelLabel: '中級', category: 'meat', categoryLabel: '🥩 肉',
    timeMin: 100, timeBucket: 'long', timeLabel: '🔥 約100分',
    essence: '100分かけて、肉と話す。ラブで下味、180℃でじっくり、最後に蜂蜜とBBQソースで艶を出す。骨からホロリと外れたとき、テーブルの全員が言葉を失う。',
    specs: [{ label: 'グリル温度', value: '180℃' },{ label: '焼き時間', value: '30→60→10分' },{ label: '中心温度', value: '92℃' }],
    points: ['裏側の薄皮（メンブレン）は<strong>必ず剥がす</strong>','ラブは裏側からたっぷり振る','ラック＆シールドで遠火30分','アルミホイルでBBQソース＋蜂蜜を塗って包み、再度遠火で1時間','裸の状態で強火の遠火10分、外側に香ばしさを出して完成'],
    philosophy: 'スペアリブから先は「焼く」料理ではなく<strong>「見守る」</strong>料理になる。90分以上の調理時間を「面倒」ではなく「場の土台」として捉えると、BBQの構造が変わる。',
    pairedRubs: ['honey-soy-slammer', 'beef-bounce']
  },
  {
    id: 'pizza', name: 'マルゲリータピッツァ', nameEn: 'Margherita Pizza', icon: '🍕',
    level: 2, levelLabel: '中級', category: 'side', categoryLabel: '🧀 サイド',
    timeMin: 10, timeBucket: 'short', timeLabel: '⚡ 約10分',
    essence: '「BBQでピザが焼ける」という事実そのものが、最大の演出になる。グリルがオーブンに変わる瞬間を見せるだけで、場の常識が反転する。',
    specs: [{ label: 'グリル温度', value: '250℃' },{ label: '焼き時間', value: '10分' },{ label: '必要', value: 'ピザストーン' }],
    points: ['ピザストーンは事前に<strong>8分間予熱</strong>（最重要）','市販ピザ生地で十分。トマトソース＋モッツァレラ＋ミニトマト','仕上げにバジルソースをかけると本格度が一気に上がる','生地の下も焼けているか必ず確認する'],
    philosophy: 'BBQの本質は「グリルを<strong>オーブンとして使う</strong>」こと。ピザはその思想を最も視覚的に伝える料理であり、BBQの定義を再生する力がある。',
    pairedRubs: ['garlic-goals']
  },
  {
    id: 'lemon-chicken', name: 'ガーリックレモンチキン', nameEn: 'Garlic Lemon Chicken', icon: '🍗',
    level: 2, levelLabel: '中級', category: 'meat', categoryLabel: '🥩 肉',
    timeMin: 10, timeBucket: 'short', timeLabel: '⚡ 約10分',
    essence: 'マリネ液に1晩。仕込みのほとんどは「待つこと」。BBQ当日は焼くだけ。準備の長さが、提供の余裕を生む。',
    specs: [{ label: 'グリル温度', value: '250℃' },{ label: '焼き時間', value: '5分×2' },{ label: '中心温度', value: '73℃' }],
    points: ['マリネ：レモン汁1個分＋すりおろしニンニク＋ケイジャンスパイス＋オリーブオイル＋塩胡椒','30分以上漬ける、できれば<strong>一晩</strong>','皮面を下にして5分、ひっくり返してさらに5分','骨に当たる位置の中心温度が73℃で完成'],
    philosophy: 'BBQは「当日の調理」よりも<strong>「前日の仕込み」</strong>が結果を決める。仕込みに時間をかけられる人ほど、当日テーブルで会話に集中できる。料理は時間配分の哲学だ。',
    pairedRubs: ['chilli-citrus-charge', 'honey-soy-slammer']
  },
  {
    id: 'apple-pie', name: 'アップルパイ', nameEn: 'Apple Pie', icon: '🥧',
    level: 2, levelLabel: '中級', category: 'dessert', categoryLabel: '🍰 デザート',
    timeMin: 20, timeBucket: 'mid', timeLabel: '⏱ 約20分',
    essence: 'BBQで甘いものを出すと、テーブルの時間が一段ゆっくりになる。シナモンの香りは、解散の合図ではなく「もう少し居たい」のサイン。バニラアイスを添えると、温度差で多幸感が増す。',
    specs: [{ label: 'グリル温度', value: '200℃' },{ label: '焼き時間', value: '15分＋5分' },{ label: '材料', value: '市販パイシート' }],
    points: ['リンゴは皮を剥いて4等分→スライス','パイシートにリンゴ・バター・砂糖・シナモンを乗せ、フォークで端を留める','クッキングシート上で<strong>遠火15分</strong>（200℃）','その後、直火に移してさらに5分。焼き目で完成','仕上げに<strong>バニラアイスを横に添える</strong>のが王道'],
    philosophy: 'デザートは「美味しさ」のためではなく、<strong>「時間を伸ばすため」</strong>にある。場が深いほど、参加者は帰りたくなくなる。アップルパイは、その引き留め役。',
    pairedRubs: []
  },
  {
    id: 'bread-pudding', name: 'BBQブレッドプディング', nameEn: 'BBQ Bread Pudding (with Marshmallow)', icon: '🍮',
    level: 2, levelLabel: '中級', category: 'dessert', categoryLabel: '🍰 デザート',
    timeMin: 25, timeBucket: 'mid', timeLabel: '⏱ 約25分',
    essence: '余ったパンとマシュマロで作る、グリル発のデザート。表面のマシュマロが香ばしく焦げた瞬間、テーブルが拍手で迎える。BBQの「最後の余白」を埋める一品。',
    specs: [{ label: 'グリル温度', value: '180℃' },{ label: '焼き時間', value: '20〜25分' },{ label: '火入れ', value: 'インダイレクト' }],
    points: ['食パン or ブリオッシュを<strong>一口大にちぎる</strong>','卵2個＋牛乳200ml＋砂糖大さじ2＋バニラエッセンス少々を混ぜる','パンを浸して、アルミ容器に詰める','<strong>マシュマロを上にぎっしり乗せる</strong>','インダイレクト180℃で15分、マシュマロが膨らんで焼き目がつくまで','焼きすぎ注意。マシュマロが完全に黒くなる前に取り出す','ラック&シールドを下に敷くと底が焦げない'],
    philosophy: 'BBQの最後にデザートを出すと、場が「もう少し続けたい」モードに切り替わる。<strong>マシュマロの焼き目は、終わりではなく余韻の合図</strong>。アップルパイより視覚的にエンタメ性が高く、SNS映えも抜群。',
    pairedRubs: []
  },
  {
    id: 'gratin', name: 'BBQポテトグラタン', nameEn: 'BBQ Potato Gratin', icon: '🥔',
    level: 3, levelLabel: '上級', category: 'side', categoryLabel: '🧀 サイド',
    timeMin: 30, timeBucket: 'mid', timeLabel: '⏱ 約30分',
    essence: 'グリルでグラタンが焼けるという事実。それだけで、テーブルの常識が一段ゆるむ。生クリームとパルメザンの濃厚さが、BBQの香ばしさを引き立てる。',
    specs: [{ label: 'グリル温度', value: '200℃' },{ label: '焼き時間', value: '約30分' },{ label: '火入れ', value: 'インダイレクト' }],
    points: ['ジャガイモは皮をむき、20分水に浸す（変色防止）','生クリーム200cc＋パルメザン100g（チーズの塩分があるので塩は控えめ）','アルミ容器に入れて<strong>インダイレクトで30分</strong>','真ん中は火を入れすぎない','明太子・ベーコン・コーン・マッシュルーム — 何でも合う'],
    philosophy: 'BBQでサイドメニューを侮ってはいけない。むしろ、サイドの選択こそホストの感性が問われる。グラタンは<strong>「肉に集中したくない参加者」</strong>のための逃げ場として機能する。',
    pairedRubs: ['garlic-goals']
  },
  {
    id: 'beer-can-chicken', name: 'ビア缶チキン', nameEn: 'Beer Can Chicken', icon: '🍺',
    level: 3, levelLabel: '上級', category: 'meat', categoryLabel: '🥩 肉',
    timeMin: 60, timeBucket: 'long', timeLabel: '🔥 約60分',
    essence: '鶏が直立した姿で焼ける。見た目のインパクト、ビールの蒸気で内側からしっとり、繊維に味が染み込む構造。「セクシーチキン」と呼ばれる所以。',
    specs: [{ label: 'グリル温度', value: '200℃' },{ label: '焼き時間', value: '約60分' },{ label: '中心温度', value: '73℃' }],
    points: ['下味：醤油＋オイスターソース＋みりん＋料理酒＋ビール、<strong>1日漬ける</strong>','ビール＋炭酸水で繊維に味が入りやすくなる（細かい気泡が鍵）','胸肉は味が入りにくいので、胸側にガーリックパウダーをしっかり塗る','15分ごとにタレを塗る','切り方：足を斜めにカット → 背中〜胸 → 最後は手でほぐす'],
    philosophy: 'BBQの極意のひとつは<strong>「炭酸とアルコールが肉質を変える」</strong>という発見。ビア缶チキンは、料理の科学を最も視覚的に体験できる教材。',
    pairedRubs: ['honey-soy-slammer', 'chilli-citrus-charge']
  },
  {
    id: 'back-ribs', name: 'バックリブ（ロー&スロー）', nameEn: 'Back Ribs · Low & Slow', icon: '💎',
    level: 3, levelLabel: '上級', category: 'meat', categoryLabel: '🥩 肉',
    timeMin: 240, timeBucket: 'long', timeLabel: '🔥 約4時間',
    essence: 'スペアリブが「お腹側」、バックリブは「背中側」。赤身が多く淡白で、ロー&スローの本質が最もよく現れる部位。コラーゲン理解こそがBBQの本質だ。',
    specs: [{ label: 'グリル温度', value: '約200℃' },{ label: '焼き時間', value: '4時間前後' },{ label: '完成温度', value: '92℃' }],
    points: ['<strong>70〜80℃：硬い</strong>（コラーゲンがまだ収縮）','<strong>80℃以上：コラーゲンがゼラチン化</strong>','<strong>92℃：スペアリブ完成</strong>（骨が浮き出る）','<strong>97℃：プルドポーク</strong>（手でほぐれる）','63℃で一度取り出してアルミで包み、再加熱して温度を上げると失敗しない'],
    philosophy: 'ロー&スローは「時間をかける料理」ではなく、<strong>「コラーゲンを理解する料理」</strong>だ。数字を信じれば、誰でも到達できる。',
    pairedRubs: ['beef-bounce', 'honey-soy-slammer']
  },
  {
    id: 'salmon-pro', name: '上級サーモン（はちみつ×マスタード）', nameEn: 'Honey Mustard Salmon', icon: '🍯',
    level: 3, levelLabel: '上級', category: 'fish', categoryLabel: '🐟 魚',
    timeMin: 10, timeBucket: 'short', timeLabel: '⚡ 約10分',
    essence: '初級のシダープランクサーモンと同じ食材で、別次元の体験を作る。鍵は下処理 — ドリップを完全に拭くこと。それだけで、サーモンは別物になる。',
    specs: [{ label: '火入れ', value: '高温→低温' },{ label: '焼き時間', value: '約10分' },{ label: '中心温度', value: '53℃' }],
    points: ['下処理：キッチンペーパーで<strong>ドリップを完全に拭く</strong>（ここで仕上がりが決まる）','味付け：<strong>はちみつ × マスタード</strong>のグレーズ','最初は高温で表面を固める','煙が出始めたら温度を下げて、じっくり中まで火を入れる','「煙を出したい時は温度を下げる」が原則'],
    philosophy: 'BBQの上級者と初心者の違いは、火の強さではなく<strong>「水分の見立て」</strong>にある。ドリップをどう扱うか。煙をいつ出すか。その判断こそが、料理を一段引き上げる。',
    pairedRubs: ['honey-soy-slammer']
  },
  {
    id: 'banana', name: 'バナナグリル', nameEn: 'Grilled Banana with Rum', icon: '🍌',
    level: 3, levelLabel: '上級', category: 'dessert', categoryLabel: '🍰 デザート',
    timeMin: 3, timeBucket: 'short', timeLabel: '⚡ 約3分',
    essence: '3分で焼ける、最後の一品。ラム酒のアルコールを飛ばして香りだけ残す手順は、BBQ全体を「儀式」に昇華させる。',
    specs: [{ label: 'グリル温度', value: '中火' },{ label: '焼き時間', value: '約3分' },{ label: '材料', value: 'ラム酒＋蜂蜜' }],
    points: ['バナナは<strong>縦にカット</strong>。皮ごと身を下にして焼く','ラム酒＋はちみつをかける','<strong>アルコールを飛ばす</strong>（炎が上がるが慌てない）','仕上げにバニラアイスを乗せると、温度差で多幸感が増す'],
    philosophy: '炎が立つ料理は、視覚的に<strong>「終わり」</strong>を告げる。バナナグリルは、BBQという長い時間に句読点を打つ料理。',
    pairedRubs: []
  },
  {
    id: 'pulled-pork', name: 'プルドポーク', nameEn: 'Pulled Pork', icon: '🐷',
    level: 3, levelLabel: '上級', category: 'meat', categoryLabel: '🥩 肉',
    timeMin: 600, timeBucket: 'long', timeLabel: '🔥 約8〜10時間',
    essence: 'BBQの王様。豚肩ロースに塩・砂糖・スパイスを擦り込み、110℃で10時間。中心温度97℃で「手でほぐれる」状態が完成のサイン。バンズに挟むと、世界が変わる。',
    specs: [{ label: 'グリル温度', value: '110〜120℃' },{ label: '焼き時間', value: '8〜10時間' },{ label: '完成温度', value: '97℃' }],
    points: ['豚肩ロース（ボストンバット）1〜2kg、脂は適度に残す','ラブをたっぷり擦り込み、最低1時間（できれば一晩）寝かせる','<strong>110〜120℃</strong>のロー&スローで、ウッドチップで燻香をつける','中心温度70℃あたりで「スタリング」（停滞）が起きるが慌てない','92℃を超えると一気に進む。<strong>97℃</strong>でフォークがスッと入れば完成','取り出してから30分休ませ、フォーク2本で繊維に沿ってほぐす'],
    philosophy: 'プルドポークは「<strong>10時間、その場にいる</strong>」料理だ。火を見守り、温度を眺め、何度も覗く。料理する人の存在そのものが、味を決める。',
    pairedRubs: ['honey-soy-slammer', 'beef-bounce']
  },
  {
    id: 'jerk-chicken', name: 'ジャマイカン ジャークチキン', nameEn: 'Jamaican Jerk Chicken', icon: '🌶️',
    level: 2, levelLabel: '中級', category: 'meat', categoryLabel: '🥩 肉',
    timeMin: 35, timeBucket: 'mid', timeLabel: '⏱ 約35分',
    essence: 'カリブの風がBBQに吹き込む一品。オールスパイス、スコッチボネット、タイム — 強烈な香りの層が、皮目から鶏肉まで貫く。',
    specs: [{ label: 'グリル温度', value: '200℃' },{ label: '焼き時間', value: '30〜40分' },{ label: '中心温度', value: '73℃' }],
    points: ['ジャークシーズニング：オールスパイス＋タイム＋シナモン＋ナツメグ＋スコッチボネット（or ハバネロ）＋ガーリック＋ライム','マリネは<strong>最低6時間、できれば一晩</strong>','皮目を下にして10分、ひっくり返してインダイレクト20分','焦げやすいので皮側は注意深く','仕上げにライムを絞ると風味が立つ'],
    philosophy: 'ジャークは「香りの料理」。鶏を焼くというより、<strong>香りを纏わせる</strong>感覚で。BBQで「いつもと違う場」を作りたいときに、これが一番効く。',
    pairedRubs: ['chilli-citrus-charge']
  },
  {
    id: 'saikyo-fish', name: 'さわらの西京焼き', nameEn: 'Saikyo Miso Glazed Fish', icon: '🍱',
    level: 2, levelLabel: '中級', category: 'fish', categoryLabel: '🐟 魚',
    timeMin: 12, timeBucket: 'short', timeLabel: '⚡ 約12分',
    essence: 'BBQで西京焼きが焼ける、という発見。日本の最も洗練された魚料理を、薪火と煙で再構築する。和の食材は、アメリカンBBQの火入れで化ける。',
    specs: [{ label: 'グリル温度', value: '200℃' },{ label: '焼き時間', value: '8〜12分' },{ label: '火入れ', value: 'インダイレクト' }],
    points: ['味噌床：白味噌＋みりん＋酒＋砂糖を混ぜる','さわら（or 鯖）の切り身を<strong>1日漬ける</strong>','焼く前にキッチンペーパーで味噌を軽く拭く（焦げ防止）','インダイレクトで200℃、皮目から焼く','焼き色がついたら反対面、合計8〜12分','杉板を併用すると香りに奥行きが出る'],
    philosophy: '日本の食文化は「<strong>素材を信じる</strong>」哲学。アメリカンBBQの「<strong>時間を信じる</strong>」哲学。両方を一皿に乗せると、新しい場が生まれる。',
    pairedRubs: ['honey-soy-slammer']
  },
  {
    id: 'carne-asada', name: 'カルネ・アサーダ', nameEn: 'Carne Asada', icon: '🌮',
    level: 2, levelLabel: '中級', category: 'meat', categoryLabel: '🥩 肉',
    timeMin: 12, timeBucket: 'short', timeLabel: '⚡ 約12分',
    essence: 'メキシコのBBQ文化が、BBQの幅を広げる。フランクステーキを薄切りにしてトルティーヤに包む瞬間、テーブルが一段にぎやかになる。',
    specs: [{ label: 'グリル温度', value: '280℃' },{ label: '焼き時間', value: '3〜4分×2' },{ label: '中心温度', value: '53℃' }],
    points: ['フランク or スカートステーキ（厚さ1〜1.5cm）','マリネ：ライム＋オレンジ＋ガーリック＋クミン＋オレガノ＋唐辛子＋オリーブオイル','<strong>2時間以上漬ける</strong>（4時間が理想）','高温短時間で一気に焼く（焼きすぎ厳禁）','焼いた後5分休ませ、繊維に対して<strong>垂直に薄切り</strong>','トルティーヤ＋ライム＋パクチー＋玉ねぎで完成'],
    philosophy: 'カルネ・アサーダは「<strong>分け合う</strong>」料理。一枚を切って配るのではなく、トルティーヤに包んで自分で完成させる。料理の最後の工程を客に任せると、参加感が生まれる。',
    pairedRubs: ['steak-shooter-spicy', 'chilli-citrus-charge']
  },
  {
    id: 'tomahawk', name: 'トマホークステーキ', nameEn: 'Tomahawk Steak', icon: '🪓',
    level: 3, levelLabel: '上級', category: 'meat', categoryLabel: '🥩 肉',
    timeMin: 75, timeBucket: 'long', timeLabel: '🔥 約75分',
    essence: '骨付きリブアイの極み。長い骨は「斧（トマホーク）」の柄。テーブルに出した瞬間に拍手が起きる、BBQ最大のショーピース。',
    specs: [{ label: 'グリル温度', value: '120℃→280℃' },{ label: '焼き時間', value: '60分＋8分' },{ label: '中心温度', value: '54℃' }],
    points: ['厚さ4〜5cm、800g〜1.2kg の骨付きリブアイ','<strong>リバースシア法</strong>：低温で内部を温め、最後に高温で焼き目','インダイレクト120℃で内部48℃まで（約60分）','一度取り出し、ダイレクト280℃で各面1.5〜2分','中心温度54℃で休ませ、5〜10分後にカット','塩・胡椒・ローズマリー・ガーリックバターで仕上げ'],
    philosophy: 'トマホークは「<strong>提供のための料理</strong>」だ。皿に乗ったときの威圧感そのものが、夜の主役を作る。料理は栄養ではなく、場を立てる装置になる。',
    pairedRubs: ['beef-bounce', 'steak-shooter']
  },
  {
    id: 'shrimp-grill', name: 'ガーリックシュリンプ', nameEn: 'Garlic Grilled Shrimp', icon: '🦐',
    level: 1, levelLabel: '初級', category: 'fish', categoryLabel: '🐟 魚',
    timeMin: 6, timeBucket: 'short', timeLabel: '⚡ 約6分',
    essence: '殻付きで焼くと、エビの味が逃げない。ガーリックバターと白ワインを絡めれば、ホテルディナーの一品が、グリルの上で再現できる。',
    specs: [{ label: 'グリル温度', value: '230℃' },{ label: '焼き時間', value: '2〜3分×2' },{ label: '合図', value: 'ピンク色' }],
    points: ['ジャンボシュリンプ（殻付き）背わたを取る','ガーリックバター＋オリーブオイル＋白ワイン＋イタリアンパセリでマリネ15分','直火で2〜3分、ひっくり返してさらに2〜3分','ピンク色になったら<strong>すぐ取り出す</strong>（焼きすぎると硬くなる）','殻を剥きながら食べる「手と口で楽しむ」料理','仕上げにレモンをひと絞り'],
    philosophy: 'エビは<strong>「殻ごと焼く」</strong>のが基本。殻が肉汁を守る。料理の本質は「素材を裸にしないこと」だ。',
    pairedRubs: ['garlic-goals', 'lamb-layup']
  },
  {
    id: 'mushroom-grill', name: 'ポートベローマッシュルーム', nameEn: 'Portobello Mushroom Grill', icon: '🍄‍🟫',
    level: 1, levelLabel: '初級', category: 'veggie', categoryLabel: '🥬 野菜',
    timeMin: 10, timeBucket: 'short', timeLabel: '⚡ 約10分',
    essence: 'ベジタリアンの主役級。肉のような食感、肉のような旨味、肉のような満足感。「肉以外の選択肢」がBBQの幅を広げる。',
    specs: [{ label: 'グリル温度', value: '200℃' },{ label: '焼き時間', value: '4〜5分×2' },{ label: '合図', value: '汁が滲む' }],
    points: ['ポートベロー（or 大きなマッシュルーム）軸を取り、傘を上にして焼く','バルサミコ＋オリーブオイル＋ガーリック＋タイムでマリネ20分','傘を上にしてダイレクト4〜5分（汁が傘の中に溜まる）','ひっくり返してさらに4〜5分、汁を傘に戻すように','<strong>水分を逃さないこと</strong>が美味しさの鍵','仕上げにブルーチーズかパルメザンを乗せる'],
    philosophy: 'マッシュルームは「<strong>動物性に近い食物</strong>」だ。BBQで肉以外の選択肢を持つことは、参加者の多様性を受け入れること。料理は誰のためにあるかを問う。',
    pairedRubs: ['garlic-goals']
  },
  {
    id: 'asparagus-grill', name: 'アスパラガスのグリル', nameEn: 'Grilled Asparagus', icon: '🌿',
    level: 1, levelLabel: '初級', category: 'veggie', categoryLabel: '🥬 野菜',
    timeMin: 5, timeBucket: 'short', timeLabel: '⚡ 約5分',
    essence: 'BBQの「合間」を埋める一品。3〜4分で焼ける、軽い、香ばしい。重い肉料理の隙間に出すと、テーブルのリズムが整う。',
    specs: [{ label: 'グリル温度', value: '230℃' },{ label: '焼き時間', value: '3〜4分' },{ label: '合図', value: '焼き目' }],
    points: ['太めのアスパラガスを選ぶ（細いと焦げる）','根元の硬い部分を1cmカット、皮を少しむく','オリーブオイル＋塩＋胡椒のみ。シンプルに','直火で3〜4分、転がしながら全面に焼き目','仕上げにレモン汁＋粉チーズ','<strong>焼きすぎないこと</strong>。シャキッと感を残す'],
    philosophy: 'BBQで「軽い料理」を出せる人が、ホスト力の高い人だ。重い肉だけを並べるのは、<strong>料理ではなく見栄</strong>。緩急があるから、場が長く続く。',
    pairedRubs: ['garlic-goals']
  }
];
