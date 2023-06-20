const { header, footer, beforeLoginHeader, beforeLoginFooter } = require('./pageUtils');
const { getAllPosts, insertPost, deletePost, insertUser, findUser } = require('./databaseUtils');
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
    findUser(parseBody.user_name, parseBody.user_password, (err, user) => {
      if (err) {
        console.error(err.message);
        return;
      }
      if (user) {
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
        res.write('<h2>サインアップが成功しました</h2>\n');
        res.write(`ようこそ！${user.name}さん！`)
      } else {
        beforeLoginHeader(req, res);
        res.write('<h2>サインインに失敗しました</h2>');
        res.write('<a href="/sign_in">再度サインインする</a><br>');
        res.write('<a href="/sign_up">新規登録</a>');
      }
      footer(req, res);
      return;
    });
  });
}


// サインアップのPOSTメソッド
const postSignUpPage = (req, res) => {
  header(req, res);
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

    if (parseBody.user_name) {
      //データベースに投稿を格納
      insertUser(parseBody.user_name, parseBody.user_email, parseBody.user_password, (err) => {
        if (err) {
          console.error(err.message);
          return;
        }
      })
      res.write('<h2>サインアップが完了しました</h2>\n');
      res.write(`ユーザ名: ${parseBody.user_name}, メールアドレス: ${parseBody.user_email}`);
    }
    footer(req, res);
    return;
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