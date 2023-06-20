const { header, footer, beforeLoginHeader, beforeLoginFooter } = require('./pageUtils');
const { getAllPosts, insertPost, deletePost, insertUser, findUser } = require('./databaseUtils');
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
  res.write('<form action="/post" method="post"><textarea name="kakikomi" style="width:80%;height:100px"></textarea><input type="submit" value="投稿"></form>');

  footer(req, res);
  return;
}

// 投稿ページ(POST)
const postPostPage = (req, res, data) => {
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

    if (parseBody.kakikomi) {
      //データベースに投稿を格納
      insertPost(parseBody.kakikomi, (err) => {
        if (err) {
          console.error(err.message);
          return;
        }
      })
      // posts.push(parseBody.kakikomi); //posts配列に、これまでの投稿を格納＆蓄積
      res.write('<h2>投稿しました</h2>\n');
      res.write(`投稿内容: ${decodeURIComponent(parseBody.kakikomi)}`); //投稿をURLデコードしている。URLエンコードされた文字列というのは、%E6%8A こんな感じのやつ。それを普通の文字列に変換する
    }
    footer(req, res);
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
  notFoundPage
}