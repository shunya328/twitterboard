const { header, footer } = require("./pageUtils");
const { insertPost, updateUser, withdrawalUser } = require("./databaseUtils");
const { postLogout } = require("./sessions");
const { extractBoundary, parseFormData } = require("./multipartFormDataParser");

// 投稿する！(POST)
const postPostPage = (req, res, currentUserID, maxPostWordCount, fileSizeLimit) => {
  //まずはPOSTで送られたデータ（リクエストボディ）を受け取る
  //dataイベントでPOSTされたデータがchunkに分けられてやってくるので、bodyに蓄積する
  let body = [];
  req
    .on("data", (chunk) => {
      body.push(chunk);
    })
    .on("end", () => {
      const queryString = require("querystring");
      const parseBody = queryString.parse(body);
      body = Buffer.concat(body).toString("binary");
      // フォームデータの解析//Buffer.concat()メソッドで複数のBufferオブジェクト(body)を結合し新たなBufferオブジェクトを生成。
      const contentType = req.headers["content-type"];
      const boundary = extractBoundary(contentType); // Content-Typeヘッダからマルチパートフォームデータの境界(boudary)を抽出する

      if (boundary) {
        const formData = parseFormData(body, boundary);
        // フォームデータの取得
        const { kakikomi, image, reply_to } = formData;
        const kakikomiToString = kakikomi ? Buffer.from(kakikomi, "binary").toString("utf-8") : ""; //ここで、バイナリデータを正しく文字列に変換(日本語に対応)
        // 投稿のXSS対策
        // const escapedKakikomi = kakikomiToString ? escapeHTML(kakikomiToString) : '';

        // 制限された最大文字数を超えた場合、DBに投入させません
        if (kakikomiToString.length > maxPostWordCount) {
          header(req, res);
          res.write(`<h2>投稿の文字数が${maxPostWordCount}字を超えています</h2>\n`);
          footer(req, res);
          return;
        }

        // 投稿された画像があり、かつその画像のサイズが指定された容量を超えた場合、サーバーに保存させないし、DBにも投入させません
        if (image && Buffer.byteLength(image) > fileSizeLimit) {
          header(req, res);
          res.write(`<h2>投稿した画像のファイルサイズが${fileSizeLimit}biteを超えています</h2>\n`);
          footer(req, res);
          return;
        }

        if (kakikomiToString || image) {
          //文字、もしくは画像の投稿がある場合、DB投入
          insertPost(kakikomiToString, image, reply_to, currentUserID)
            .then((imagePath) => {
              res.writeHead(302, { Location: "/my_timeline/1" }); //自分のタイムラインにリダイレクト
              res.end();
              return;
              //   footer(req, res);
            })
            .catch((err) => {
              header(req, res);
              console.error(err.message);
              res.write("<h2>エラーが発生しました</h2>\n");
              footer(req, res);
            });
        } else {
          //なんの投稿もない場合
          header(req, res);
          res.write("<h2>なにも投稿しませんでした</h2>\n");
          footer(req, res);
        }
      }
      return;
    });
};

