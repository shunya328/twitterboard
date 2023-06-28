// ヘッダ
const header = (req, res) => {
  // HTML全体の開始タグ
  res.write('<html lang="ja"><head><title>twitter的掲示板アプリ(仮)</title><style>* {box-sizing:border-box;}</style></head><body style="position:relative;height:100%;">');
  res.write('<header style="border:1px solid #888;padding:40px;">twitter的掲示板アプリ(仮)</header>');
  res.write(`
  <nav>
    <ul>
      <li><a href="/">トップ</a></li>
      <li><a href="/my_timeline">自分のタイムライン</a></li>
      <li><a href="/users">ユーザ一覧</a></li>
      <li><a href="/following">フォロー一覧</a></li>
      <li><a href="/followed">フォロワー一覧</a></li>
      <li><a href="/post">投稿</a></li>
      <li><a href="/mypage">マイページ</a></li>
      <li><a href="/search">検索する</a></li>
    </ul>
  </nav>
  `);
}

// フッタ
const footer = (req, res) => {
  // 全ページ共通HTMLフッター
  res.write('<footer style="bottom:0;width:100%;border:1px solid #888;text-align:center;padding:20px;">© 2023 shunya</footer>\n'); // 共通のフッター
  res.end('</body></html>'); // res.endでもコンテンツを返せる
}

// ログイン前ヘッダ
const beforeLoginHeader = (req, res) => {
  // HTML全体の開始タグ
  res.write('<html lang="ja"><head><title>twitter的掲示板アプリ(仮)</title><style>* {box-sizing:border-box;}</style></head><body style="position:relative;height:100%;">');
  res.write('<header style="border:1px solid #888;padding:40px;">twitter的掲示板アプリ(仮)</header>');
}

// ログイン前フッタ
const beforeLoginFooter = (req, res) => {
  // 全ページ共通HTMLフッター
  res.write('<footer style="position:absolute;bottom:0;width:100%;border:1px solid #888;text-align:center;padding:20px;">© 2023 shunya</footer>\n'); // 共通のフッター
  res.end('</body></html>'); // res.endでもコンテンツを返せる
}


module.exports = {
  header,
  footer,
  beforeLoginHeader,
  beforeLoginFooter
};