////////////////////////// sqliteデータの機能定義 /////////////////////////
//sqlite利用
const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("twitterboardDatabase.db"); //sqliteデータベースを作成
//画像を保存するためのモジュールを読み込む
const fs = require("fs");
const path = require("path");
const url = require("url");
// cryptoモジュールの取り込み
const crypto = require("crypto");
// ランダム文字列のファイル名をつくるための関数を呼ぶ
const { getFileName } = require("./getRandomString");
// Modelを呼ぶ
const { sql } = require("./modelFrame");

// パスワードのハッシュ化とソルト生成を行う関数
const hashPasswordWithSalt = (password) => {
  const salt = crypto.randomBytes(16).toString("hex"); //ランダムなソルト値を生成
  let hashedPassword = password;

  //一万回ストレッチングします
  for (let i = 0; i < 10000; i++) {
    hashedPassword = crypto
      .createHmac("sha256", salt) //SHA-256ハッシュ関数を利用
      .update(hashedPassword)
      .digest("hex");
  }

  return { hashedPassword, salt };
};

// パスワードの検証
const verifyPassword = (inputPassword, storedPassword, salt) => {
  let hashedInputPassword = inputPassword;

  //一万回ストレッチングします
  for (let i = 0; i < 10000; i++) {
    hashedInputPassword = crypto.createHmac("sha256", salt).update(hashedInputPassword).digest("hex");
  }

  return hashedInputPassword === storedPassword;
};

//postsテーブルの作成
db.run(`CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT, 
  user_id INTEGER NOT NULL,
  content TEXT,
  is_deleted INTEGER DEFAULT 0,
  reply_to INTEGER,
  image TEXT,
  date DATETIME DEFAULT (datetime(CURRENT_TIMESTAMP,'localtime')),
  FOREIGN KEY (reply_to) REFERENCES posts(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
  )`);

//usersテーブルの作成
db.run(`CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE CHECK(name GLOB '[0-9A-Za-z]*'),
  email TEXT NOT NULL UNIQUE CHECK(email GLOB '[a-zA-Z0-9_+-]*@?[a-zA-Z0-9]*'),
  password TEXT NOT NULL ,
  profile TEXT DEFAULT '',
  profile_image TEXT,
  is_deleted INTEGER DEFAULT 0,
  salt TEXT NOT NULL
)`);

//relationshipsテーブルの作成
db.run(`CREATE TABLE IF NOT EXISTS relationships (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  follower_id INTEGER NOT NULL,
  followed_id INTEGER NOT NULL,
  FOREIGN KEY (follower_id) REFERENCES users(id),
  FOREIGN KEY (followed_id) REFERENCES users(id),
  UNIQUE (follower_id, followed_id)
)`);

//sessionsテーブルの作成
db.run(`CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL CHECK(name GLOB '[0-9A-Za-z]*'),
  email TEXT NOT NULL CHECK(email GLOB '[a-zA-Z0-9_+-]*@?[a-zA-Z0-9]*'),
  profile TEXT DEFAULT '',
  profile_image TEXT
)`);

// セッションに必要な情報を登録
const setSession = async (session_id, user_id, user_name, user_email, user_profile, user_profile_image, callback) => {
  const prepare = sql`
  INSERT INTO sessions (
    session_id, user_id, name, email, profile, profile_image
  ) VALUES ($session_id, $user_id, $user_name, $user_email, $user_profile, $user_profile_image)
  `;
  const param = {
    $session_id: session_id,
    $user_id: user_id,
    $user_name: user_name,
    $user_email: user_email,
    $user_profile: user_profile,
    $user_profile_image: user_profile_image,
  };
  return await prepare.execQuery(db, "run", param);
};

//受け取ったセッションIDのデータを探して突合
const searchSession = async (sessionID) => {
  const prepare = sql`
  SELECT * FROM sessions WHERE session_id = $sessionID
  `;
  const param = {
    $sessionID: sessionID,
  };
  return await prepare.execQuery(db, "get", param);
};