//（UPDATEだが使ってるhttpメソッドはPOST）プロフィール編集実行！
const updateEditProfilePage = (req, res, currentUser, maxUserIdWordCount, fileSizeLimit) => {
  return new Promise((resolve, reject) => {
    //まずはPOSTで送られたデータを受け取る
    //dataイベントでPOSTされたデータがchunkに分けられてやってくるので、bodyに蓄積する
    let body = [];
    req
      .on("data", (chunk) => {
        body.push(chunk);
      })
      .on("end", () => {
        //パースする。ここでは、queryString.parse()メソッドを使って、文字列などを解析し、オブジェクトとして返します。
        const queryString = require("querystring");
        const parseBody = queryString.parse(body);
        body = Buffer.concat(body).toString("binary"); //Buffer.concat()メソッドで複数のBufferオブジェクト(body)を結合し新たなBufferオブジェクトを生成。

        // フォームデータの解析
        const contentType = req.headers["content-type"];
        const boundary = extractBoundary(contentType); // Content-Typeヘッダからマルチパートフォームデータの境界(boudary)を抽出する

        if (boundary) {
          const formData = parseFormData(body, boundary);

          // フォームデータの取得
          const { user_name, user_email, user_password, user_profile, user_image } = formData;
          const userNameToString = user_name ? Buffer.from(user_name, "binary").toString("utf-8") : null; //ここで、バイナリデータを正しく文字列に変換(日本語に対応)
          const userEmailToString = user_email ? Buffer.from(user_email, "binary").toString("utf-8") : null;
          const userPasswordToString = user_password ? Buffer.from(user_password, "binary").toString("utf-8") : null;
          const userProfileToString = user_profile ? Buffer.from(user_profile, "binary").toString("utf-8") : null;

          if (!user_name && !user_email && !user_password && !user_profile && !user_image) {
            header(req, res);
            res.write("特になにも更新されませんでした");
            resolve(null); //特になにも入力されなかったらnullをresolve()の引数として渡す
            footer(req, res);
            return;
          }

          // ユーザ名のバリデーション
          const userNameRegex = /^[a-zA-Z0-9]+$/; // 半角英数字のみを許可する正規表現
          if (
            (!userNameRegex.test(userNameToString) && userNameToString) ||
            userNameToString.length > maxUserIdWordCount
          ) {
            // ユーザ名が正規表現にマッチしない場合
            header(req, res);
            res.write("<h2>ユーザ情報の更新に失敗しました</h2>");
            res.write(
              `<h5>ユーザ名は半角英数字のみを入力してください。また、ユーザ名は${maxUserIdWordCount}文字以下にしてください。</h5>`
            );
            footer(req, res);
            return;
          }

          // メールアドレスのバリデーション
          const emailRegex = /^[a-zA-Z0-9_.+-]+@([a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.)+[a-zA-Z]{2,}$/; // メールアドレスの正規表現
          if (!emailRegex.test(userEmailToString) && userEmailToString) {
            // メールアドレスが正規表現にマッチしない場合
            header(req, res);
            res.write("<h2>ユーザ情報の更新に失敗しました</h2>");
            res.write("<h5>正しい形式のメールアドレスを入力してください</h5>");
            footer(req, res);
            return;
          }

          // パスワードのバリデーション
          const passwordRegex = /^[\w@!%*$#?&]+$/;
          if (!passwordRegex.test(userPasswordToString) && userPasswordToString) {
            // パスワードが正規表現にマッチしない場合
            header(req, res);
            res.write("<h2>ユーザ情報の更新に失敗しました</h2>");
            res.write("<h5>正しい形式のパスワードを入力してください</h5>");
            footer(req, res);
            return;
          }

          // 投稿された画像があり、かつその画像のサイズが指定された容量を超えた場合、サーバーに保存させないし、DBにも投入させません
          if (user_image && Buffer.byteLength(user_image) > fileSizeLimit) {
            header(req, res);
            res.write(`<h2>投稿した画像のファイルサイズが${fileSizeLimit}biteを超えています</h2>\n`);
            footer(req, res);
            return;
          }

          console.log("updateUserの直前です");
          // 現在ログインしているユーザの情報をアップデート
          updateUser(
            currentUser.user_id,
            userNameToString,
            userEmailToString,
            userPasswordToString,
            userProfileToString,
            user_image,
            (err) => {
              if (err) {
                header(req, res);
                console.error(err.message);
                res.write("<h2>プロフィールの更新に失敗しました</h2><br>");
                res.write(`<h4>${err.message}</h4>`);
                reject(err); // エラー時にreject
                footer(req, res);
                return;
              }

              //新しいセッション情報
              const newProfile = {
                user_id: currentUser.user_id,
                name: userNameToString ? userNameToString : currentUser.name,
                email: userEmailToString ? userEmailToString : currentUser.email,
                profile: userProfileToString ? userProfileToString : currentUser.profile,
              };

              resolve(newProfile); // サーバ側のセッション情報を返り値にresolveの引数に渡す
              res.writeHead(302, { Location: "/mypage" });
              res.end();
              return;
              //   footer(req, res);
            }
          );
        }
      });
  });
};

// （POST）ユーザを論理削除する関数
const postWithdrawalUser = async (req, res, currentSession, sessionID) => {
  await withdrawalUser(currentSession.user_id);
  console.log(`userID=${currentSession.user_id}のユーザが削除されました`);
  postLogout(req, res, sessionID);
};

module.exports = {
  postPostPage,
  updateEditProfilePage,
  postWithdrawalUser,
};
