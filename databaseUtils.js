////////////////////////// sqliteデータの機能定義 /////////////////////////
//sqlite利用
const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("twitterboardDatabase.db"); //sqliteデータベースを作成
//画像を保存するためのモジュールを読み込む
const fs = require("fs");
const path = require("path");
// cryptoモジュールの取り込み
const crypto = require("crypto");
// ランダム文字列のファイル名をつくるための関数を呼ぶ
const { getFileName } = require("./getRandomString");

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
const setSession = (session_id, user_id, user_name, user_email, user_profile, user_profile_image, callback) => {
  db.run(
    `
  INSERT INTO sessions (
    session_id, user_id, name, email, profile, profile_image
  ) VALUES (?, ?, ?, ?, ?, ?)
  `,
    [session_id, user_id, user_name, user_email, user_profile, user_profile_image],
    (err) => {
      if (err) {
        callback(err);
        return;
      }
      callback(null);
    }
  );
};

//受け取ったセッションIDのデータを探して突合
const searchSession = (sessionID, callback) => {
  db.get(
    `
  SELECT * FROM sessions WHERE session_id = ?  
  `,
    [sessionID],
    (err, row) => {
      if (err) {
        callback(err, null);
        return;
      }
      callback(null, row);
    }
  );
};

//受け取ったセッションIDのデータを探してレコードを削除
const deleteSession = (sessionID, callback) => {
  db.run(
    `
  DELETE FROM sessions WHERE session_id = ?
  `,
    [sessionID],
    (err) => {
      if (err) {
        console.error(err);
        return;
      }
      callback(null);
    }
  );
};

//受け取ったセッションIDのレコードを探し、アップデートする
const updateSession = (sessionID, newUserProfile, callback) => {
  const { user_id, name, email, profile } = newUserProfile;
  db.run(
    `
UPDATE sessions SET user_id = ?, name = ?, email = ?, profile = ? WHERE session_id = ?
`,
    [user_id, name, email, profile, sessionID],
    (err) => {
      if (err) {
        console.error(err);
        return;
      }
      callback(null);
    }
  );
};

//データベースから全投稿データを取得する関数（ついでにユーザデータも引っ張っています）
const getAllPosts = (callback) => {
  db.all(
    `SELECT posts.id, posts.content, posts.is_deleted, posts.reply_to, posts.image, posts.date,
  users.id AS user_id, users.name, users.email, users.profile, users.profile_image
   FROM posts
   INNER JOIN users ON posts.user_id = users.id`,
    [],
    (err, rows) => {
      if (err) {
        callback(err, null);
        return;
      }
      callback(null, rows);
    }
  );
};

// 自分のタイムライン取得、ページネーション対応
const getMyTimelinePostsPagenation = (currentUserID, currentPage, limit, callback) => {
  const offset = (currentPage - 1) * limit;

  // まず、対象となる投稿の全レコード数を取得する
  db.get(
    `
      SELECT COUNT(DISTINCT posts.id) AS total_count
      FROM posts
      INNER JOIN users ON posts.user_id = users.id
      LEFT JOIN relationships ON posts.user_id = relationships.followed_id
      WHERE (posts.user_id =? OR relationships.follower_id = ?)
      `,
    [currentUserID, currentUserID],
    (err, result) => {
      if (err) {
        console.error(err.message);
        callback(err, null);
        return;
      }
      const totalCount = result.total_count; //レコード数をここに格納

      // ページネーションに対応した、対象となる投稿だけを取得(自身とフォローしているユーザの投稿のみ取得)
      db.all(
        `
      SELECT posts.*, users.name, users.profile_image
      FROM posts
      INNER JOIN users ON posts.user_id = users.id
      WHERE (posts.user_id = ?)
      UNION
      SELECT posts.*, users.name, users.profile_image
      FROM posts
      INNER JOIN relationships ON posts.user_id = relationships.followed_id
      INNER JOIN users ON posts.user_id = users.id
      WHERE (relationships.follower_id = ?)
      ORDER BY posts.date DESC
      LIMIT ? OFFSET ?
      `,
        [currentUserID, currentUserID, limit, offset],
        (err, rows) => {
          if (err) {
            console.error(err.message);
            callback(err, null);
            return;
          }
          callback(null, rows, totalCount); //レコード数もコールバックの引数に渡す
        }
      );
    }
  );
};

// データベースから、あるユーザのすべての投稿を取得する関数
const getAllPostOfUser = (userID, callback) => {
  db.all(
    `
  SELECT posts.*, users.name, users.profile, users.profile_image, users.is_deleted AS user_is_deleted
  FROM posts
  INNER JOIN users ON posts.user_id = users.id
  WHERE posts.user_id = ?
  ORDER BY posts.date DESC
  `,
    [userID],
    (err, rows) => {
      if (err) {
        console.error(err.message);
        callback(err, null);
        return;
      }
      callback(null, rows);
    }
  );
};

