////////////////////////// sqliteデータの機能定義 /////////////////////////
//sqlite利用
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('twitterboardDatabase.db')//sqliteデータベースを作成

//テーブルの作成
db.run(`CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT, 
  content TEXT,
  is_deleted INTEGER DEFAULT 0
  )`);

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

module.exports = {
  db,
  getAllPosts,
  insertPost,
  deletePost
}