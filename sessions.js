const { header, footer, beforeLoginHeader } = require("./pageUtils");
const { setSession, deleteSession, insertUser, findUserSignIn, findUserSignUp } = require("./databaseUtils");
const { getSessionId } = require("./getRandomString");

// クッキーを取得する関数
const getCookies = (cookieString) => {
  const cookies = {};

  if (cookieString) {
    const cookiePairs = cookieString.split(";"); //ここで、クッキーのキーペアたちを分離
    cookiePairs.forEach((pair) => {
      const [key, value] = pair.trim().split("="); //余分な空白を排除し、'='で分離して分割代入
      cookies[key] = value;
    });
  }
  return cookies;
};

// サインインの処理。POSTメソッド。
const postSignInPage = (req, res, cookieKey) => {
  //まずはPOSTで送られたデータを受け取る
  //dataイベントでPOSTされたデータがchunkに分けられてやってくるので、bodyに蓄積する
  let body = [];
  req
    .on("data", (chunk) => {
      body.push(chunk);
    })
    .on("end", async () => {
      body = Buffer.concat(body).toString(); //Buffer.concat()メソッドで複数のBufferオブジェクト(body)を結合し新たなBufferオブジェクトを生成。それをtoString()メソッドで文字列に変換しさらにbodyに格納
      //パースする。ここでは、queryString.parse()メソッドを使って、文字列などを解析し、オブジェクトとして返します。
      const queryString = require("querystring");
      const parseBody = queryString.parse(body);

      //ユーザの検索
      const { user, isVerified } = await findUserSignIn(parseBody.user_name, parseBody.user_password);
      if (user && user.is_deleted === 0 && isVerified) {
        console.log(user);

        // ログイン成功時にセッションIDを生成
        const sessionID = getSessionId(); //32桁のランダムな文字列を生成＆格納

        // sessionsテーブルにセッション情報を格納
        await setSession(sessionID, user.id, user.name, user.email, user.profile, user.profile_image);
        console.log("無事セッション情報がsessionsテーブルに保存されました");
        console.log(`userIDは、${user.id}`);

        // セッションIDをクライアントに送信(cookie)
        res.setHeader("Set-Cookie", `${cookieKey}=${sessionID}; Path=/`);

        // ログイン成功のレスポンスを返す
        res.statusCode = 200;

        header(req, res);
        res.write("<h2>サインインに成功しました</h2>\n");
        res.write(`ようこそ！${user.name}さん！`);
      } else {
        beforeLoginHeader(req, res);
        res.write("<h2>サインインに失敗しました</h2>");
        if (user && user.is_deleted === 1 && isVerified) {
          res.write("ユーザは削除されています<br>");
        }
        res.write('<a href="/sign_in">再度サインインする</a><br>');
        res.write('<a href="/sign_up">新規登録</a>');
      }
      footer(req, res);
      return;
    });
};

