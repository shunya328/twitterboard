////////////////////////// sqliteデータの機能定義 /////////////////////////
//sqlite利用
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('twitterboardDatabase.db')//sqliteデータベースを作成
//画像を保存するためのモジュールを読み込む
const fs = require('fs');
const path = require('path');
const { generateSessionID } = require('./generateSessionID'); //ランダムな文字列を生み出す関数

//postsテーブルの作成
db.run(`CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT, 
  user_id INTEGER NOT NULL,
  content TEXT,
  is_deleted INTEGER DEFAULT 0,
  reply_to INTEGER,
  image TEXT,
  date DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (reply_to) REFERENCES posts(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
  )`);

//usersテーブルの作成
db.run(`CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  profile TEXT DEFAULT '',
  profile_image TEXT,
  is_deleted INTEGER DEFAULT 0
)`)

//relationshipsテーブルの作成
db.run(`CREATE TABLE IF NOT EXISTS relationships (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  follower_id INTEGER NOT NULL,
  followed_id INTEGER NOT NULL,
  FOREIGN KEY (follower_id) REFERENCES users(id),
  FOREIGN KEY (followed_id) REFERENCES users(id),
  UNIQUE (follower_id, followed_id)
)`);


//データベースから全投稿データを取得する関数（ついでにユーザデータも引っ張っています）
const getAllPosts = (callback) => {
  db.all(`SELECT posts.id, posts.content, posts.is_deleted, posts.reply_to, posts.image, posts.date,
  users.id AS user_id, users.name, users.email, users.profile, users.profile_image
   FROM posts
   INNER JOIN users ON posts.user_id = users.id`, [], (err, rows) => {
    if (err) {
      callback(err, null);
      return;
    }
    callback(null, rows);
  });
}

// データベースから、自身の投稿と、自身がフォローしているユーザの投稿を取得する関数(ここではフォローユーザのリプライ投稿も全部取得している)
const getMyTimelinePosts = (currentUserID, callback) => {
  db.all(`
SELECT posts.*, users.name, users.profile_image
FROM posts
INNER JOIN users ON posts.user_id = users.id
LEFT JOIN relationships ON posts.user_id = relationships.followed_id
WHERE (posts.user_id =? OR relationships.follower_id = ?)
`,
    [currentUserID, currentUserID],
    (err, rows) => {
      if (err) {
        console.error(err.message);
        callback(err, null);
        return;
      }
      callback(null, rows);
    });
}


//データベースから全ユーザデータを取得する関数。ログイン中のユーザがフォローしているユーザかどうかを判定
const getAllUsers = (currentUserID, callback) => {
  db.all(`SELECT users.*,
  CASE WHEN relationships.followed_id IS NULL THEN 0 ELSE 1 END AS is_following
FROM users
LEFT JOIN relationships
ON relationships.follower_id = ? AND relationships.followed_id = users.id
WHERE users.is_deleted = 0`, [currentUserID], (err, rows) => {
    if (err) {
      callback(err, null);
      return;
    }
    callback(null, rows);
  });
}