// データベースから、あるユーザの全ての投稿を取得する関数（ページネーション機能込み）
const getAllPostOfUserPagenation = (userID, currentPage, limit, callback) => {
  const offset = (currentPage - 1) * limit;

  //まずはレコード数を取得
  db.get(
    `
  SELECT COUNT(*) AS total_count
  FROM posts
  INNER JOIN users ON posts.user_id = users.id
  WHERE posts.user_id = ?
  `,
    [userID],
    (err, result) => {
      if (err) {
        console.error(err.message);
        callback(err, null);
        return;
      }
      const totalCount = result.total_count; //レコード数をここに格納

      //ページネーションに対応したレコードだけを取得
      db.all(
        `
    SELECT posts.*, users.name, users.profile, users.profile_image, users.is_deleted AS user_is_deleted
    FROM posts
    INNER JOIN users ON posts.user_id = users.id
    WHERE posts.user_id = ?
    ORDER BY posts.date DESC
    LIMIT ? OFFSET ?
    `,
        [userID, limit, offset],
        (err, rows) => {
          if (err) {
            console.error(err.message);
            callback(err, null);
            return;
          }
          callback(null, rows, totalCount); //レコード数もコールバックの引数に渡す
        }
      );
    }
  );
};

//データベースから全ユーザデータを取得する関数。ログイン中のユーザがフォローしているユーザかどうかを判定
const getAllUsers = (currentUserID, callback) => {
  db.all(
    `SELECT users.*,
  CASE WHEN relationships.followed_id IS NULL THEN 0 ELSE 1 END AS is_following
  FROM users
  LEFT JOIN relationships
  ON relationships.follower_id = ? AND relationships.followed_id = users.id
  WHERE users.is_deleted = 0`,
    [currentUserID],
    (err, rows) => {
      if (err) {
        callback(err, null);
        return;
      }
      callback(null, rows);
    }
  );
};

//データベースに文字＆画像を同時に投稿する関数
const insertPost = (content, image, reply_to, currentUserID) => {
  return new Promise((resolve, reject) => {
    if (image) {
      //　画像の前準備
      const fileName = getFileName("jpg"); //ランダムな文字列を画像の名前にする
      fs.mkdirSync(path.join(__dirname, "public", "post_images"), {
        recursive: true,
      }); //保存先ディレクトリがない場合、作る
      const imagePath = path.join(__dirname, "public", "post_images", fileName); //画像の保存先
      fs.writeFileSync(imagePath, image, "binary"); //画像を保存する
      // "/public/post_images/3e5f6M5ofDq3rUHblllvVmMDvnqVqZ7d.jpg"のような形式に変換
      const imagePathInDB = imagePath.replace(/.*\/public\//, "/public/");

      // データベースに投稿の情報を格納
      db.run(
        `INSERT INTO posts (user_id, content, image, reply_to) VALUES (?, ?, ?, ?)`,
        [currentUserID, content, imagePathInDB, reply_to],
        (err) => {
          if (err) {
            reject(err);
          } else {
            resolve(imagePathInDB);
          }
        }
      );
    } else {
      const imagePathInDB = null;
      // データベースに投稿の情報を格納
      db.run(
        `INSERT INTO posts (user_id, content, image, reply_to) VALUES (?, ?, ?, ?)`,
        [currentUserID, content, imagePathInDB, reply_to],
        (err) => {
          if (err) {
            reject(err);
          } else {
            resolve(imagePathInDB);
          }
        }
      );
    }
  });
};

// データベース上の特定の投稿を取ってくる関数
const getOnePost = (req, res, postID, callback) => {
  db.get(
    `SELECT posts.*, users.name, users.profile_image
  FROM posts
  INNER JOIN users ON posts.user_id = users.id
  WHERE posts.id = ?`,
    [postID],
    (err, row) => {
      if (err) {
        console.error(err.message);
        callback(err, null);
        return;
      }

      if (!row) {
        const error = new Error("お探しの投稿は見つかりませんでした");
        error.statusCode = 404;
        callback(error, null);
        return;
      }

      callback(null, row);
    }
  );
};

// データベース上の特定の投稿に紐づくリプライをすべて取得する関数
const getReplyPost = (req, res, postID, callback) => {
  db.all(
    `SELECT posts.*, users.name, users.profile_image
  FROM posts
  INNER JOIN users ON posts.user_id = users.id
  WHERE posts.reply_to = ?
  `,
    [postID],
    (err, rows) => {
      if (err) {
        console.error(err.message);
        callback(err, null);
        return;
      }
      callback(null, rows);
    }
  );
};

//データベースの特定の投稿を削除する関数(論理削除)
const deletePost = (req, res, postID, currentUserID) => {
  db.run(`UPDATE posts SET is_deleted = 1 WHERE id = ? AND user_id = ?`, [postID, currentUserID], (err) => {
    if (err) {
      console.error(err.message);
      // エラーハンドリングを行う
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "投稿を削除できませんでした" }));
      return;
    }
    // 現在のページにリダイレクト（直前のリクエストのURLにリダイレクト）
    const previousPageURL = req.headers.referer;
    console.log("deletePostが回りました");
    res.writeHead(302, { Location: previousPageURL });
    // res.end(JSON.stringify({ message: "投稿を削除しました" }));
    return;
  });
};

