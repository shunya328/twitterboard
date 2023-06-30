const { db } = require('./databaseUtils');

// フォローする
const followingUser = (req, res, currentUserID, followedID) => {
    // relationshipsテーブルにレコード追加
    db.run(
        `INSERT INTO relationships (follower_id, followed_id) VALUES (?,?)`,
        [currentUserID, followedID],
        (err) => {
            if (err) {
                console.error(err.message);
                // エラーハンドリングを行う
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'フォローできませんでした' }));
                return;
            }
            // 現在のページにリダイレクト（直前のリクエストのURLにリダイレクト）
            const previousPageURL = req.headers.referer;
            res.writeHead(302, { 'Location': previousPageURL });
            res.end(JSON.stringify({ message: 'フォローしました' }));
            return;
        });
}

// フォロー解除する
const unfollowUser = (req, res, currentUserID, followedID) => {
    db.run(
        `DELETE FROM relationships WHERE follower_id = ? AND followed_id = ?`,
        [currentUserID, followedID],
        (err) => {
            if (err) {
                console.error(err.message);
                // エラーハンドリングを行う
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'フォロー解除できませんでした' }));
                return;
            }
            // 現在のページにリダイレクト（直前のリクエストのURLにリダイレクト）
            const previousPageURL = req.headers.referer;
            res.writeHead(302, { 'Location': previousPageURL });
            res.end(JSON.stringify({ message: 'フォローを解除しました' }));
            return;
        });
}

// ログイン中のユーザがフォローしているユーザを取得
const getFollowingUser = (req, res, currentUserID, callback) => {
    db.all(
        `SELECT users.*
    FROM users
    INNER JOIN relationships ON relationships.follower_id = ? AND relationships.followed_id = users.id
    WHERE users.is_deleted = 0
    `,
        [currentUserID],
        (err, rows) => {
            if (err) {
                console.error(err.message);
                callback(err, null);
                return;
            }
            callback(null, rows);
        });
}

// ログイン中のユーザのフォロワーユーザを取得
const getFollowerUser = (req, res, currentUserID, callback) => {
    db.all(
        `
        SELECT users.*
        FROM users
        INNER JOIN relationships
        ON relationships.follower_id = users.id AND relationships.followed_id = ?
        WHERE users.is_deleted = 0
        `,
        [currentUserID],
        (err, rows) => {
            if (err) {
                console.error(err.message);
                callback(err, null);
                return;
            }
            callback(null, rows);
        });
}

// 該当のユーザをフォローしているか判定する関数
const isFollowing = (currentUserID, userID) => {
    return new Promise((resolve, reject) => {
        db.get(
            `
        SELECT COUNT(*) AS count
        FROM relationships
        WHERE follower_id = ?
        AND followed_id = ?
        `,
            [currentUserID, userID],
            (err, row) => {
                if (err) {
                    console.error(err.message);
                    reject(err);
                    return;
                }
                const is_following = row.count > 0;
                resolve(is_following);
            });
    });
}

module.exports = {
    followingUser,
    unfollowUser,
    getFollowingUser,
    getFollowerUser,
    isFollowing
}