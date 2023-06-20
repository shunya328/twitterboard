const http = require('http');
const { isDeepStrictEqual } = require('util');
const { signUpPage, signInPage, topPage, postPage, postPostPage, showPost, myPage, editProfilePage, updateEditProfilePage, notFoundPage } = require('./pages');
const { sessions, postSignInPage, postSignUpPage, postLogout } = require('./sessions');
const { deletePost, db, updateUser } = require('./databaseUtils');

const hostname = '127.0.0.1';
const PORT = 3000;

// httpサーバの定義
const server = http.createServer((req, res) => {
  res.statusCode = 200; //通信成功のステータスコード
  res.setHeader('Content-Type', 'text/html; charset=UTF-8'); //テキストを返す際、日本語を返すのでcharsetもセット・・・

  // セッションIDの取得
  const sessionID = req.headers.cookie ? req.headers.cookie.split('=')[1] : null
  console.log(`現在のsessionIDは、          →${sessionID}`);
  // console.log(`サーバ側で保持しているセッションのユーザIDは、 ${sessions[sessionID]}`)

  console.log(`現在のsessions[sessionID]は、→${JSON.stringify(sessions[sessionID])}`);

  // 【セッションチェック】(サインインorサインアップページで無い時に、さらにセッションが無い時に)
  if (req.url !== '/sign_in' && req.url !== '/sign_up' && !sessions[sessionID]) {
    // ログインしていない場合、サインインページにリダイレクト
    res.writeHead(302, { 'Location': '/sign_in' });
    res.end();
    return;
  }

  // 【セッションチェック】逆に、サインインしている状態であれば、サインイン・サインアップページに飛ばないようにする。
  if ((req.url === '/sign_in' || req.url === '/sign_up') && sessions[sessionID]) {
    // トップページにリダイレクト
    res.writeHead(302, { 'Location': '/' });
    res.end();
    return;
  }

  const id = req.url.split('/').pop(); //URLの一番後ろのIDを取得

  //ルーティング
  if (req.method === 'GET') {
    switch (req.url) { //リクエストされたurlが引数に入る
      case '/':
        topPage(req, res); //トップページ用の関数を呼んでいる
        break;
      case '/sign_up':
        signUpPage(req, res);
        break;
      case '/sign_in':
        signInPage(req, res);
        break;
      case '/post':
        postPage(req, res); //投稿用ページの関数を呼んでいる
        break;
      case `/post/${id}`:
        showPost(req, res, id);
        break;
      case '/mypage':
        myPage(req, res);
        break;
      case '/mypage/edit_profile':
        editProfilePage(req, res);
        break;
      default:
        notFoundPage(req, res); //その他のリクエストをNot Foundページとして表示
        break;
    }
  } else if (req.method === 'POST') {
    switch (req.url) {
      case '/post':
        postPostPage(req, res);
        break;
      case '/sign_up':
        postSignUpPage(req, res);
        break;
      case '/sign_in':
        postSignInPage(req, res);
        break;
      case '/logout':
        postLogout(req, res, sessions, sessionID);
        break;
      case '/mypage/edit_profile':
        // updateEditProfilePageを非同期で実行し、その結果を待つ
        const updatedUser = updateEditProfilePage(req, res, sessions[sessionID].userID);
        console.log(`updatedUser = ${updateUser}`);
        sessions[sessionID] = updatedUser;
        break;
      default:
        notFoundPage(req, res);
        break;
    }
  } else if (req.method === 'DELETE') {
    switch (req.url) {
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
        break;
    }
  }
});

// サーバー起動実行
server.listen(PORT, hostname, () => {
  console.log(`Server running at http://${hostname}:${PORT}`);
});

// ctrl + C でサーバシャットダウン時にdbを閉じる
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error(err.message);
    }
    console.log('Database connection closed.');
    process.exit(0);
  });
});
