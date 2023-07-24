const { e, render } = require("./newViewFrame");

// ヘッダ
const header = (req, res) => {
  // HTML全体の開始タグ
  res.write('<html lang="ja">');

  render(res,       
    e('head',{}, [
      e('title', {}, ['twitter的掲示板アプリ(仮)!']),
      e('style', {}, ['* {box-sizing:border-box;}'])
  ]))

  // bodyの開始タグ
  res.write('<body style="position:relative;height:100%;">')

  render(res,
    e('div', {}, [
      e('header', { 'style':'border:1px solid #888;padding:40px;' }, ['twitter的掲示板アプリ(仮)!']),
      e('nav', {}, [
        e('ul', {}, [
          e('li', {}, [e('a', {'href':'/'}, ['トップページ<script>alert("hello!")</script>'])]),
          e('li', {}, [e('a', {'href':'/my_timeline/1'}, ['タイムライン'])]),
          e('li', {}, [e('a', {'href':'/users'}, ['ユーザ一覧'])]),
          e('li', {}, [e('a', {'href':'/following'}, ['フォロー一覧'])]),
          e('li', {}, [e('a', {'href':'/followed'}, ['フォロワー一覧'])]),
          e('li', {}, [e('a', {'href':'/post'}, ['投稿'])]),
          e('li', {}, [e('a', {'href':'/mypage'}, ['マイページ'])]),
          e('li', {}, [e('a', {'href':'/search'}, ['ユーザ検索'])]),
        ])
      ]),
      e('script', {'src':'https://dev.cdn.formaid.jp/js/index.min.js?scenarioId=12d74224-65a1-4c7c-8ec1-fc203aea4b29'},[''])
    ])
  );
};

// フッタ
const footer = (req, res) => {
  render(res,
    e('footer', {'style':'bottom:0;width:100%;border:1px solid #888;text-align:center;padding:20px;'}, ['© 2023 shunya'])
    )

  // 共通のフッター
  res.end("</body></html>"); // res.endでもコンテンツを返せる
};

// ログイン前ヘッダ
const beforeLoginHeader = (req, res) => {
    // HTML全体の開始タグ
    res.write('<html lang="ja">');

    render(res,       
      e('head',{}, [
        e('title', {}, ['twitter的掲示板アプリ(仮)!']),
        e('style', {}, ['* {box-sizing:border-box;}'])
    ]))

  // bodyの開始タグ
  res.write('<body style="position:relative;height:100%;">')

  render(res,
    e('div', {}, [
      e('header', { 'style':'border:1px solid #888;padding:40px;' }, ['twitter的掲示板アプリ(仮)!'])
    ])
  );
};

// ログイン前フッタ
const beforeLoginFooter = (req, res) => {
  render(res,
    e('footer', {'style':'bottom:0;width:100%;border:1px solid #888;text-align:center;padding:20px;'}, ['© 2023 shunya'])
    )
  
  // 共通のフッター
  res.end("</body></html>"); // res.endでもコンテンツを返せる
};

module.exports = {
  header,
  footer,
  beforeLoginHeader,
  beforeLoginFooter,
};
