const http = require('http');
const { signUpPage, signInPage, topPage, myTimeLinePagenation, userIndexPage,showUserPagePagenation, postPage, showPost, myPage, editProfilePage, followingUserPage, followerUserPage, searchPage, searchUserResultPage, readImageFile, notFoundPage } = require('./pages');
const {postPostPage, updateEditProfilePage, postWithdrawalUser} = require('./postUtils');
const { sessions, postSignInPage, postSignUpPage, postLogout } = require('./sessions');
const { deletePost, db } = require('./databaseUtils');
const { followingUser, unfollowUser } = require('./followUtils');

const hostname = '0.0.0.0';
const PORT = 3000;

// httpサーバの定義
const server = http.createServer((req, res) => {
  res.statusCode = 200; //通信成功のステータスコード
  res.setHeader('Content-Type', 'text/html; charset=UTF-8'); //テキストを返す際、日本語を返すのでcharsetもセット・・・

  // セッションIDの取得
  const sessionID = req.headers.cookie ? req.headers.cookie.split('=')[1] : null
  console.log(`現在のcookieは、             →${sessionID}`);
  console.log(`現在のsessions[sessionID]は、→${sessions[sessionID]}`);

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
  const secondID = req.url.split('/')[req.url.split('/').length - 2]; //URLの後ろから二番目のIDを取得
  const urlQueryParam = req.url.split('?').pop(); //URLのクエリパラメータを取得

  //ルーティング
  if (req.method === 'GET') {
    switch (req.url) { //リクエストされたurlが引数に入る
      case '/':
        topPage(req, res, sessions[sessionID].userID); //トップページ用の関数を呼んでいる
        break;
      case `/my_timeline/${id}`:
        myTimeLinePagenation(req, res, sessions[sessionID].userID, id, 5); //最後の引数は、ひとつのページに表示する投稿数
        break;
      case '/sign_up':
        signUpPage(req, res);
        break;
      case '/sign_in':
        signInPage(req, res);
        break;
      case '/users':
        userIndexPage(req, res, sessions[sessionID].userID);
        break;
      case `/users/${secondID}/${id}`:
        showUserPagePagenation(req, res, secondID, id, 5);
        break;
      case '/post':
        postPage(req, res);
        break;
      case `/post/${id}`: // 投稿詳細画面（ここでツリー表示）
        showPost(req, res, id, sessions[sessionID].userID);
        break;
      case '/mypage':
        myPage(req, res, sessions[sessionID].userID);
        break;
      case '/mypage/edit_profile':
        editProfilePage(req, res);
        break;
      case '/following': //フォロー一覧
        followingUserPage(req, res, sessions[sessionID].userID);
        break;
      case '/followed': //フォロワー一覧
        followerUserPage(req, res, sessions[sessionID].userID);
        break;
      case '/search': //検索フォームのページ
        searchPage(req, res);
        break;
      case `/search/users?${urlQueryParam}`: //ユーザ検索をした結果のページ
        searchUserResultPage(req, res, urlQueryParam);
        break;
      default:
        // 画像ファイルを読み込む処理
        if (req.url.startsWith('/public/')) {
          readImageFile(req, res);
        } else {
          notFoundPage(req, res);
        }
        break;
    }
  } else if (req.method === 'POST') {
    switch (req.url) {
      case '/post':
        postPostPage(req, res, sessions[sessionID].userID);
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
        // updateEditProfilePageをPromiseで実行
        updateEditProfilePage(req, res, sessions[sessionID])
          .then((updateUser) => {
            if (updateUser) {
              console.log(`updatedUser = ${updateUser}`);
              sessions[sessionID] = updateUser;
            }
          }).catch((error) => {
            // エラーハンドリング
            console.error(error);
          });
        break;
      case '/mypage/withdrawal':
        postWithdrawalUser(req, res, sessions, sessionID);
        console.log('sessionIDは、', sessionID);
        console.log('sessionsは、', sessions[sessionID].userID);
        break;
      case `/following/${id}`:
        followingUser(req, res, sessions[sessionID].userID, id);
        break;
      case `/unfollow/${id}`:
        unfollowUser(req, res, sessions[sessionID].userID, id);
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
