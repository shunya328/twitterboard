const generateSessionID = () => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let sessionID = '';
  for (let i = 0; i < 32; i++) {
    sessionID += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return sessionID;
}

module.exports = {
  generateSessionID
}