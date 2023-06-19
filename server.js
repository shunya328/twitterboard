const http = require('http');
const { isDeepStrictEqual } = require('util');
const { topPage, postPage, notFoundPage } = require('./pages');
const { deletePost, db } = require('./databaseUtils');

const hostname = '127.0.0.1';
const PORT = 3000;

// httpサーバの定義
const server = http.createServer((req, res) => {
  // 全リクエストを処理 

  res.statusCode = 200; //通信成功のステータスコード
  res.setHeader('Content-Type', 'text/html; charset=UTF-8'); //テキストを返す際、日本語を返すのでcharsetもセット・・・

  //ルーティング
  const id = req.url.split('/').pop(); //URLから削除対象のIDを取得

  switch (req.url) { //リクエストされたurlが引数に入る
    case '/':
      topPage(req, res); //トップページ用の関数を呼んでいる
      break;
    case '/post':
      postPage(req, res); //投稿用ページの関数を呼んでいる
      break;
    case `/posts/${id}`: //削除を実行
      deletePost(id, (err) => {
        if (err) {
          console.error(err.message);
          res.statusCode = 500;
          res.end('削除時にエラーが発生しました');
          return;
        }
        console.log('投稿を削除しました');
        res.statusCode = 200;
        res.end('削除が完了しました');
      });
      break;
    default:
      notFoundPage(req, res); //その他のリクエストをNot Foundページとして表示
      break
  }
});

// サーバー起動実行
server.listen(PORT, hostname, () => {
  console.log(`Server running at http://${hostname}:${PORT}`);
});

process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error(err.message);
    }
    console.log('Database connection closed.');
    process.exit(0);
  });
});