//受け取ったセッションIDのデータを探してレコードを削除
const deleteSession = async (sessionID) => {
  const prepare = sql`
  DELETE FROM sessions WHERE session_id = $sessionID
  `;
  const param = {
    $sessionID: sessionID,
  };

  return await prepare.execQuery(db, "run", param);
};

//受け取ったセッションIDのレコードを探し、アップデートする
const updateSession = async (sessionID, newUserProfile) => {
  const { user_id, name, email, profile } = newUserProfile;

  const prepare = sql`
  UPDATE sessions SET user_id = $user_id , name = $name , email = $email , profile = $profile WHERE session_id = $sessionID
  `;
  const param = {
    $user_id: user_id,
    $name: name,
    $email: email,
    $profile: profile,
    $sessionID: sessionID,
  };

  return await prepare.execQuery(db, "run", param);
};

// 自分のタイムライン取得、ページネーション対応
const getMyTimelinePostsPagenation = async (currentUserID, currentPage, limit) => {
  const offset = (currentPage - 1) * limit;

  const prepare1 = sql`
  SELECT COUNT(DISTINCT posts.id) AS total_count
  FROM posts
  INNER JOIN users ON posts.user_id = users.id
  LEFT JOIN relationships ON posts.user_id = relationships.followed_id
  WHERE (posts.user_id = $currentUserID OR relationships.follower_id = $currentUserID )
  `;
  const param1 = {
    $currentUserID: currentUserID,
  };

  const prepare2 = sql`
  SELECT posts.*, users.name, users.profile_image
  FROM posts
  INNER JOIN users ON posts.user_id = users.id
  WHERE (posts.user_id = $currentUserID )
  UNION
  SELECT posts.*, users.name, users.profile_image
  FROM posts
  INNER JOIN relationships ON posts.user_id = relationships.followed_id
  INNER JOIN users ON posts.user_id = users.id
  WHERE (relationships.follower_id = $currentUserID )
  ORDER BY posts.date DESC
  LIMIT $limit OFFSET $offset
  `;
  const param2 = {
    $currentUserID: currentUserID,
    $limit: limit,
    $offset: offset,
  };

  const result = await prepare1.execQuery(db, "get", param1);
  const totalCount = result.total_count;
  const posts = await prepare2.execQuery(db, "all", param2);

  return {
    posts: posts,
    totalCount: totalCount,
  };
};

// データベースから、あるユーザの全ての投稿を取得する関数（ページネーション機能込み）
const getAllPostOfUserPagenation = async (userID, currentPage, limit) => {
  const offset = (currentPage - 1) * limit;

  const prepare1 = sql`
  SELECT COUNT(*) AS total_count
  FROM posts
  INNER JOIN users ON posts.user_id = users.id
  WHERE posts.user_id = $userID
  `;
  const param1 = {
    $userID: userID,
  };

  const prepare2 = sql`
  SELECT posts.*, users.name, users.profile, users.profile_image, users.is_deleted AS user_is_deleted
  FROM posts
  INNER JOIN users ON posts.user_id = users.id
  WHERE posts.user_id = $userID
  ORDER BY posts.date DESC
  LIMIT $limit OFFSET $offset
  `;
  const param2 = {
    $userID: userID,
    $limit: limit,
    $offset: offset,
  };

  const result = await prepare1.execQuery(db, "get", param1);
  const totalCount = result.total_count;
  const rows = await prepare2.execQuery(db, "all", param2);

  return {
    totalCount: totalCount,
    posts: rows,
  };
};

//データベースから全ユーザデータを取得する関数。ログイン中のユーザがフォローしているユーザかどうかを判定
const getAllUsers = async (currentUserID) => {
  const prepare = sql`
  SELECT users.*,
  CASE WHEN relationships.followed_id IS NULL THEN 0 ELSE 1 END AS is_following
  FROM users
  LEFT JOIN relationships
  ON relationships.follower_id = $currentUserID AND relationships.followed_id = users.id
  WHERE users.is_deleted = 0
  `;
  const param = {
    $currentUserID: currentUserID,
  };

  return await prepare.execQuery(db, "all", param);
};

