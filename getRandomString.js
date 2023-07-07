const crypto = require("crypto");

const getRandomString = (charset, length) => {
  let result = "";

  // 乱数生成用のバッファを作成
  const randomBytes = crypto.randomBytes(length);

  for(let i=0; i < length; i++){
    const randomIndex = randomBytes[i] % charset.length;
    result += charset.charAt(randomIndex);
  }
  return result;
};

const getSessionId = () => {
  return getRandomString("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789", 32);
}

const getFileName = (ext) => {
  return getRandomString("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789", 32) + '.' + ext;
}

module.exports = {
  getRandomString,
  getSessionId,
  getFileName
};
