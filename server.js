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
const { getCookies, postSignInPage, postSignUpPage, postLogout } = require("./sessions");
const { searchSession, updateSession, deletePost, db } = require("./databaseUtils");
const { followingUser, unfollowUser } = require("./followUtils");
const { routing } = require("./routingFrame");
const path = require("path");

const hostname = "127.0.0.1";
const PORT = 3000;

// httpサーバの定義
const server = http.createServer(async (req, res) => {
  res.statusCode = 200; //通信成功のステータスコー
  res.setHeader("Content-Type", "text/html; charset=UTF-8"); //テキストを返す際、日本語を返すのでcharsetもセット・・・

  const cookieKey = "sessionID"; //クッキーに保存する際のキー
  const cookies = getCookies(req.headers.cookie); //クッキーの全てのキーペアを取得
  const sessionID = cookies[cookieKey] || null; //該当のプロパティの値を取得
  let isUrlMatch = false; // urlがルーティングでマッチしているかどうか判定
  console.log(`現在のcookieは→ ${sessionID}`);

  // ここで、ユーザのクッキーに保存されているセッションIDを、sessionsテーブルと突合
  const currentSession = await searchSession(sessionID);

  const parsedUrl = url.parse(req.url, true); //URLを解析し、オブジェクトとして取得
  // 【セッションチェック】(サインインorサインアップページじゃないページに飛ぼうとしたとき。さらにセッションが無い時に)
  if (parsedUrl.pathname !== "/sign_in" && parsedUrl.pathname !== "/sign_up" && !currentSession) {
    // ログインしていない場合、サインインページにリダイレクト
    console.log('ログインページにリダイレクト')
    res.writeHead(302, { Location: "/sign_in" });
    res.end();
    return;
  }

  // 【セッションチェック】逆に、サインインしている状態であれば、サインイン・サインアップページに飛ばないようにする。
  if ((parsedUrl.pathname === "/sign_in" || parsedUrl.pathname === "/sign_up") && currentSession) {
    // トップページにリダイレクト
    console.log('トップページにリダイレクト')
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

  // ルーティング（フレームワーク導入）。コールバック関数は最大2つまで呼べる(pathParam, queryParam)
  // GETメソッドのルーティング
  routing("GET", "/", req, () => {
    topPage(req, res); //トップページ用の関数を呼んでいる
    isUrlMatch = true;
  });
  routing("GET", "/my_timeline/:id", req, (pathParam) => {
    myTimeLinePagenation(req, res, currentSession.user_id, pathParam.id, maxPostCount); //最後の引数は、ひとつのページに表示する投稿上限数
    isUrlMatch = true;
  });
  routing("GET", "/sign_up", req, () => {
    signUpPage(req, res); //サインアップページ
    isUrlMatch = true;
  });
  routing("GET", "/sign_in", req, () => {
    signInPage(req, res); //サインインページ
    isUrlMatch = true;
  });
  routing("GET", "/users", req, () => {
    userIndexPage(req, res, currentSession.user_id); // ユーザ一覧ページ
    isUrlMatch = true;
  });
  routing("GET", "/users/:secondId/:id", req, (pathParam) => {
    //任意のユーザの投稿だけ一覧で見れるページ
    showUserPagePagenation(req, res, currentSession.user_id, pathParam.secondId, pathParam.id, maxPostCount); //最後の引数は、ひとつのページに表示する投稿上限数
    isUrlMatch = true;
  });
  routing("GET", "/post", req, () => {
    postPage(req, res); //投稿を行うページ
    isUrlMatch = true;
  });
  routing("GET", "/post/:id", req, (pathParam) => {
    showPost(req, res, pathParam.id, currentSession.user_id); // 任意の投稿の詳細画面（ここでリプライ表示）
    isUrlMatch = true;
  });
  routing("GET", "/mypage", req, () => {
    myPage(req, res, currentSession.user_id); //マイページ
    isUrlMatch = true;
  });
  routing("GET", "/mypage/edit_profile", req, () => {
    editProfilePage(req, res, currentSession); // 自分のユーザプロフィール情報の編集ページ
    isUrlMatch = true;
  });
  routing("GET", "/following", req, () => {
    followingUserPage(req, res, currentSession.user_id); //フォロー一覧
    isUrlMatch = true;
  });
  routing("GET", "/followed", req, () => {
    followerUserPage(req, res, currentSession.user_id); //フォロワー一覧
    isUrlMatch = true;
  });
  routing("GET", "/search", req, () => {
    searchPage(req, res, searchQueryKey); //検索フォームのページ
    isUrlMatch = true;
  });
  routing("GET", "/search/users", req, (pathParam, queryParam) => {
    searchUserResultPage(req, res, currentSession.user_id, queryParam[searchQueryKey]); //ユーザ検索をした結果のページ
    isUrlMatch = true;
  });
  // GETメソッドでどのルーティングにも当たらなかった場合、notFoundページを表示
  if (req.method === "GET") {
    if (req.url.startsWith("/public/")) {
      readImageFile(req, res);
    } else if (isUrlMatch === false) {
      notFoundPage(req, res);
    }
  }

  // POSTメソッドのルーティング
  routing("POST", "/post", req, () => {
    postPostPage(req, res, currentSession.user_id, maxPostWordCount, fileSizeLimit); //投稿する
    isUrlMatch = true;
  });
  routing("POST", "/delete/post/:id", req, (pathParam) => {
    deletePost(req, res, pathParam.id, currentSession.user_id); //任意の投稿を削除する
    isUrlMatch = true;
  });
  routing("POST", "/sign_up", req, () => {
    postSignUpPage(req, res, maxUserIdWordCount, cookieKey); //サインアップをする
    isUrlMatch = true;
  });
  routing("POST", "/sign_in", req, () => {
    postSignInPage(req, res, cookieKey); //サインインをする
    isUrlMatch = true;
  });
  routing("POST", "/logout", req, () => {
    postLogout(req, res, sessionID, cookieKey); //ログアウトをする
    isUrlMatch = true;
  });
  routing("POST", "/mypage/edit_profile", req, () => {
    // updateEditProfilePageをPromiseで実行
    updateEditProfilePage(req, res, currentSession, maxUserIdWordCount, fileSizeLimit)
      .then(async (updateUser) => {
        if (updateUser) {
          console.log(`updatedUser = ${updateUser}`);
          await updateSession(sessionID,updateUser);
        }
      })
      .catch((error) => {
        // エラーハンドリング
        console.error(error);
      });
    isUrlMatch = true;
  });
  routing("POST", "/mypage/withdrawal", req, () => {
    postWithdrawalUser(req, res, currentSession, sessionID); //退会する
    isUrlMatch = true;
  });
  routing("POST", "/following/:id", req, (pathParam) => {
    followingUser(req, res, currentSession.user_id, pathParam.id); //任意のユーザをフォローする
    isUrlMatch = true;
  });
  routing("POST", "/unfollow/:id", req, (pathParam) => {
    unfollowUser(req, res, currentSession.user_id, pathParam.id); //任意のユーザのフォローを解除する
    isUrlMatch = true;
  });
  // POSTメソッドでどのルーティングにも当たらなかった場合、notFoundページを表示
  if (req.method === "POST" && isUrlMatch === false) {
    notFoundPage(req, res);
  }
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
