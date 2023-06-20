////////////////////////// sqliteデータの機能定義 /////////////////////////
//sqlite利用
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('twitterboardDatabase.db')//sqliteデータベースを作成

//postsテーブルの作成
db.run(`CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT, 
  content TEXT,
  is_deleted INTEGER DEFAULT 0
  )`);

//usersテーブルの作成
db.run(`CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  profile TEXT DEFAULT ''
)`)

//データベースから全データを取得する関数
const getAllPosts = (callback) => {
  db.all(`SELECT * FROM posts`, [], (err, rows) => {
    if (err) {
      callback(err, null);
      return;
    }
    callback(null, rows);
  });
}

//データベースに投稿を格納する関数
const insertPost = (content, callback) => {
  db.run(`INSERT INTO posts (content) VALUES (?)`, [content], (err) => {
    if (err) {
      callback(err);
      return;
    }
    callback(null);
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

//データベース上のユーザ情報を変更する関数
const updateUser = (userID, userName, userEmail, userPassword, userProfile, callback) => {
  db.run(`UPDATE users SET name = ?, email = ?, password = ?, profile = ? WHERE id = ?`,
    [userName, userEmail, userPassword, userProfile, userID], (err) => {
      if (err) {
        callback(err);
        return;
      }
      callback(null);
    });
}

//データベースからユーザを検索する関数
const findUser = (userName, userPassword, callback) => {
  db.all(`SELECT * FROM users WHERE name = ? AND password = ?`,
    [userName, userPassword], (err, rows) => {
      if (err) {
        callback(err);
        return;
      }
      callback(null, rows[0]);
    });
}

module.exports = {
  db,
  getAllPosts,
  insertPost,
  deletePost,
  insertUser,
  updateUser,
  findUser
}