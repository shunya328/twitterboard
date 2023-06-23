const fs = require('fs');
const { header, footer, beforeLoginHeader, beforeLoginFooter } = require('./pageUtils');
const { getAllPosts, insertPost, deletePost, insertUser, findUser, updateUser } = require('./databaseUtils');
const { generateSessionID } = require('./generateSessionID');

// サインアップページ
const signUpPage = (req, res) => {
  beforeLoginHeader(req, res);

  res.write('<h2>サインアップ</h2>');
  res.write('<form action="/sign_up" method="post">')
  res.write('<input type="text" name="user_name" placeholder="user_name" required><br>');
  res.write('<input type="email" name="user_email" placeholder="e-mail" required><br>');
  res.write('<input type="password" name="user_password" placeholder="password" required><br>');
  res.write('<input type="submit" value="サインアップ">');
  res.write('</form>')
  res.write('<a href="/sign_in">サインインする</a><br>');

  beforeLoginFooter(req, res);
  return;
}

// サインインページ
const signInPage = (req, res) => {
  beforeLoginHeader(req, res);

  res.write('<h2>サインイン</h2>');
  res.write('<form action="/sign_in" method="post">')
  res.write('<input type="text" name="user_name" placeholder="user_name" required><br>');
  res.write('<input type="password" name="user_password" placeholder="password" required><br>');
  res.write('<input type="submit" value="サインイン">');
  res.write('</form>')
  res.write('<a href="/sign_up">新規登録</a>');

  beforeLoginFooter(req, res);
  return;
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
      res.write('<li>');
      if (row.is_deleted === 0) {
        res.write(`<a href="/post/${row.id}">${row.content}</a>`);
        res.write('<button class="delete-btn-' + row.id + '">削除</button>');
      } else {
        res.write('投稿は削除されました')
      }
      res.write('</li>\n');
    }
    res.write('</ul>');

    // 削除ボタンのクリックイベントリスナーを設定
    res.write('<script>');
    res.write('document.addEventListener("DOMContentLoaded", () => {');
    res.write('  const deleteButtons = document.querySelectorAll("[class^=\'delete-btn-\']");');
    res.write('  deleteButtons.forEach((button) => {');
    res.write('    button.addEventListener("click", (event) => {');
    res.write('      const id = event.target.className.split(\'delete-btn-\')[1];');
    res.write('      console.log("削除ボタンのID:", id);');
    res.write('      fetch(`/posts/${id}`, { method: "DELETE" })');
    res.write('        .then((response) => {');
    res.write('          if (response.status === 200) {');
    res.write('            console.log("投稿を削除しました");');
    res.write('            window.location.href = "/";');
    res.write('          } else {');
    res.write('            console.error("削除エラー:", response.statusText);');
    res.write('          }');
    res.write('        })');
    res.write('        .catch((error) => {');
    res.write('          console.error("削除エラー:", error);');
    res.write('        });');
    res.write('    });');
    res.write('  });');
    res.write('});');
    res.write('</script>');

    footer(req, res);
    return;
  })
}

// 投稿ページ(GET)
const postPage = (req, res, data) => {
  header(req, res);

  res.write('<h2>投稿ページです</h2>\n');
  res.write(`<form action="/post" method="post" enctype="multipart/form-data">
  <textarea name="kakikomi" style="width:80%;height:100px"></textarea><br>
  <a>画像を投稿：</a><input type="file" name="image" accept="image/*" /><br>
  <input type="submit" value="投稿" />
  </form>`);

  footer(req, res);
  return;
}

