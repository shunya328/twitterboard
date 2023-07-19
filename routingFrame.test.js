const { compareUrls } = require("./routingFrame");

// サンプル
const defineUrl = "/users/:userId/true/:page/login/";
const req = {
  method: "GET",
  url: "/users/3/true/5/////////login///////?hoge=123",
};

const compareUrlsTest = () => {
  // test(true, compareUrls("users/:userId/:page", "users/3/5"))
  // test(false, compareUrls("users/:userId/:page", "article/3/1"))
  // test(false, compareUrls("users/:userId/:page", "users/3/5/7/3/3/3/3"))
  test(
    true,
    compareUrls("GET", defineUrl, req, (isMatch, pathParam, queryParam) => {
      console.log(`callback was called. pathParam=${pathParam}, isMatch=${isMatch}, queryParam=${queryParam.hoge}`);
    })
  );
};

const test = (expected, actual) => {
  if (expected === actual) {
    console.log("ok!");
  } else {
    throw new Error(`expected ${expected}, but ${actual}`);
  }
};

//宿題。？の前に'/'があったらどうなるのか？、また、クエリパラメータの部分をそのままパスとして処理しているが、、、これはちゃんと判定しないといけないのでは？

compareUrlsTest();