//データベースに新たにユーザ情報を登録する関数
const insertUser = (userName, userEmail, userPassword, callback) => {
  //パスワードをハッシュ化し、ソルト値も取得
  const { hashedPassword, salt } = hashPasswordWithSalt(userPassword);

  //じつはこのオブジェクトの宣言なくてもうまく動く気がする
  const isUserNameDuplicate = { value: false };
  const isUserEmailDuplicate = { value: false };
  //ユーザ名の重複チェック
  db.get("SELECT COUNT (*) AS count FROM users WHERE name = ?", [userName], (err, row) => {
    if (err) {
      callback(err);
      return;
    }
    if (row.count > 0) {
      console.log("row.count:", row.count);
      const error = new Error("同じユーザ名が既に存在しています");
      callback(error);
      isUserNameDuplicate.value = true;
      return;
    }
    //メールアドレスの重複チェック
    db.get("SELECT COUNT (*) AS count FROM users WHERE email = ?", [userEmail], (err, row) => {
      if (err) {
        callback(err);
        return;
      }
      if (row.count > 0) {
        const error = new Error("同じメールアドレスが既に存在しています");
        callback(error);
        isUserEmailDuplicate.value = true;
        return;
      }
      //ユーザ名・メールのどちらにも重複がない場合、ユーザデータを新規登録
      if (!isUserNameDuplicate.value && !isUserEmailDuplicate.value) {
        db.run(
          `INSERT INTO users (
              name, email, password, salt
              ) VALUES (?, ?, ?, ?)`,
          [userName, userEmail, hashedPassword, salt],
          (err) => {
            if (err) {
              callback(err);
              return;
            }
            callback(null);
          }
        );
      }
    });
  });
};