//データベースに文字＆画像を同時に投稿する関数
const insertPost = (content, image, reply_to, currentUserID) => {
  return new Promise((resolve, reject) => {
    if (image) {
      //　画像の前準備
      const fileName = generateSessionID() + '.jpg'; //ランダムな文字列を画像の名前にする
      fs.mkdirSync(path.join(__dirname, 'public', 'post_images'), { recursive: true }); //保存先ディレクトリがない場合、作る
      const imagePath = path.join(__dirname, 'public', 'post_images', fileName); //画像の保存先
      fs.writeFileSync(imagePath, image, 'binary') //画像を保存する
      // "/public/post_images/3e5f6M5ofDq3rUHblllvVmMDvnqVqZ7d.jpg"のような形式に変換
      const imagePathInDB = imagePath.replace(/.*\/public\//, '/public/');

      // データベースに投稿の情報を格納
      db.run(`INSERT INTO posts (user_id, content, image, reply_to) VALUES (?, ?, ?, ?)`, [currentUserID, content, imagePathInDB, reply_to], (err) => {
        if (err) {
          reject(err);
        } else {
          resolve(imagePathInDB);
        }
      });
    } else {
      const imagePathInDB = null;
      // データベースに投稿の情報を格納
      db.run(`INSERT INTO posts (user_id, content, image, reply_to) VALUES (?, ?, ?, ?)`, [currentUserID, content, imagePathInDB, reply_to], (err) => {
        if (err) {
          reject(err);
        } else {
          resolve(imagePathInDB);
        }
      });
    }
  })
}

// データベース上の特定の投稿を取ってくる関数
const getOnePost = (req, res, postID, callback) => {
  db.get(`SELECT posts.*, users.name, users.profile_image
  FROM posts
  INNER JOIN users ON posts.user_id = users.id
  WHERE posts.id = ?`,
    [postID], (err, row) => {
      if (err) {
        console.error(err.message);
        callback(err, null);
        return;
      }

      if (!row) {
        const error = new Error('お探しの投稿は見つかりませんでした');
        error.statusCode = 404;
        callback(error, null);
        return;
      }

      callback(null, row);
    });
}

// データベース上の特定の投稿に紐づくリプライをすべて取得する関数
const getReplyPost = (req, res, postID, callback) => {
  db.all(`SELECT posts.*, users.name, users.profile_image
  FROM posts
  INNER JOIN users ON posts.user_id = users.id
  WHERE posts.reply_to = ?
  `,
    [postID], (err, rows) => {
      if (err) {
        console.error(err.message);
        callback(err, null);
        return;
      }
      callback(null, rows);
    });
}

//データベースの特定の投稿を削除する関数(論理削除)
const deletePost = (id, callback) => {
  db.run(`UPDATE posts SET is_deleted = 1 WHERE id = ?`, [id], (err) => {
    if (err) {
      callback(err);
      return;
    }
    callback(null);
    console.log('deletePostが呼ばれました');
  })
}

//データベースに新たにユーザ情報を登録する関数
const insertUser = (userName, userEmail, userPassword, callback) => {
  const isUserNameDuplicate = { value: false };
  const isUserEmailDuplicate = { value: false };
  //ユーザ名の重複チェック
  db.get('SELECT COUNT (*) AS count FROM users WHERE name = ?', [userName], (err, row) => {
    if (err) {
      callback(err);
      return;
    }
    if (row.count > 0) {
      console.log('row.count:', row.count);
      const error = new Error('同じユーザ名が既に存在しています');
      callback(error);
      isUserNameDuplicate.value = true;
      return;
    }
  });

  //メールアドレスの重複チェック
  db.get('SELECT COUNT (*) AS count FROM users WHERE email = ?', [userEmail], (err, row) => {
    if (err) {
      callback(err);
      return;
    }
    if (row.count > 0) {
      const error = new Error('同じメールアドレスが既に存在しています');
      callback(error);
      isUserEmailDuplicate.value = true;
      return;
    }
  });

  //ユーザ名・メールのどちらにも重複がない場合、ユーザデータを新規登録
  if (!isUserNameDuplicate.value && !isUserEmailDuplicate.value) {
    db.run(`INSERT INTO users (
    name, email, password
  ) VALUES (?, ?, ?)`,
      [userName, userEmail, userPassword], (err) => {
        if (err) {
          callback(err);
          return;
        }
        callback(null);
      });
  }
}

//データベース上のユーザ情報を変更する関数
const updateUser = (userID, userName, userEmail, userPassword, userProfile, userImage, callback) => {
  const isUserNameDuplicate = { value: false };
  const isUserEmailDuplicate = { value: false };

  //ユーザ名の重複チェック
  db.get('SELECT COUNT (*) AS count FROM users WHERE name = ? AND id != ?', [userName, userID], (err, row) => {
    if (err) {
      callback(err);
      return;
    }
    if (row.count > 0) {
      const error = new Error('同じユーザ名が既に存在しています');
      callback(error);
      isUserNameDuplicate.value = true;
      return;
    }
  });

  //メールアドレスの重複チェック
  db.get('SELECT COUNT (*) AS count FROM users WHERE email = ? AND id != ?', [userEmail, userID], (err, row) => {
    if (err) {
      callback(err);
      return;
    }
    if (row.count > 0) {
      const error = new Error('同じメールアドレスが既に存在しています');
      callback(error);
      isUserEmailDuplicate.value = true;
      return;
    }
  });

  //ユーザ名・メールのどちらにも重複がない場合、ユーザデータを更新
  if (!isUserNameDuplicate.value && !isUserEmailDuplicate.value) {
    //データの書き込み
    if (userName) {
      db.run(`UPDATE users SET name = ? WHERE id = ?`,
        [userName, userID], (err) => {
          if (err) {
            callback(err);
            return;
          }
          callback(null);
        });
    }
    if (userEmail) {
      db.run(`UPDATE users SET email = ? WHERE id = ?`,
        [userEmail, userID], (err) => {
          if (err) {
            callback(err);
            return;
          }
          callback(null);
        });
    }
    if (userPassword) {
      db.run(`UPDATE users SET password = ? WHERE id = ?`,
        [userPassword, userID], (err) => {
          if (err) {
            callback(err);
            return;
          }
          callback(null);
        });
    }
    if (userProfile) {
      db.run(`UPDATE users SET profile = ? WHERE id = ?`,
        [userProfile, userID], (err) => {
          if (err) {
            callback(err);
            return;
          }
          callback(null);
        });
    }
    if (userImage) {
      //　画像の前準備
      const fileName = generateSessionID() + '.jpg'; //ランダムな文字列を画像の名前にする
      fs.mkdirSync(path.join(__dirname, 'public', 'user_images'), { recursive: true }); //保存先ディレクトリがない場合、作る
      const imagePath = path.join(__dirname, 'public', 'user_images', fileName); //画像の保存先
      fs.writeFileSync(imagePath, userImage, 'binary') //画像を保存する
      // "/public/user_images/3e5f6M5ofDq3rUHblllvVmMDvnqVqZ7d.jpg"のような形式に変換
      const imagePathInDB = imagePath.replace(/.*\/public\//, '/public/');

      db.run(`UPDATE users SET profile_image = ? WHERE id = ?`,
        [imagePathInDB, userID], (err) => {
          if (err) {
            callback(err);
            return;
          }
          callback(null);
        });
    }
  }
}

//データベースからユーザを検索する関数(サインインのとき)
const findUserSignIn = (userName, userPassword, callback) => {
  db.all(`SELECT * FROM users WHERE name = ? AND password = ?`,
    [userName, userPassword], (err, rows) => {
      if (err) {
        callback(err);
        return;
      }
      callback(null, rows[0]);
    });
}

//データベースからユーザを検索する（サインアップのとき）
const findUserSignUp = (userName, userEmail, userPassword, callback) => {
  db.all(`SELECT * FROM users WHERE name = ? AND email = ? AND password = ?`,
    [userName, userEmail, userPassword], (err, rows) => {
      if (err) {
        callback(err);
        return;
      }
      callback(null, rows[0]);
    });
}

// ユーザを退会する（論理削除）
const withdrawalUser = (id, callback) => {
  db.run(`UPDATE users SET is_deleted = 1 WHERE id = ?`, [id], (err) => {
    if (err) {
      onsole.error(err);
      callback(err);
      return;
    }
    console.log('withdrawalUserが呼ばれました');
    callback(null);
  })
}

module.exports = {
  db,
  getAllPosts,
  getMyTimelinePosts,
  getAllUsers,
  insertPost,
  getOnePost,
  getReplyPost,
  deletePost,
  insertUser,
  updateUser,
  findUserSignIn,
  findUserSignUp,
  withdrawalUser
}