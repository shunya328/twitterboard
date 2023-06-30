const { header, footer, beforeLoginHeader } = require('./pageUtils');
const { insertUser, findUserSignIn, findUserSignUp } = require('./databaseUtils');
const { generateSessionID } = require('./generateSessionID');

// セッションデータを保存するためのMapオブジェクト(グローバル変数)
const sessions = {};

// サインインの処理。POSTメソッド。
const postSignInPage = (req, res) => {

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

    //ユーザの検索
    findUserSignIn(parseBody.user_name, parseBody.user_password, (err, user) => {
      if (err) {
        console.error(err.message);
        return;
      }
      if (user && user.is_deleted === 0) {
        console.log(user);

        // ログイン成功時にセッションIDを生成
        const sessionID = generateSessionID(); //32桁のランダムな文字列を生成＆格納

        // セッションデータに必要な情報を保存
        // sessions.set(sessionID, { userID: user.id, name: user.name, email: user.email, profile: user.profile });
        sessions[sessionID] = {
          userID: user.id,
          name: user.name,
          email: user.email,
          profile: user.profile
        };
        console.log(`sessionsは、${sessions[sessionID].name}`);
        console.log(`userIDは、${user.id}`)

        // セッションIDをクライアントに送信(cookie)
        res.setHeader('Set-Cookie', `sessionID=${sessionID}; Path=/`);

        // ログイン成功のレスポンスを返す
        res.statusCode = 200;

        header(req, res);
        res.write('<h2>サインインに成功しました</h2>\n');
        res.write(`ようこそ！${user.name}さん！`)
      } else {
        beforeLoginHeader(req, res);
        res.write('<h2>サインインに失敗しました</h2>');
        if (user && user.is_deleted === 1) { res.write('ユーザは削除されています<br>'); }
        res.write('<a href="/sign_in">再度サインインする</a><br>');
        res.write('<a href="/sign_up">新規登録</a>');
      }
      footer(req, res);
      return;
    });
  });
}

// サインアップのPOSTメソッド
const postSignUpPage = (req, res, maxUserIdWordCount) => {
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

    if (parseBody.user_name && parseBody.user_email && parseBody.user_password) {
      // ユーザ名のバリデーション
      const userNameRegex = /^[a-zA-Z0-9]+$/; // 半角英数字のみを許可する正規表現
      if (!userNameRegex.test(parseBody.user_name) || parseBody.user_name.length > maxUserIdWordCount) {
        // ユーザ名が正規表現にマッチしない場合
        beforeLoginHeader(req, res);
        res.write('<h2>サインアップに失敗しました</h2>');
        res.write('<h5>ユーザ名は半角英数字のみを入力してください。また、ユーザ名は15文字を超えないようにしてください</h5>');
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
        res.write('<h2>サインアップに失敗しました</h2>');
        res.write('<h5>正しい形式のメールアドレスを入力してください</h5>');
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
        res.write('<h2>サインアップに失敗しました</h2>');
        res.write('<h5>正しい形式のパスワードを入力してください。半角英数字と一部の記号のみ許可されます。</h5>');
        res.write('<a href="/sign_in">サインイン</a><br>');
        res.write('<a href="/sign_up">新規登録</a>');
        footer(req, res);
        return;
      }

      //データベースに投稿を格納
      insertUser(parseBody.user_name, parseBody.user_email, parseBody.user_password, (err) => {
        if (err) {
          console.error(err.message);
          beforeLoginHeader(req, res);
          res.write('<h2>サインアップに失敗しました</h2>');
          res.write(`<h5>${err.message}</h5>`);
          res.write('<a href="/sign_in">サインイン</a><br>');
          res.write('<a href="/sign_up">新規登録</a>');
          footer(req, res);
          return;
        }
        //先ほどデータベースに格納したユーザの検索
        findUserSignUp(parseBody.user_name, parseBody.user_email, parseBody.user_password, (err, user) => {
          if (err) {
            console.error(err.message);
            return;
          }
          if (user) {
            console.log('user:', user);
            // サインアップ成功時にセッションIDを生成
            const sessionID = generateSessionID(); //32桁のランダムな文字列を生成＆格納

            // セッションデータに必要な情報を保存
            sessions[sessionID] = {
              userID: user.id,
              name: user.name,
              email: user.email,
              profile: user.profile
            };
            console.log(`sessions[sessionID].nameは、${sessions[sessionID].name}`);
            console.log(`userIDは、${user.id}`)

            // セッションIDをクライアントに送信(cookie)
            res.setHeader('Set-Cookie', `sessionID=${sessionID}; Path=/`);

            // ログイン成功のレスポンスを返す
            res.statusCode = 200;

            header(req, res);
            res.write('<h2>サインアップに成功しました</h2>\n');
            res.write(`ようこそ！${user.name}さん！`)
          } else {
            beforeLoginHeader(req, res);
            res.write('<h2>サインアップに失敗しました</h2>');
            res.write('<h5>ユーザ名やメールアドレスが重複しているかもしれません</h5>');
            res.write('<a href="/sign_in">サインイン</a><br>');
            res.write('<a href="/sign_up">新規登録</a>');
          }
          footer(req, res);
          return;
        });
      });
    }
  });
}

// ログアウトのPOSTメソッド
const postLogout = (req, res, sessions, sessionID) => {
  // セッションIDが存在する場合、セッションを削除
  if (sessionID && sessions[sessionID]) {
    delete sessions[sessionID];
  }

  // クッキーを削除
  res.setHeader('Set-Cookie', 'sessionID=; Path=/;');

  // サインインページにリダイレクト
  res.writeHead(302, { 'Location': '/sign_in' });
  res.end();
  return;
}

module.exports = {
  sessions,
  postSignInPage,
  postSignUpPage,
  postLogout
}