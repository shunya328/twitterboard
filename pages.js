const { header, footer } = require('./pageUtils');
const { getAllPosts, insertPost, deletePost } = require('./databaseUtils');

// トップページ
const topPage = (req, res) => {
  header(req, res);

  //データベースから全データを取得
  if (req.method === 'GET') {
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
          res.write(row.content);
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
    })
  }
}

// 投稿ページ
const postPage = (req, res, data) => {
  header(req, res);

  //リクエストメソッドで処理を変える
  //GETの処理
  if (req.method === 'GET') {
    res.write('<h2>投稿ページです</h2>\n');
    res.write('<form action="/post" method="post"><textarea name="kakikomi" style="width:80%;height:100px"></textarea><input type="submit" value="投稿"></form>');
    footer(req, res);
    return;
  }

  //POSTの処理
  if (req.method === 'POST') {
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
    });
  }
}

// その他のページ(404 Not Found)
const notFoundPage = (req, res) => {
  res.statusCode = 404; //httpステータスコードを返す
  header(req, res);
  res.write('<h2>ページはありません</h2>');
  footer(req, res);
}

module.exports = {
  topPage,
  postPage,
  notFoundPage
}