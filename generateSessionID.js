const crypto = require("crypto");

const generateSessionID = () => {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const length = 32;
  let sessionID = "";

  // 乱数生成用のバッファを作成
  const randomBytes = crypto.randomBytes(length);

  //バッファからランダムなインデックスを取得し、文字列を生成
  // for (let i = 0; i < length; i++) {
  //   sessionID += characters.charAt(
  //     Math.floor(Math.random() * characters.length)
  //   );
  // }
  for(let i=0; i < length; i++){
    const randomIndex = randomBytes[i] % characters.length;
    sessionID += characters.charAt(randomIndex);
  }
  return sessionID;
};

module.exports = {
  generateSessionID,
};