// 投稿ページ(POST)
const postPostPage = (req, res, data) => {

  function extractBoundary(contentType) {
    console.log(req.headers['content-type']);
    const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
    return boundaryMatch && (boundaryMatch[1] || boundaryMatch[2]);
  }

  function parseFormData(body, boundary) {
    const formData = {};
    const parts = body.split(`--${boundary}`);

    // 最初と最後のパートは境界線のみのデータなので無視する
    for (let i = 1; i < parts.length - 1; i++) {
      const part = parts[i].trim();

      // パートのヘッダーとコンテンツを分割する
      const [header, content] = part.split('\r\n\r\n');
      const nameMatch = header.match(/name="([^"]+)"/);

      if (nameMatch) {
        const fieldName = nameMatch[1];
        // formData[fieldName] = Buffer.from(content, 'binary').toString('utf-8');
        formData[fieldName] = content;
      }
    }
    return formData;
  }

  header(req, res);
  //まずはPOSTで送られたデータを受け取る
  //dataイベントでPOSTされたデータがchunkに分けられてやってくるので、bodyに蓄積する
  let body = [];
  req.on('data', (chunk) => {
    body.push(chunk);
  }).on('end', () => {
    const queryString = require('querystring');
    const parseBody = queryString.parse(body);
    body = Buffer.concat(body).toString('binary'); //Buffer.concat()メソッドで複数のBufferオブジェクト(body)を結合し新たなBufferオブジェクトを生成。
    // body = Buffer.concat(body,'binary').toString('utf-8'); //Buffer.concat()メソッドで複数のBufferオブジェクト(body)を結合し新たなBufferオブジェクトを生成。

    // フォームデータの解析
    const contentType = req.headers['content-type'];
    const boundary = extractBoundary(contentType); // Content-Typeヘッダからマルチパートフォームデータの境界(boudary)を抽出する

    if (boundary) {
      const formData = parseFormData(body, boundary);

      // フォームデータの取得
      const { kakikomi, image } = formData;
      const kakikomiToString = Buffer.from(kakikomi, 'binary').toString('utf-8') //ここで、バイナリデータを正しく文字列に変換(日本語に対応)

      if (kakikomiToString || image) {
        insertPost(kakikomiToString, image)
          .then((imagePath) => {
            res.write('<h2>ツイート（文字）投稿しました</h2>\n');
            res.write(`投稿内容: ${decodeURIComponent(kakikomiToString)}`);
            res.write('<h2>ツイート（画像）投稿しました</h2>\n');
            res.write(`画像パス: ${imagePath}`);
            footer(req, res);
          })
          .catch((err) => {
            console.error(err.message);
            res.write('<h2>エラーが発生しました</h2>\n');
            footer(req, res);
          })
      }
    }
  return;
});
}

// 投稿の詳細画面(GET)
const showPost = (req, res, id) => {
  header(req, res);

  res.write(`id=${id}番の投稿についての詳細画面です`);

  footer(req, res);
}

// マイページ
const myPage = (req, res) => {
  header(req, res);

  res.write('<h2>マイページ</h2>\n');
  res.write('<a href="/mypage/edit_profile">プロフィール編集</a>');

  footer(req, res);
}

// プロフィール編集ページ
const editProfilePage = (req, res) => {
  header(req, res);

  res.write('<h2>プロフィール編集ページ</h2>\n');
  res.write('<form action="/mypage/edit_profile" method="post">')
  res.write('<input type="text" name="user_name" placeholder="user_name"><br>');
  res.write('<input type="email" name="user_email" placeholder="e-mail"><br>');
  res.write('<input type="password" name="user_password" placeholder="password"><br>');
  res.write('<textarea type="text" name="user_profile" placeholder="profile"></textarea><br>');
  res.write('<input type="submit" value="編集する">');
  res.write('</form>');

  footer(req, res);
}

// （UPDATE）プロフィール編集実行！
const updateEditProfilePage = (req, res, userID) => {
  return new Promise((resolve, reject) => {

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

      // 現在ログインしているユーザの情報をアップデート
      updateUser(userID, parseBody.user_name, parseBody.user_email, parseBody.user_password, parseBody.user_profile, (err) => {
        if (err) {
          console.error(err.message);
          reject(err); // エラー時にreject
          return;
        }
      });

      const newProfile = {
        userID: userID,
        name: parseBody.user_name,
        email: parseBody.user_email,
        profile: parseBody.user_profile
      };

      console.log(`updateEditProfilePage()の中のnewProfile = ${JSON.stringify(newProfile)}`);
      res.write('<h2>プロフィールは更新されました</h2>');
      footer(req, res);

      // サーバ側のセッション情報を返り値に
      resolve(newProfile); // resolveの引数に渡す

    })
  });
}

// その他のページ(404 Not Found)
const notFoundPage = (req, res) => {
  res.statusCode = 404; //httpステータスコードを返す
  header(req, res);
  res.write('<h2>ページはありません</h2>');
  footer(req, res);
}

module.exports = {
  signUpPage,
  signInPage,
  topPage,
  postPage,
  postPostPage,
  showPost,
  myPage,
  editProfilePage,
  updateEditProfilePage,
  notFoundPage
}