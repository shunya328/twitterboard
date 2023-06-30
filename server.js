const http = require('http');
const { signUpPage, signInPage, topPage, myTimeLinePagenation, userIndexPage, showUserPagePagenation, postPage, showPost, myPage, editProfilePage, followingUserPage, followerUserPage, searchPage, searchUserResultPage, readImageFile, notFoundPage } = require('./pages');
const { postPostPage, updateEditProfilePage, postWithdrawalUser } = require('./postUtils');
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

  // 【セッションチェック】(サインインorサインアップページじゃないページに飛ぼうとしたとき。さらにセッションが無い時に)
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

  // URLから取得された情報
  const id = req.url.split('/').pop(); //URLの一番後ろのIDを取得
  const secondID = req.url.split('/')[req.url.split('/').length - 2]; //URLの後ろから二番目のIDを取得
  const urlQueryParam = req.url.split('?').pop(); //URLのクエリパラメータを取得

  // 様々な制限。ここの数字を変えるだけで簡単に変更がかけられます
  const maxPostCount = 5; // １ページに表示させる最大投稿数（ページネーション）
  const maxPostWordCount = 140; //ひとつの投稿の文字数制限
  const maxUserIdWordCount = 15; //ユーザ名の文字数制限
  const fileSizeLimit = 1048576; //アップロードされる画像のファイルサイズを制限(バイト)

  //ルーティング
  if (req.method === 'GET') {
    switch (req.url) { //リクエストされたurlが引数に入る
      case '/': //TOPページ
        topPage(req, res, sessions[sessionID].userID); //トップページ用の関数を呼んでいる
        break;
      case `/my_timeline/${id}`: //ログインしている人のタイムライン
        myTimeLinePagenation(req, res, sessions[sessionID].userID, id, maxPostCount); //最後の引数は、ひとつのページに表示する投稿上限数
        break;
      case '/sign_up': //サインアップページ
        signUpPage(req, res);
        break;
      case '/sign_in': //サインインページ
        signInPage(req, res);
        break;
      case '/users': // ユーザ一覧ページ
        userIndexPage(req, res, sessions[sessionID].userID);
        break;
      case `/users/${secondID}/${id}`: //任意のユーザの投稿だけ一覧で見れるページ
        showUserPagePagenation(req, res, sessions[sessionID].userID, secondID, id, maxPostCount); //最後の引数は、ひとつのページに表示する投稿上限数
        break;
      case '/post': //投稿を行うページ
        postPage(req, res);
        break;
      case `/post/${id}`: // 任意の投稿の詳細画面（ここでリプライ表示）
        showPost(req, res, id, sessions[sessionID].userID);
        break;
      case '/mypage': // マイページ
        myPage(req, res, sessions[sessionID].userID);
        break;
      case '/mypage/edit_profile': // 自分のユーザプロフィール情報の編集ページ
        editProfilePage(req, res, sessions[sessionID]);
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
        searchUserResultPage(req, res, sessions[sessionID].userID, urlQueryParam);
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
      case '/post': //投稿する
        postPostPage(req, res, sessions[sessionID].userID, maxPostWordCount, fileSizeLimit);
        break;
      case `/delete/post/${id}`: //任意の投稿を削除する
        deletePost(req, res, id);
        break;
      case '/sign_up': //サインアップをする
        postSignUpPage(req, res, maxUserIdWordCount);
        break;
      case '/sign_in': //サインインをする
        postSignInPage(req, res);
        break;
      case '/logout': //ログアウトをする
        postLogout(req, res, sessions, sessionID);
        break;
      case '/mypage/edit_profile': //自分のユーザ情報を変更する
        // updateEditProfilePageをPromiseで実行
        updateEditProfilePage(req, res, sessions[sessionID], maxUserIdWordCount)
          .then((updateUser) => {
            if (updateUser) {
              console.log(`updatedUser = ${updateUser}`);
              sessions[sessionID] = updateUser; //アップデートしたユーザの情報をセッションに投入
            }
          }).catch((error) => {
            // エラーハンドリング
            console.error(error);
          });
        break;
      case '/mypage/withdrawal': //退会する
        postWithdrawalUser(req, res, sessions, sessionID);
        break;
      case `/following/${id}`: //任意のユーザをフォローする
        followingUser(req, res, sessions[sessionID].userID, id);
        break;
      case `/unfollow/${id}`: //任意のユーザのフォローを解除する
        unfollowUser(req, res, sessions[sessionID].userID, id);
        break;
      default:
        notFoundPage(req, res);
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
