const { db } = require('./databaseUtils');

const followingUser = (req, res, currentUserID, followedID) => {
    // const followedID = req.params.id; // URLのIDを取得。フォローされる側のユーザIDを格納

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

module.exports = {
    followingUser
}