//データベース上のユーザ情報を変更する関数
const updateUser = (userID, userName, userEmail, userPassword, userProfile, userImage, callback) => {
  //パスワードをハッシュ化し、ソルト値も取得
  const { hashedPassword, salt } = userPassword ? hashPasswordWithSalt(userPassword) : "";

  const isUserNameDuplicate = { value: false };
  const isUserEmailDuplicate = { value: false };
  console.log("updateUserは回っているみたいinupdateUser");

  //ユーザ名の重複チェック
  db.get("SELECT COUNT (*) AS count FROM users WHERE name = ? AND id != ?", [userName, userID], (err, row) => {
    if (err) {
      callback(err);
      return;
    }
    if (row.count > 0) {
      const error = new Error("同じユーザ名が既に存在しています");
      callback(error);
      isUserNameDuplicate.value = true;
      return;
    }

    //メールアドレスの重複チェック
    db.get("SELECT COUNT (*) AS count FROM users WHERE email = ? AND id != ?", [userEmail, userID], (err, row) => {
      if (err) {
        callback(err);
        return;
      }
      if (row.count > 0) {
        const error = new Error("同じメールアドレスが既に存在しています");
        callback(error);
        isUserEmailDuplicate.value = true;
        return;
      }

      //ユーザ名・メールのどちらにも重複がない場合、ユーザデータを更新
      if (!isUserNameDuplicate.value && !isUserEmailDuplicate.value) {
        //ユーザ名、メール、プロフィールはそのまま書き込む
        db.run(
          `
            UPDATE users SET name = ?, email = ?, profile = ? WHERE id =?
            `,
          [userName, userEmail, userProfile, userID],
          (err) => {
            if (err) {
              callback(err);
              return;
            }

            //ここから、パスワードの有無&画像の有無によって条件分岐
            if (userImage) {
              //　画像の前準備
              const fileName = getFileName("jpg"); //ランダムな文字列を画像の名前にする
              fs.mkdirSync(path.join(__dirname, "public", "user_images"), {
                recursive: true,
              }); //保存先ディレクトリがない場合、作る
              const imagePath = path.join(__dirname, "public", "user_images", fileName); //画像の保存先
              fs.writeFileSync(imagePath, userImage, "binary"); //画像を保存する
              // "/public/user_images/3e5f6M5ofDq3rUHblllvVmMDvnqVqZ7d.jpg"のような形式に変換
              const imagePathInDB = imagePath.replace(/.*\/public\//, "/public/");

              if (hashedPassword) {
                db.run(
                  `
                      UPDATE users SET profile_image = ?, password = ?, salt = ? WHERE id = ?
                      `,
                  [imagePathInDB, hashedPassword, salt, userID],
                  (err) => {
                    if (err) {
                      callback(err);
                      return;
                    }
                    callback(null);
                    return;
                  }
                );
              } else if (!hashedPassword) {
                db.run(
                  `
                      UPDATE users SET profile_image = ? WHERE id = ?
                      `,
                  [imagePathInDB, userID],
                  (err) => {
                    if (err) {
                      callback(err);
                      return;
                    }
                    callback(null);
                    return;
                  }
                );
              }
            } else if (hashedPassword && !userImage) {
              db.run(
                `
                    UPDATE users SET password = ?, salt = ? WHERE id = ?
                    `,
                [hashedPassword, salt, userID],
                (err) => {
                  if (err) {
                    callback(err);
                    return;
                  }
                  callback(null);
                  return;
                }
              );
            } else if (!hashedPassword && !userImage) {
              callback(null);
              return;
            }
          }
        );
      }
    });
  });
};

//データベースからユーザを検索する関数(サインインのとき)
const findUserSignIn = (userName, inputPassword, callback) => {
  db.all(`SELECT * FROM users WHERE name = ?`, [userName], (err, rows) => {
    if (err) {
      callback(err);
      return;
    }
    const isVerified = rows[0] ? verifyPassword(inputPassword, rows[0].password, rows[0].salt) : null;

    callback(null, rows[0], isVerified);
  });
};

//データベースからユーザを検索する（サインアップのとき）
const findUserSignUp = (userName, userEmail, userPassword, callback) => {
  db.all(`SELECT * FROM users WHERE name = ? AND email = ?`, [userName, userEmail], (err, rows) => {
    if (err) {
      callback(err);
      return;
    }
    callback(null, rows[0]);
  });
};

// ユーザIDを使ってデータベースからユーザを検索する(自身がフォローしているかどうかも取得)
const findUserByUserID = (currentUserID, userID, callback) => {
  db.all(
    `
  SELECT users.*,
  CASE WHEN relationships.followed_id IS NULL THEN 0 ELSE 1 END AS is_following
  FROM users
  LEFT JOIN relationships
  ON relationships.follower_id = ? AND relationships.followed_id = users.id
  WHERE users.is_deleted = 0 AND users.id = ?
  `,
    [currentUserID, userID],
    (err, rows) => {
      if (err) {
        callback(err);
        return;
      }
      callback(null, rows[0]);
    }
  );
};

// 検索ワードを使って、ユーザ名と突合し(あいまい検索)、データベースからユーザを検索する
const findUserBySearchWord = (currentUserID, searchWord, callback) => {
  db.all(
    `SELECT users.*,
  CASE WHEN relationships.followed_id IS NULL THEN 0 ELSE 1 END AS is_following
  FROM users
  LEFT JOIN relationships
  ON relationships.follower_id = ? AND relationships.followed_id = users.id
  WHERE users.is_deleted = 0 AND name LIKE '%' || ? || '%'
  `,
    [currentUserID, searchWord],
    (err, rows) => {
      if (err) {
        console.error(err);
        callback(err, null);
        return;
      }
      callback(null, rows);
    }
  );
};

// ユーザを退会する（論理削除）と共に、そのユーザの投稿したデータも論理削除
const withdrawalUser = (userID, callback) => {
  db.run(`UPDATE users SET is_deleted = 1 WHERE id = ?`, [userID], (err) => {
    if (err) {
      onsole.error(err);
      callback(err);
      return;
    }
    db.run(`UPDATE posts SET is_deleted = 1 WHERE user_id = ?`, [userID], (err) => {
      if (err) {
        console.error(err);
        callback(err);
        return;
      }
      console.log("withdrawalUserが呼ばれました");
      callback(null);
    });
  });
};

module.exports = {
  db,
  setSession,
  searchSession,
  deleteSession,
  updateSession,
  getAllPosts,
  getMyTimelinePostsPagenation,
  getAllPostOfUser,
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
