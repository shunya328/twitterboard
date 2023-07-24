function parseAttributes(attributesString) {
  const attributeObj = {};
  const regex = /(\S+?)\s*=\s*"(.*?)"\s*/g;
  let match;
  while ((match = regex.exec(attributesString))) {
    const [_, key, value] = match;
    attributeObj[key] = value;
  }
  return attributeObj;
}

let count = 0;

function htmlToJSON(html) {
  count += count;
  const elementRegex = /^(.*?)(<([^\s>]+)([^>]*)>([\s\S]*?)<\/\3>)(.*?)$/gm;

  const matches = html.match(elementRegex);
  if (!matches) return null;
  console.log("matches:  ", matches);

  const result = [];
  for (const match of matches) {
    const [_, _1, _2, tag, attributesString, content, _3] = elementRegex.exec(match);
    console.log("match:  ", match);
    console.log("_:  ", _);
    console.log("_1:  ", _1);
    console.log("_2:  ", _2);
    console.log("tag:  ", tag);
    console.log("attributeString:  ", attributesString);
    console.log("content:  ", content);
    console.log("_3:  ", _3);
    console.log(".\n.\n");

    const obj = { tag };

    if (attributesString) {
      obj.attribute = parseAttributes(attributesString);
    }

    if (content.trim()) {
      const children = [];
      const childElements = content.match(elementRegex);
      if (childElements) {
        for (const childElement of childElements) {
          children.push(htmlToJSON(childElement));
        }
      } else {
        children.push(content);
      }
      obj.children = children;
    }

    result.push(obj);
  }

  return result;
}

// テスト用のHTMLを作成
const htmlString = `
<h1 class="a">aaa<h2>ccc<h2>ddd</h2></h2>bbb</h1>
  `;

// HTMLをJSON形式に変換
const jsonResult = htmlToJSON(htmlString);

// JSONを表示
console.log(JSON.stringify(jsonResult, null, 2));