//データベースに文字＆画像を同時に投稿する関数
const insertPost = (content, image, reply_to, currentUserID) => {
  return new Promise(async (resolve) => {
    let imagePathInDB = null;
    if (image) {
      //　画像の前準備
      const fileName = getFileName("jpg"); //ランダムな文字列を画像の名前にする
      fs.mkdirSync(path.join(__dirname, "public", "post_images"), {
        recursive: true,
      }); //保存先ディレクトリがない場合、作る
      const imagePath = path.join(__dirname, "public", "post_images", fileName); //画像の保存先
      fs.writeFileSync(imagePath, image, "binary"); //画像を保存する
      // "/public/post_images/3e5f6M5ofDq3rUHblllvVmMDvnqVqZ7d.jpg"のような形式に変換
      imagePathInDB = imagePath.replace(/.*\/public\//, "/public/");
    }
    const reply = reply_to ? reply_to : null;

    const prepare = sql`
      INSERT INTO posts (user_id, content, image, reply_to) VALUES ($currentUserID, $content, $imagePathInDB, $reply)
      `;
    const param = {
      $currentUserID: currentUserID,
      $content: content,
      $imagePathInDB: imagePathInDB,
      $reply: reply,
    };

    await prepare.execQuery(db, "run", param);
    return resolve(imagePathInDB);
  });
};

// データベース上の特定の投稿を取ってくる関数
const getOnePost = async (postID) => {
  const prepare = sql`
  SELECT posts.*, users.name, users.profile_image
  FROM posts
  INNER JOIN users ON posts.user_id = users.id
  WHERE posts.id = $postID
  `;
  const param = {
    $postID: postID,
  };

  return await prepare.execQuery(db, "get", param);
};

// データベース上の特定の投稿に紐づくリプライをすべて取得する関数
const getReplyPost = async (postID) => {
  const prepare = sql`
  SELECT posts.*, users.name, users.profile_image
  FROM posts
  INNER JOIN users ON posts.user_id = users.id
  WHERE posts.reply_to = $postID
  `;
  const param = {
    $postID: postID,
  };

  return await prepare.execQuery(db, "all", param);
};

//データベースの特定の投稿を削除する関数(論理削除)
const deletePost = async (req, res, postID, currentUserID) => {
  const prepare = sql`
  UPDATE posts SET is_deleted = 1 WHERE id = $postID AND user_id = $currentUserID
  `;
  const param = {
    $postID: postID,
    $currentUserID: currentUserID,
  };

  await prepare.execQuery(db, "run", param);
  // 現在のページにリダイレクト（直前のリクエストのURLにリダイレクト）
  const previousPageURL = req.headers.referer;
  console.log("deletePostが回りました");
  console.log(previousPageURL);
  res.writeHead(301, { Location: previousPageURL });
  res.end();
};

//データベースに新たにユーザ情報を登録する関数
const insertUser = async (userName, userEmail, userPassword, callback) => {
  //パスワードをハッシュ化し、ソルト値も取得
  const { hashedPassword, salt } = hashPasswordWithSalt(userPassword);

  // ユーザ名の重複チェック
  const userPrepare = sql`
  SELECT COUNT (*) AS count FROM users WHERE name = $userName
  `;
  const userParam = {
    $userName: userName,
  };

  const nameCheckRow = await userPrepare.execQuery(db, "get", userParam);

  if (nameCheckRow.count > 0) {
    const error = new Error("同じユーザ名が既に存在しています");
    callback(error);
    return;
  }

  // メールアドレスの重複チェック
  const emailPrepare = sql`
  SELECT COUNT (*) AS count FROM users WHERE email = $userEmail
  `;
  const emailParam = {
    $userEmail: userEmail,
  };
  const emailCheckRow = await emailPrepare.execQuery(db, "get", emailParam);
  if (emailCheckRow.count > 0) {
    const error = new Error("同じメールアドレスが既に存在しています");
    callback(error);
    return;
  }

  // ユーザ情報の新規登録
  const prepare = sql`
    INSERT INTO users (
      name, email, password, salt
      ) VALUES ($userName, $userEmail, $hashedPassword, $salt)
    `;
  const param = {
    $userName: userName,
    $userEmail: userEmail,
    $hashedPassword: hashedPassword,
    $salt: salt,
  };
  await prepare.execQuery(db, "run", param);
  callback(null);
};

//データベース上のユーザ情報を変更する関数
const updateUser = async (userID, userName, userEmail, userPassword, userProfile, userImage, callback) => {
  //パスワードをハッシュ化し、ソルト値も取得
  const { hashedPassword, salt } = userPassword ? hashPasswordWithSalt(userPassword) : "";

  // ユーザ名の重複チェック
  const userPrepare = sql`
    SELECT COUNT (*) AS count FROM users WHERE name = $userName  AND id != $userID
    `;
  const userParam = {
    $userName: userName,
    $userID: userID,
  };

  const nameCheckRow = await userPrepare.execQuery(db, "get", userParam);

  if (nameCheckRow.count > 0) {
    const error = new Error("同じユーザ名が既に存在しています");
    callback(error);
    return;
  }

  // メールアドレスの重複チェック
  const emailPrepare = sql`
    SELECT COUNT (*) AS count FROM users WHERE email = $userEmail AND id != $userID
    `;
  const emailParam = {
    $userEmail: userEmail,
    $userID: userID,
  };
  const emailCheckRow = await emailPrepare.execQuery(db, "get", emailParam);
  if (emailCheckRow.count > 0) {
    const error = new Error("同じメールアドレスが既に存在しています");
    callback(error);
    return;
  }

  // 重複がない場合、ユーザデータを更新するが、画像の変更の有無と、パスワードの変更の有無によって変わってくる
  // まず、画像の投稿がある場合、imagePathInDBに、画像の保存パスを格納
  let imagePathInDB = null;
  if (userImage) {
    //　画像の前準備
    const fileName = getFileName("jpg"); //ランダムな文字列を画像の名前にする
    fs.mkdirSync(path.join(__dirname, "public", "user_images"), {
      recursive: true,
    }); //保存先ディレクトリがない場合、作る
    const imagePath = path.join(__dirname, "public", "user_images", fileName); //画像の保存先
    fs.writeFileSync(imagePath, userImage, "binary"); //画像を保存する
    // "/public/user_images/3e5f6M5ofDq3rUHblllvVmMDvnqVqZ7d.jpg"のような形式に変換
    imagePathInDB = imagePath.replace(/.*\/public\//, "/public/");
  }

  // 条件分岐
  if (userImage && hashedPassword) {
    const prepare = sql`
      UPDATE users SET name = $userName, email = $userEmail, profile = $userProfile, profile_image = $imagePathInDB, password = $hashedPassword, salt = $salt WHERE id = $userID
      `;
    const param = {
      $userName: userName,
      $userEmail: userEmail,
      $userProfile: userProfile,
      $imagePathInDB: imagePathInDB,
      $hashedPassword: hashedPassword,
      $salt: salt,
      $userID: userID,
    };
    await prepare.execQuery(db, "run", param);
    callback(null);
    return;
  } else if (userImage && !hashedPassword) {
    const prepare = sql`
    UPDATE users SET name = $userName, email = $userEmail, profile = $userProfile, profile_image = $imagePathInDB WHERE id = $userID
    `;
    const param = {
      $userName: userName,
      $userEmail: userEmail,
      $userProfile: userProfile,
      $imagePathInDB: imagePathInDB,
      $userID: userID,
    };
    await prepare.execQuery(db, "run", param);
    callback(null);
    return;
  } else if (!userImage && hashedPassword) {
    const prepare = sql`
    UPDATE users SET name = $userName, email = $userEmail, profile = $userProfile, password = $hashedPassword, salt = $salt WHERE id = $userID
    `;
    const param = {
      $userName: userName,
      $userEmail: userEmail,
      $userProfile: userProfile,
      $hashedPassword: hashedPassword,
      $salt: salt,
      $userID: userID,
    };
    await prepare.execQuery(db, "run", param);
    callback(null);
    return;
  } else if (!userImage && !hashedPassword) {
    const prepare = sql`
    UPDATE users SET name = $userName, email = $userEmail, profile = $userProfile WHERE id = $userID
    `;
    const param = {
      $userName: userName,
      $userEmail: userEmail,
      $userProfile: userProfile,
      $userID: userID,
    };
    await prepare.execQuery(db, "run", param);
    callback(null);
    return;
  }
};

//データベースからユーザを検索する関数(サインインのとき)
const findUserSignIn = (userName, inputPassword) => {
  return new Promise(async (resolve) => {
    const prepare = sql`
    SELECT * FROM users WHERE name = $userName
    `;
    const param = {
      $userName: userName,
    };
    const row = await prepare.execQuery(db, "get", param);
    const isVerified = row ? verifyPassword(inputPassword, row.password, row.salt) : null;
    resolve({
      user: row,
      isVerified: isVerified,
    });
  });
};

//データベースからユーザを検索する（サインアップのとき）
const findUserSignUp = async (userName, userEmail) => {
  const prepare = sql`
  SELECT * FROM users WHERE name = $userName AND email = $userEmail
  `;
  const param = {
    $userName: userName,
    $userEmail: userEmail,
  };

  return await prepare.execQuery(db, "get", param);
};

// ユーザIDを使ってデータベースからユーザを検索する(自身がフォローしているかどうかも取得)
const findUserByUserID = async (currentUserID, userID) => {
  const prepare = sql`
  SELECT users.*,
  CASE WHEN relationships.followed_id IS NULL THEN 0 ELSE 1 END AS is_following
  FROM users
  LEFT JOIN relationships
  ON relationships.follower_id = ${currentUserID} AND relationships.followed_id = users.id
  WHERE users.is_deleted = 0 AND users.id = ${userID}
  `;

  return await prepare.execQuery(db, "all");
};

// 検索ワードを使って、ユーザ名と突合し(あいまい検索)、データベースからユーザを検索する
const findUserBySearchWord = async (currentUserID, searchWord) => {
  const prepare = sql`
  SELECT users.*,
  CASE WHEN relationships.followed_id IS NULL THEN 0 ELSE 1 END AS is_following
  FROM users
  LEFT JOIN relationships
  ON relationships.follower_id = $currentUserID AND relationships.followed_id = users.id
  WHERE users.is_deleted = 0 AND name LIKE '%' || $searchWord || '%'
  `;
  const param = {
    $currentUserID: currentUserID,
    $searchWord: searchWord,
  };
  return await prepare.execQuery(db, "all", param);
};

// ユーザを退会する（論理削除）と共に、そのユーザの投稿したデータも論理削除
const withdrawalUser = async (userID) => {
  const param = {
    $userID: userID,
  };
  const userPrepare = sql`
  UPDATE users SET is_deleted = 1 WHERE id = $userID
  `;
  const postPrepare = sql`
  UPDATE posts SET is_deleted = 1 WHERE user_id = $userID
  `;

  await userPrepare.execQuery(db, "run", param);
  await postPrepare.execQuery(db, "run", param);
  return null;
};

module.exports = {
  db,
  setSession,
  searchSession,
  deleteSession,
  updateSession,
  getMyTimelinePostsPagenation,
  getAllPostOfUserPagenation,
  getAllUsers,
  insertPost,
  getOnePost,
  getReplyPost,
  deletePost,
  insertUser,
  updateUser,
  findUserSignIn,
  findUserSignUp,
  findUserByUserID,
  findUserBySearchWord,
  withdrawalUser,
};
