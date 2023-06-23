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
  content TEXT,
  is_deleted INTEGER DEFAULT 0,
  reply_to INTEGER,
  image TEXT,
  date DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (reply_to) REFERENCES posts(id)
  )`);

//usersテーブルの作成
db.run(`CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  profile TEXT DEFAULT '',
  profile_image TEXT
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

//データベースに文字の投稿を格納する関数
const insertPostContent = (content, callback) => {
  db.run(`INSERT INTO posts (content) VALUES (?)`, [content], (err) => {
    if (err) {
      callback(err);
      return;
    }
    callback(null);
  });
}

//データベースに画像の投稿を格納する関数
const insertPostImage = (image, callback) => {
  // console.log('image:',image);
  const fileName = generateSessionID() + '.jpg';
  fs.mkdirSync(path.join(__dirname, 'public', 'images'), { recursive: true });
  const imagePath = path.join(__dirname, 'public', 'images', fileName);
  // const imageBuffer = image.slice(4, -2); // バッファオブジェクトそのものを使用する場合
  // const imageBuffer = Buffer.from(image.split('\r\n').slice(4, -2).join('\r\n'), 'binary'); //バイナリデータとしてBufferオブジェクトを作成
  // console.log('imageはisBuffer？:',Buffer.isBuffer(image));
  // const imageBuffer = Buffer.isBuffer(image) ? image : Buffer.from(image, 'binary');
  // console.log('imageBuffer:',imageBuffer);
  //画像をサーバに保存
  // fs.writeFileSync(imagePath, imageBuffer, 'binary');
  fs.writeFileSync(imagePath, image, 'binary')

  //データベースへ、画像のパスを保存
  const imagePathInDB = '/images/' + fileName; //ファイルが保存されるパス
  db.run(`INSERT INTO posts (image) VALUES (?)`, [imagePathInDB], (err) => {
    if (err) {
      callback(err);
      return;
    }
  })
  callback(null, imagePathInDB);
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
  insertPostContent,
  insertPostImage,
  deletePost,
  insertUser,
  updateUser,
  findUser
}