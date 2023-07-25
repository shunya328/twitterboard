const { sql } = require("./modelFrame");

const followerId = 1;
const userId = 3;

const string = `  
SELECT users.*,
CASE WHEN relationships.followed_id IS NULL THEN 0 ELSE 1 END AS is_following
FROM users
LEFT JOIN relationships
ON relationships.follower_id = ${followerId} AND relationships.followed_id = users.id
WHERE users.is_deleted = 0 AND users.id = ${userId}
`;

console.log(sql`${string}`)

