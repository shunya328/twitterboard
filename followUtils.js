const { db } = require('./databaseUtils');

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
            // ユーザ一覧ページにリダイレクト
            res.writeHead(302, { 'Location': '/users' });
            res.end(JSON.stringify({ message: 'フォローしました' }));
            return;
        });
}

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
            // ユーザ一覧ページにリダイレクト
            res.writeHead(302, { 'Location': '/users' });
            res.end(JSON.stringify({ message: 'フォローを解除しました' }));
            return;
        }
    )
}

module.exports = {
    followingUser,
    unfollowUser
}