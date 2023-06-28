const fs = require('fs');
const path = require('path');
const { header, footer, beforeLoginHeader, beforeLoginFooter } = require('./pageUtils');
const { getAllPosts, getMyTimelinePosts, getAllUsers, insertPost, getOnePost, getReplyPost, deletePost, insertUser, findUser, updateUser, withdrawalUser } = require('./databaseUtils');
const { generateSessionID } = require('./generateSessionID');
const { postLogout } = require('./sessions');
const { getFollowingUser, getFollowerUser, isFollowing } = require('./followUtils');

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
const topPage = (req, res, currentUserID) => {
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
      res.write('<li style="border:1px solid #888; padding: 1em">');
      if (row.is_deleted === 0) {

        if (row.profile_image) {
          res.write(`<img src="${row.profile_image}" alt="プロフィール画像"  style="width:80px; height:auto"/>`);
        } else {
          res.write(`<img src="/public/no_image.jpeg" alt="プロフィール画像" style="width:80px; height:auto" />`);
        }

        res.write(`<a href="/users/${row.user_id}">${row.name}</a><br>`);
        res.write(`<a href="/post/${row.id}">${row.content}</a><br>`);
        if (row.image) { res.write(`<img src="${row.image}" alt="投稿画像" style="width:300px; height:auto" />`); }
        res.write(`${row.date}<br>`);
        if (row.user_id === currentUserID) { res.write('<button class="delete-btn-' + row.id + '">削除</button>'); }
      } else {
        res.write(`<a href="/post/${row.id}">投稿は削除されました</a>`)
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

// 自分のタイムライン
const myTimelinePage = (req, res, currentUserID) => {
  getMyTimelinePosts(currentUserID, (err, posts) => {
    if (err) {
      console.error(err.message);
      return;
    }
    header(req, res);

    res.write('<h2>自分のタイムライン</h2>');
    res.write('<ul>');
    for (let row of posts) {
      if (!row.reply_to || row.user_id === currentUserID) {
        res.write('<li style="border:1px solid #888; padding: 1em">');
        if (row.is_deleted === 0) {

          if (row.profile_image) {
            res.write(`<img src="${row.profile_image}" alt="プロフィール画像"  style="width:80px; height:auto"/>`);
          } else {
            res.write(`<img src="/public/no_image.jpeg" alt="プロフィール画像" style="width:80px; height:auto" />`);
          }

          res.write(`<a href="/users/${row.user_id}">${row.name}</a><br>`);
          res.write(`<a href="/post/${row.id}">${row.content}</a><br>`);
          if (row.image) { res.write(`<img src="${row.image}" alt="投稿画像" style="width:300px; height:auto" />`); }
          res.write(`${row.date}<br>`);
          if (row.user_id === currentUserID) { res.write('<button class="delete-btn-' + row.id + '">削除</button>'); }
        } else {
          res.write(`<a href="/post/${row.id}">投稿は削除されました</a>`)
        }
        res.write('</li>\n');
      }
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

// ユーザ一覧ページ(GET)
const userIndexPage = (req, res, currentUserID) => {
  header(req, res);

  getAllUsers(currentUserID, (err, users) => {
    if (err) {
      console.error(err.message);
      return;
    }
    res.write('<h2>ユーザ一覧ページ</h2>');

    res.write('<ul>');
    for (let row of users) {
      if (row.id !== currentUserID) {
        res.write('<li>');
        if (row.profile_image) {
          console.log('row.profile_image:', row.profile_image)
          res.write(`<img src="${row.profile_image}" alt="プロフィール画像" style="width:80px; height:auto" />`);
        } else {
          res.write(`<img src="/public/no_image.jpeg" alt="プロフィール画像" style="width:80px; height:auto" />`);
        }
        res.write(`<a href="/users/${row.id}">${row.name}</a>`);
        // フォローするボタンの追加
        if (row.is_following === 1) {
          res.write('<span>フォロー済み</span>');
          res.write(`<form action="/unfollow/${row.id}" method="post">`);
          res.write('<button type="submit">フォロー解除</button>');
          res.write('</form>');
        } else {
          res.write(`<form action="/following/${row.id}" method="post">`);
          res.write('<button type="submit">フォローする</button>');
          res.write('</form>');
        }
        res.write('</li>\n');
      }
    }
    res.write('</ul>');

    footer(req, res);
    return;
  });
}

// ユーザ詳細画面。ここでそのユーザの投稿が見れる
const showUserPage = (req, res, userID) => {
  header(req, res);

  res.write(`id:${userID}のユーザの詳細画面です`);

  footer(req, res);
}

// 投稿ページ(GET)
const postPage = (req, res, data) => {
  header(req, res);

  res.write('<h2>投稿ページです</h2>\n');
  res.write(`<form action="/post" method="post" enctype="multipart/form-data">
  <textarea name="kakikomi" style="width:80%;height:100px"></textarea><br>
  <a>画像を投稿：</a><input type="file" name="image" accept="image/*" /><br>
  <input type="hidden" name="reply_to" value="" />
  <input type="submit" value="投稿" />
  </form>`);

  footer(req, res);
  return;
}

// 投稿ページ(POST)
const postPostPage = (req, res, currentUserID) => {

  //マルチパートフォームデータを処理するためのヘルパー関数たちを宣言
  function extractBoundary(contentType) {
    console.log(req.headers['content-type']);
    const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
    return boundaryMatch && (boundaryMatch[1] || boundaryMatch[2]);
  }

  function parseFormData(body, boundary) {
    const formData = {};
    const parts = body.split(`--${boundary}`); //仕様で決まっていないかも「--」

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
      const { kakikomi, image, reply_to } = formData;
      const kakikomiToString = Buffer.from(kakikomi, 'binary').toString('utf-8') //ここで、バイナリデータを正しく文字列に変換(日本語に対応)

      if (kakikomiToString || image) {
        insertPost(kakikomiToString, image, reply_to, currentUserID)
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
const showPost = (req, res, postID, currentUserID) => {
  // id=postIDのレコードをとってくる！
  getOnePost(req, res, postID, (err, row) => {
    if (err) {
      // エラーが発生した場合の処理
      res.statusCode = err.statusCode || 500;
      res.end(err.message);
      return;
    }
    header(req, res);

    res.write(`<h1>投稿詳細画面</h1>`);
    // 特定の投稿をここに表示
    res.write('<div style="border:1px solid #888; padding: 1em; margin: 1em">');
    if (row.is_deleted === 0) {
      if (row.profile_image) {
        res.write(`<img src="${row.profile_image}" alt="プロフィール画像"  style="width:80px; height:auto"/>`);
      } else {
        res.write(`<img src="/public/no_image.jpeg" alt="プロフィール画像" style="width:80px; height:auto" />`);
      }
      res.write(`<a href="/users/${row.user_id}">${row.name}</a><br>`);
      res.write(`<a href="/post/${row.id}">${row.content}</a><br>`);
      if (row.image) { res.write(`<img src="${row.image}" alt="投稿画像" style="width:300px; height:auto" />`); }
      res.write(`${row.date}<br>`);
    } else {
      res.write(`<a href="/post/${row.id}">投稿は削除されています</a>`);
    }
    res.write('</div>');

    // この投稿に対するリプライをする欄です
    res.write('<h1>リプライを送る</h1>')
    res.write(`<form action="/post" method="post" enctype="multipart/form-data">
    <textarea name="kakikomi" style="width:80%;height:100px"></textarea><br>
    <a>画像を投稿：</a><input type="file" name="image" accept="image/*" /><br>
    <input type="hidden" name="reply_to" value="${postID}" />
    <input type="submit" value="投稿" />
    </form>`)

    // 投稿に基づくリプライを取得
    getReplyPost(req, res, postID, (err, rows) => {
      if (err) {
        // エラーが発生した場合の処理
        res.statusCode = err.statusCode || 500;
        res.end(err.message);
        return;
      }

      res.write('<h2>リプライたち</h2>');

      // ここにrowsの数だけforループしてそれぞれの投稿を表示するコードを実装！！
      for (let row of rows) {
        res.write('<li style="border:1px solid #888; padding: 1em">');

        if (row.is_deleted === 0) {
          if (row.profile_image) {
            res.write(`<img src="${row.profile_image}" alt="プロフィール画像"  style="width:80px; height:auto"/>`);
          } else {
            res.write(`<img src="/public/no_image.jpeg" alt="プロフィール画像" style="width:80px; height:auto" />`);
          }
          res.write(`<a href="/users/${row.user_id}">${row.name}</a><br>`);
          res.write(`<a href="/post/${row.id}">${row.content}</a><br>`);
          if (row.image) { res.write(`<img src="${row.image}" alt="投稿画像" style="width:300px; height:auto" />`); }
          res.write(`${row.date}<br>`);
          if (row.user_id === currentUserID) { res.write('<button class="delete-btn-' + row.id + '">削除</button>'); }
        } else {
          res.write(`<a href="/post/${row.id}">投稿は削除されました</a>`)
        }

        res.write('</li>\n');
      }

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
  });
}

// マイページ
const myPage = (req, res) => {
  header(req, res);

  res.write('<h2>マイページ</h2>\n');
  res.write('<h3><a href="/mypage/edit_profile">プロフィール編集</a></h3><br>');

  res.write(`<form method="post" action="/logout">
  <button type="submit">ログアウト</button>
</form>`);

  // 退会フォーム
  res.write('<h2>退会</h2>\n');
  res.write('<form action="/mypage/withdrawal" method="post" onsubmit="return confirmWithdrawal()">');
  res.write('<button type="submit">退会する</button>');
  res.write('</form>');

  // 退会アラートのJavaScriopt関数
  res.write('<script>');
  res.write('function confirmWithdrawal() {');
  res.write('  return confirm("本当に退会しますか？");');
  res.write('}');
  res.write('</script>');

  footer(req, res);
}

// プロフィール編集ページ（GET）
const editProfilePage = (req, res) => {
  header(req, res);

  res.write('<h2>プロフィール編集ページ</h2>\n');
  res.write('<form action="/mypage/edit_profile" method="post" enctype="multipart/form-data">')
  res.write('<input type="text" name="user_name" placeholder="user_name"><br>');
  res.write('<input type="email" name="user_email" placeholder="e-mail"><br>');
  res.write('<input type="password" name="user_password" placeholder="password"><br>');
  res.write('<textarea type="text" name="user_profile" placeholder="profile"></textarea><br>');
  res.write('<a>画像を投稿：</a><input type="file" name="user_image" accept="image/*" /><br>')
  res.write('<input type="submit" value="編集する">');
  res.write('</form>');

  footer(req, res);
}

// （UPDATE）プロフィール編集実行！
const updateEditProfilePage = (req, res, userID) => {
  return new Promise((resolve, reject) => {

    //マルチパートフォームデータを処理するためのヘルパー関数たちを宣言
    function extractBoundary(contentType) {
      console.log(req.headers['content-type']);
      const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
      return boundaryMatch && (boundaryMatch[1] || boundaryMatch[2]);
    }

    function parseFormData(body, boundary) {
      const formData = {};
      const parts = body.split(`--${boundary}`); //仕様で決まっていないかも「--」

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
      // body = Buffer.concat(body).toString(); //Buffer.concat()メソッドで複数のBufferオブジェクト(body)を結合し新たなBufferオブジェクトを生成。それをtoString()メソッドで文字列に変換しさらにbodyに格納
      //パースする。ここでは、queryString.parse()メソッドを使って、文字列などを解析し、オブジェクトとして返します。
      const queryString = require('querystring');
      const parseBody = queryString.parse(body);
      body = Buffer.concat(body).toString('binary'); //Buffer.concat()メソッドで複数のBufferオブジェクト(body)を結合し新たなBufferオブジェクトを生成。

      // フォームデータの解析
      const contentType = req.headers['content-type'];
      const boundary = extractBoundary(contentType); // Content-Typeヘッダからマルチパートフォームデータの境界(boudary)を抽出する

      if (boundary) {
        const formData = parseFormData(body, boundary);

        // フォームデータの取得
        const { user_name, user_email, user_password, user_profile, user_image } = formData;
        console.log('user_name:', user_name);
        const userNameToString = (user_name ? Buffer.from(user_name, 'binary').toString('utf-8') : null); //ここで、バイナリデータを正しく文字列に変換(日本語に対応)
        const userEmailToString = (user_email ? Buffer.from(user_email, 'binary').toString('utf-8') : null);
        const userPasswordToString = (user_password ? Buffer.from(user_password, 'binary').toString('utf-8') : null);
        const userProfileToString = (user_profile ? Buffer.from(user_profile, 'binary').toString('utf-8') : null);

        // 現在ログインしているユーザの情報をアップデート
        updateUser(userID, user_name, user_email, user_password, user_profile, user_image, (err) => {
          if (err) {
            console.error(err.message);
            res.write('<h2>プロフィールの更新に失敗しました</h2><br>');
            res.write(`<h4>${err.message}</h4>`);
            reject(err); // エラー時にreject
            footer(req, res);
            return;
          }
          const newProfile = {
            userID: userID,
            name: user_name,
            email: user_email,
            profile: user_profile
          };

          console.log(`updateEditProfilePage()の中のnewProfile = ${JSON.stringify(newProfile)}`);
          res.write('<h2>プロフィールは更新されました</h2>');
          // footer(req, res);

          // サーバ側のセッション情報を返り値に
          resolve(newProfile); // resolveの引数に渡す
        });
      }
    })
  });
}

// フォロー一覧ページ
const followingUserPage = (req, res, currentUserID) => {
  getFollowingUser(req, res, currentUserID, (err, users) => {
    if (err) {
      // エラーハンドリングを行う
      console.error(err.message);
      return;
    }
    header(req, res);

    res.write(`<h1>フォロー一覧ページ</h1>`);

    res.write('<ul>');

    for (let user of users) {
      res.write('<li>');
      if (user.profile_image) {
        res.write(`<img src="${user.profile_image}" alt="プロフィール画像"  style="width:80px; height:auto"/>`);
      } else {
        res.write(`<img src="/public/no_image.jpeg" alt="プロフィール画像" style="width:80px; height:auto" />`);
      }
      res.write(`<a href="/users/${user.id}">${user.name}</a>`);
      // フォローするボタンの追加
      res.write('<span>フォロー済み</span>');
      res.write(`<form action="/unfollow/${user.id}" method="post">`);
      res.write('<button type="submit">フォロー解除</button>');
      res.write('</form>');
      res.write('</li>\n');
    }
    res.write('</ul>');

    footer(req, res);
    return;
  })
}

// フォロワー一覧ページ。getFollowerUser()で、自身のフォロワーを抜き出し、isFollowing()でそのフォロワーをフォローしているか判定
const followerUserPage = (req, res, currentUserID) => {
  getFollowerUser(req, res, currentUserID, (err, users) => {
    if (err) {
      // エラーハンドリングを行う
      console.error(err.message);
      return;
    }
    header(req, res);

    res.write(`<h1>フォロワー一覧ページ</h1>`);

    res.write('<ul>');

    // isFollowing関数は非同期のため、PromiseでArray.map()メソッドを使って非同期処理の結果が解決されるまで新しい配列の要素が生成されるのを待つ
    const promises = users.map(user => {
      return isFollowing(currentUserID, user.id)
        .then((is_following) => {
          res.write('<li>');
          if (user.profile_image) {
            res.write(`<img src="${user.profile_image}" alt="プロフィール画像" style="width:80px; height:auto"/>`);
          } else {
            res.write(`<img src="/public/no_image.jpeg" alt="プロフィール画像" style="width:80px; height:auto" />`);
          }
          res.write(`<a href="/users/${user.id}">${user.name}</a>`);

          if (is_following) {
            res.write('<span>フォロー済み</span>');
            res.write(`<form action="/unfollow/${user.id}" method="post">`);
            res.write('<button type="submit">フォロー解除</button>');
            res.write('</form>');
          } else {
            res.write(`<form action="/following/${user.id}" method="post">`);
            res.write('<button type="submit">フォローする</button>');
            res.write('</form>');
          }
          res.write('</li>');
        })
        .catch((error) => {
          // エラーハンドリング
          console.error(error);
        });
    });

    Promise.all(promises)
      .then(() => {
        res.write('</ul>');

        footer(req, res);
      })
      .catch((error) => {
        // エラーハンドリング
        console.error(error);
      });

  })
}

// 画像ファイルを読み込む関数
const readImageFile = (req, res) => {
  const fileName = req.url.split('/').pop();
  const imagePath = path.join(__dirname, req.url);

  fs.readFile(imagePath, (err, data) => {
    if (err) {
      console.error(err);
      res.statusCode = 500;
      res.end('Internal Server Error');
      return;
    }

    res.setHeader('Content-Type', 'image/jpeg');
    res.statusCode = 200;
    res.end(data);
  });
}

// （POST）ユーザを論理削除する関数
const postWithdrawalUser = (req, res, sessions, sessionID) => {
  withdrawalUser(sessions[sessionID].userID, (err) => {
    if (err) {
      console.error(err);
      return;
    }
    console.log(`userID=${sessions[sessionID].userID}のユーザが削除されました`);
    postLogout(req, res, sessions, sessionID);
  })
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
  myTimelinePage,
  userIndexPage,
  showUserPage,
  postPage,
  postPostPage,
  showPost,
  myPage,
  editProfilePage,
  updateEditProfilePage,
  followingUserPage,
  followerUserPage,
  readImageFile,
  postWithdrawalUser,
  notFoundPage
}