// サインアップのPOSTメソッド
const postSignUpPage = (req, res, maxUserIdWordCount, cookieKey) => {
  //まずはPOSTで送られたデータを受け取る
  //dataイベントでPOSTされたデータがchunkに分けられてやってくるので、bodyに蓄積する
  let body = [];
  req
    .on("data", (chunk) => {
      body.push(chunk);
    })
    .on("end", () => {
      body = Buffer.concat(body).toString(); //Buffer.concat()メソッドで複数のBufferオブジェクト(body)を結合し新たなBufferオブジェクトを生成。それをtoString()メソッドで文字列に変換しさらにbodyに格納
      //パースする。ここでは、queryString.parse()メソッドを使って、文字列などを解析し、オブジェクトとして返します。
      const queryString = require("querystring");
      const parseBody = queryString.parse(body);

      if (parseBody.user_name && parseBody.user_email && parseBody.user_password) {
        // ユーザ名のバリデーション
        const userNameRegex = /^[a-zA-Z0-9]+$/; // 半角英数字のみを許可する正規表現
        if (!userNameRegex.test(parseBody.user_name) || parseBody.user_name.length > maxUserIdWordCount) {
          // ユーザ名が正規表現にマッチしない場合
          beforeLoginHeader(req, res);
          res.write("<h2>サインアップに失敗しました</h2>");
          res.write(
            "<h5>ユーザ名は半角英数字のみを入力してください。また、ユーザ名は15文字を超えないようにしてください</h5>"
          );
          res.write('<a href="/sign_in">サインイン</a><br>');
          res.write('<a href="/sign_up">新規登録</a>');
          footer(req, res);
          return;
        }

        // メールアドレスのバリデーション
        const emailRegex = /^[a-zA-Z0-9_.+-]+@([a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.)+[a-zA-Z]{2,}$/; // メールアドレスの正規表現
        if (!emailRegex.test(parseBody.user_email)) {
          // メールアドレスが正規表現にマッチしない場合
          beforeLoginHeader(req, res);
          res.write("<h2>サインアップに失敗しました</h2>");
          res.write("<h5>正しい形式のメールアドレスを入力してください</h5>");
          res.write('<a href="/sign_in">サインイン</a><br>');
          res.write('<a href="/sign_up">新規登録</a>');
          footer(req, res);
          return;
        }

        // パスワードのバリデーション
        const passwordRegex = /^[\w@!%*$#?&]+$/;
        if (!passwordRegex.test(parseBody.user_password)) {
          // パスワードが正規表現にマッチしない場合
          beforeLoginHeader(req, res);
          res.write("<h2>サインアップに失敗しました</h2>");
          res.write("<h5>正しい形式のパスワードを入力してください。半角英数字と一部の記号のみ許可されます。</h5>");
          res.write('<a href="/sign_in">サインイン</a><br>');
          res.write('<a href="/sign_up">新規登録</a>');
          footer(req, res);
          return;
        }

        //データベースに投稿を格納
        insertUser(parseBody.user_name, parseBody.user_email, parseBody.user_password, async (err) => {
          if (err) {
            console.error(err.message);
            beforeLoginHeader(req, res);
            res.write("<h2>サインアップに失敗しました</h2>");
            res.write(`<h5>${err.message}</h5>`);
            res.write('<a href="/sign_in">サインイン</a><br>');
            res.write('<a href="/sign_up">新規登録</a>');
            footer(req, res);
            return;
          }
          //先ほどデータベースに格納したユーザの検索
          const user = await findUserSignUp(parseBody.user_name, parseBody.user_email);
          if (user) {
            console.log("user:", user);
            // サインアップ成功時にセッションIDを生成
            const sessionID = getSessionId(); //32桁のランダムな文字列を生成＆格納

            // セッションテーブルに必要情報を保存
            setSession(sessionID, user.id, user.name, user.email, user.profile, user.profile_image, (err) => {
              if (err) {
                console.error(err.message);
                return;
              }
              console.log("無事セッション情報がsessionsテーブルに保存されました");
            });

            // console.log(`sessions[sessionID].nameは、${sessions[sessionID].name}`);
            console.log(`userIDは、${user.id}`);

            // セッションIDをクライアントに送信(cookie)
            res.setHeader("Set-Cookie", `${cookieKey}=${sessionID}; Path=/`);

            // ログイン成功のレスポンスを返す
            res.statusCode = 200;

            header(req, res);
            res.write("<h2>サインアップに成功しました</h2>\n");
            res.write(`ようこそ！${user.name}さん！`);
          } else {
            beforeLoginHeader(req, res);
            res.write("<h2>サインアップに失敗しました</h2>");
            res.write("<h5>ユーザ名やメールアドレスが重複しているかもしれません</h5>");
            res.write('<a href="/sign_in">サインイン</a><br>');
            res.write('<a href="/sign_up">新規登録</a>');
          }
          footer(req, res);
          return;
        });
      }
    });
};

// ログアウトのPOSTメソッド
const postLogout = async (req, res, sessionID, cookieKey) => {
  // セッションIDでsessionsテーブルと突合し、該当のレコードを削除
  await deleteSession(sessionID);

  // クッキーを削除
  res.setHeader("Set-Cookie", `${cookieKey}=; Path=/;`);

  // サインインページにリダイレクト
  res.writeHead(302, { Location: "/sign_in" });
  res.end();
  return;
};

module.exports = {
  getCookies,
  postSignInPage,
  postSignUpPage,
  postLogout,
};
