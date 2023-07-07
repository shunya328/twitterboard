// XSS(クロスサイトスクリプティング)対策
const escapeHTML = (string) => {
  return string
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/`/g, "&#x60;");
};

module.exports = {
  escapeHTML,
};
