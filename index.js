const http = require('http');
const hostname = 'localhost';
const PORT = 3000;

// httpサーバの定義
const server = http.createServer((req, res) => {
  // 全リクエストを処理
  res.statusCode = 200; //通信成功のステータスコード
  res.setHeader('Content-Type', 'text/html; charset=UTF-8'); //テキストを返す際、日本語を返すのでcharsetもセット・・・

  //ルーティング
  switch (req.url) { //リクエストされたurlが引数に入る
    case '/':
      topPage(req, res); //トップページ用の関数を呼んでいる
      break;
    case '/post':
      postPage(req, res); //投稿用ページの関数を呼んでいる
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


/////////////////////////  各ページを関数にまとめました  //////////////////////////
// ヘッダ
const header = (req, res) => {
  // HTML全体の開始タグ
  res.write('<html lang="ja"><head><title>twitter的掲示板アプリ(仮)</title><style>* {box-sizing:border-box;}</style></head><body style="position:relative;height:100%;">');
  res.write('<header style="border:1px solid #888;padding:40px;">twitter的掲示板アプリ(仮)</header>');
  res.write('<nav><ul><li><a href="/">トップ</a></li><li><a href="/post">投稿</a></li></nav>');
}

// フッタ
const footer = (req, res) => {
  // 全ページ共通HTMLフッター
  res.write('<footer style="position:absolute;bottom:0;width:100%;border:1px solid #888;text-align:center;padding:20px;">フッター</footer>\n'); // 共通のフッター
  res.end('</body></html>'); // res.endでもコンテンツを返せる
}

// トップページ
const topPage = (req, res) => {
  header(req, res);

  //データベースから全データを取得
  getAllPosts((err, posts) => {
    if (err) {
      console.error(err.message);
      return;
    }

    res.write('<h2>トップページ</h2>');
    res.write('<ul>');
    for (let row of posts) {
      res.write('<li>' + row.content + '</li>\n');
    }
    res.write('</ul>');
    footer(req, res);
  })
}

// 投稿ページ
const postPage = (req, res, data) => {
  header(req, res);

  //リクエストメソッドで処理を変える
  //GETの処理
  if (req.method === 'GET') {
    res.write('<h2>投稿ページです</h2>\n');
    res.write('<form action="/post" method="post"><textarea name="kakikomi" style="width:80%;height:100px"></textarea><input type="submit" value="投稿"></form>');
    footer(req, res);
    return;
  }

  //POSTの処理
  if (req.method === 'POST') {
    //まずはPOSTで送られたデータを受け取る
    //dataイベントでPOSTされたデータがchunkに分けられてやってくるので、bodyに蓄積する
    let body = [];
    req.on('data', (chunk) => {
      body.push(chunk);
    }).on('end', () => {
      body = Buffer.concat(body).toString(); //Buffer.concat()メソッドで複数のBufferオブジェクト(body)を結合し新たなBufferオブジェクトを生成。それをtoString()メソッドで文字列に変換しさらにbodyに格納
      //パースする。ここでは、queryString.parse()メソッドを使って、文字列などを解析し、オブジェクトとして返します。
      const queryString = require('querystring');
      const parseBody = queryString.parse(body);

      if (parseBody.kakikomi) {
        //データベースに投稿を格納
        insertPost(parseBody.kakikomi, (err) => {
          if (err) {
            console.error(err.message);
            return;
          }
          // posts.push(parseBody.kakikomi); //posts配列に、これまでの投稿を格納＆蓄積
          res.write('<h2>投稿しました</h2>\n');
          res.write(decodeURIComponent(parseBody.kakikomi)); //投稿をURLデコードしている。URLエンコードされた文字列というのは、%E6%8A こんな感じのやつ。それを普通の文字列に変換する
        })
      }
      footer(req, res);
    });
  }
}

// その他のページ
const notFoundPage = (req, res) => {
  res.statusCode = 404; //httpステータスコードを返す
  header(req, res);
  res.write('<h2>ページはありません</h2>');
  footer(req, res);
}

////////////////////////// sqliteデータの機能定義 /////////////////////////
//sqlite利用
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('twitterboardDatabase.db')//sqliteデータベースを作成

//テーブルの作成
db.run(`CREATE TABLE IF NOT EXISTS posts (id INTEGER PRIMARY KEY AUTOINCREMENT, content TEXT)`);

//データベースから全データを取得する関数
const getAllPosts = (callback) => {
  db.all(`SELECT * FROM posts`, [], (err, rows) => {
    if (err) {
      callback(err, null);
      return;
    }
    callback(null, rows);
  });
}

//データベースに投稿を格納する関数
const insertPost = (content, callback) => {
  db.run(`INSERT INTO posts (content) VALUES (?)`, [content], (err) => {
    if (err) {
      callback(err);
      return;
    }
    callback(null);
  });
}