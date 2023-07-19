const http = require("http");
const url = require("url");
const {
  signUpPage,
  signInPage,
  topPage,
  myTimeLinePagenation,
  userIndexPage,
  showUserPagePagenation,
  postPage,
  showPost,
  myPage,
  editProfilePage,
  followingUserPage,
  followerUserPage,
  searchPage,
  searchUserResultPage,
  readImageFile,
  notFoundPage,
} = require("./pages");
const { postPostPage, updateEditProfilePage, postWithdrawalUser } = require("./postUtils");
const {
  getCookies,
  postSignInPage,
  postSignUpPage,
  postLogout,
} = require("./sessions");
const { searchSession, updateSession, deletePost, db } = require("./databaseUtils");
const { followingUser, unfollowUser } = require("./followUtils");
const path = require("path");

const hostname = "0.0.0.0";
const PORT = 3000;

// httpサーバの定義
const server = http.createServer((req, res) => {
  res.statusCode = 200; //通信成功のステータスコード
  res.setHeader("Content-Type", "text/html; charset=UTF-8"); //テキストを返す際、日本語を返すのでcharsetもセット・・・

  const cookieKey = "sessionID"; //クッキーに保存する際のキー
  const cookies = getCookies(req.headers.cookie); //クッキーの全てのキーペアを取得
  const sessionID = cookies[cookieKey] || null; //該当のプロパティの値を取得
  console.log(`現在のcookieは→ ${sessionID}`);
  console.log(req.url);

  // ここで、ユーザのクッキーに保存されているセッションIDを、sessionsテーブルと突合
  searchSession(sessionID, (err, sessionRecord) => {
    if (err) {
      console.error(err.message);
      return;
    }
    const currentSession = sessionRecord; //セッションの情報を格納

    const parsedUrl = url.parse(req.url, true); //URLを解析し、オブジェクトとして取得
    // 【セッションチェック】(サインインorサインアップページじゃないページに飛ぼうとしたとき。さらにセッションが無い時に)
    if (parsedUrl.pathname !== "/sign_in" && parsedUrl.pathname !== "/sign_up" && !currentSession) {
      // ログインしていない場合、サインインページにリダイレクト
      res.writeHead(302, { Location: "/sign_in" });
      res.end();
      return;
    }

    // 【セッションチェック】逆に、サインインしている状態であれば、サインイン・サインアップページに飛ばないようにする。
    if ((parsedUrl.pathname === "/sign_in" || parsedUrl.pathname === "/sign_up") && currentSession) {
      // トップページにリダイレクト
      res.writeHead(302, { Location: "/" });
      res.end();
      return;
    }

    // URLから取得された情報(pathモジュールを活用)
    const id = parsedUrl.pathname.split("/").pop(); //URLの一番後ろのIDを取得
    const secondID = parsedUrl.pathname.split("/")[parsedUrl.pathname.split("/").length - 2]; //URLの後ろから二番目のIDを取得
    const searchQueryKey = "keyword"; //検索機能における、クエリパラメータのキー
    const urlQueryParam = parsedUrl.query[searchQueryKey]; //URLのクエリパラメータ(valueのみ)を取得

    // 様々な制限。ここの数字を変えるだけで簡単に変更がかけられます
    const maxPostCount = 5; // １ページに表示させる最大投稿数（ページネーション）
    const maxPostWordCount = 140; //ひとつの投稿の文字数制限
    const maxUserIdWordCount = 15; //ユーザ名の文字数制限
    const fileSizeLimit = 1048576; //アップロードされる画像のファイルサイズを制限(バイト)

    //ルーティング
    if (req.method === "GET") {
      switch (
        req.url //リクエストされたurlが引数に入る
      ) {
        case "/": //TOPページ
          topPage(req, res); //トップページ用の関数を呼んでいる
          break;
        case `/my_timeline/${id}`: //ログインしている人のタイムライン
          myTimeLinePagenation(req, res, currentSession.user_id, id, maxPostCount); //最後の引数は、ひとつのページに表示する投稿上限数
          break;
        case "/sign_up": //サインアップページ
          signUpPage(req, res);
          break;
        case "/sign_in": //サインインページ
          signInPage(req, res);
          break;6
        case "/users": // ユーザ一覧ページ
          userIndexPage(req, res, currentSession.user_id);
          break;
        case `/users/${secondID}/${id}`: //任意のユーザの投稿だけ一覧で見れるページ
          showUserPagePagenation(req, res, currentSession.user_id, secondID, id, maxPostCount); //最後の引数は、ひとつのページに表示する投稿上限数
          break;
        case "/post": //投稿を行うページ
          postPage(req, res);
          break;
        case `/post/${id}`: // 任意の投稿の詳細画面（ここでリプライ表示）
          showPost(req, res, id, currentSession.user_id);
          break;
        case "/mypage": // マイページ
          myPage(req, res, currentSession.user_id);
          break;
        case "/mypage/edit_profile": // 自分のユーザプロフィール情報の編集ページ
          editProfilePage(req, res, currentSession);
          break;
        case "/following": //フォロー一覧
          followingUserPage(req, res, currentSession.user_id);
          break;
        case "/followed": //フォロワー一覧
          followerUserPage(req, res, currentSession.user_id);
          break;
        case "/search": //検索フォームのページ
          searchPage(req, res, searchQueryKey);
          break;
        case `/search/users?${searchQueryKey}=${urlQueryParam}`: //ユーザ検索をした結果のページ
          searchUserResultPage(req, res, currentSession.user_id, urlQueryParam);
          break;
        default:
          // 画像ファイルを読み込む処理
          if (req.url.startsWith("/public/")) {
            readImageFile(req, res);
          } else {
            notFoundPage(req, res);
          }
          break;
      }
    } else if (req.method === "POST") {
      switch (req.url) {
        case "/post": //投稿する
          postPostPage(req, res, currentSession.user_id, maxPostWordCount, fileSizeLimit);
          break;
        case `/delete/post/${id}`: //任意の投稿を削除する
          deletePost(req, res, id, currentSession.user_id);
          break;
        case "/sign_up": //サインアップをする
          postSignUpPage(req, res, maxUserIdWordCount, cookieKey);
          break;
        case "/sign_in": //サインインをする
          postSignInPage(req, res, cookieKey);
          break;
        case "/logout": //ログアウトをする
          postLogout(req, res, sessionID, cookieKey);
          break;
        case "/mypage/edit_profile": //自分のユーザ情報を変更する
          // updateEditProfilePageをPromiseで実行
          updateEditProfilePage(req, res, currentSession, maxUserIdWordCount, fileSizeLimit)
            .then((updateUser) => {
              if (updateUser) {
                console.log(`updatedUser = ${updateUser}`);
                //アップデートしたユーザの情報をセッションテーブルに投入
                updateSession(sessionID, updateUser, (err) => {
                  if (err) {
                    console.error(err);
                    return;
                  }
                  return;
                });
              }
            })
            .catch((error) => {
              // エラーハンドリング
              console.error(error);
            });
          break;
        case "/mypage/withdrawal": //退会する
          postWithdrawalUser(req, res, currentSession, sessionID);
          break;
        case `/following/${id}`: //任意のユーザをフォローする
          followingUser(req, res, currentSession.user_id, id);
          break;
        case `/unfollow/${id}`: //任意のユーザのフォローを解除する
          unfollowUser(req, res, currentSession.user_id, id);
          break;
        default:
          notFoundPage(req, res);
          break;
      }
    }
  });
});

// 例外処理によって、なにかエラーが起きたとしても最低限落ちないサーバーにします
process.on("uncaughtException", (err) => {
  console.log("！！！！！！！エラーが発生しました！！！！！！！でもサーバーは動き続けます・・・\n", err);
});

// サーバー起動実行
server.listen(PORT, hostname, () => {
  console.log(`Server running at http://${hostname}:${PORT}`);
});

// ctrl + C でサーバシャットダウン時にdbを閉じる
process.on("SIGINT", () => {
  db.close((err) => {
    if (err) {
      console.error(err.message);
    }
    console.log("Database connection closed.");
    process.exit(0);
  });
});
