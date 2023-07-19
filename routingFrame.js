const url = require("url");

// // サンプル
// const defineUrl = "users/:userId/:page";
// // const reqUrl = "users/3/5";
// const req = {
//   method: "GET",
//   url: "users/37/3/",
// };

// '/'で区切られた文字列を配列として取り出し、配列の長さだけfor文で回し、それぞれの要素同士で正誤判定を行う
const routing = (httpMethod, defineUrl, req, callback) => {
  let isMatch = true; // ルーティングが成功したかの判定
  let pathParam = {}; // パスパラメータを格納するオブジェクト
  const integerRegex = /^\d+$/; // パスパラメータが数字かどうか判定するため、正の数字を正規表現で表したもの

  // HTTPメソッドの判定
  if (httpMethod != req.method) {
    isMatch = false;
  }

  // クエリパラメータの判定と格納を実装する必要がある
  const queryParam = url.parse(req.url, true).query;

  // 複数の連続した'/'を、ひとつの'/'にまとめる。そして、最初の'?'より左側のurl部分のみ抜き出す。
  const queryIndex = req.url.indexOf('?');
  const normalizedUrl = req.url.replace(/\/+/g, '/');
  const onlyUrl = queryIndex !== -1 ? normalizedUrl.split('?')[0] : normalizedUrl;

  // リクエストURLの判定(末尾にひとつ'/'があっても、それをなかったことにします)
  const defineParts = defineUrl.endsWith("/") ? defineUrl.slice(0, -1).split("/") : defineUrl.split("/");
  const reqParts = onlyUrl.endsWith("/") ? onlyUrl.slice(0, -1).split("/") : onlyUrl.split("/");

  const urlLength = defineParts.length > reqParts.length ? defineParts.length : reqParts.length;
  for (let i = 0; i < urlLength; i++) {
    const definePart = defineParts[i];
    const reqPart = reqParts[i];

    // 先頭の'/'でsplitされたものは''(空文字)となるため、これを発見したらcontinueする
    if(i === 0 && !definePart && !reqPart){continue}

    // :idのような部分のパスパラメータが正の整数であれば、pathParamに追加する
    if (definePart && definePart.startsWith(":") && integerRegex.test(reqPart)) {
      pathParam = {
        ...pathParam,
        [definePart.split(':')[1]]:parseInt(reqPart)
      }
      continue;
    }

    if (definePart !== reqPart) {
      isMatch = false;
    }
  }

  if (isMatch) {
    callback(pathParam, queryParam);
    return isMatch;
  }
};

module.exports = {
  routing,
};
