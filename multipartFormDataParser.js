//マルチパートフォームデータを処理するためのヘルパー関数たちを宣言
function extractBoundary(contentType) {
  const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  return boundaryMatch && (boundaryMatch[1] || boundaryMatch[2]);
}

function parseFormData(body, boundary) {
  const formData = {};
  const parts = body.split(`--${boundary}`); //仕様で決まっていないかも「--」

  // 最初と最後のパートは境界線のみのデータなので無視する
  for (let i = 1; i < parts.length - 1; i++) {
    const part = parts[i].trim();

    // パートのヘッダーとコンテンツを分割する
    const [header, content] = part.split("\r\n\r\n");
    const nameMatch = header.match(/name="([^"]+)"/);

    if (nameMatch) {
      const fieldName = nameMatch[1];
      // formData[fieldName] = Buffer.from(content, 'binary').toString('utf-8');
      formData[fieldName] = content;
    }
  }
  return formData;
}

module.exports = {
  extractBoundary,
  parseFormData,
};
