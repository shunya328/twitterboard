const { routing } = require("./routingFrame");

// サンプル
const defineUrl = "/";
const req = {
  method: "GET",
  url: "/",
};

const compareUrlsTest = () => {
  // test(true, compareUrls("users/:userId/:page", "users/3/5"))
  // test(false, compareUrls("users/:userId/:page", "article/3/1"))
  // test(false, compareUrls("users/:userId/:page", "users/3/5/7/3/3/3/3"))
  test(
    true,
    compareUrls("GET", defineUrl, req, (pathParam, queryParam) => {
      console.log(`callback was called. pathParam=${pathParam}`);
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

compareUrlsTest();