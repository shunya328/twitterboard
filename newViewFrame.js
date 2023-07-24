const {escapeHTML} = require('./escapeHTML');

// 閉じタグを必要としない（つけてはいけない）要素たち
const singleHTMLTag = [
    'br',
    'hr',
    'img',
    'input',
    'meta',
    'area',
    'base',
    'col',
    'embed',
    'keygen',
    'link',
    'param',
    'source'
]

// 入力をJSON形式(今回はjavascriptのオブジェクト形式)に変換
const e = (tag, attribute, children) => {
  const obj = {
    tag: tag,
    attribute: attribute,
    children: children,
  };
return obj;
};

const isTrue = {
  isTrue: false,
};

const document = e('h1', {'class': isTrue.isTrue ? 'red' : 'black', 'hoge':'fuga'}, [
    e('h2',{},isTrue.isTrue ? ['<>Trueだよ<>'] : [
        e('h3', {}, ['false!!!','なんで？'])
    ]),
    'hogehoge'
])

// JSON形式(今回はjavascriptのオブジェクト形式)をHTML形式に変換
const renderDocument = (document) => {
    const {tag, attribute, children} = document;

    const element = `<${tag}${attribute ? ' ' + Object.entries(attribute).map(([key, value]) => `${key}="${value}"`).join(' ') : ''}>`;

    if(children && children.length > 0) {
        const childElement = children.map(child => {
            if(typeof child !== 'object'){
                const escapedElement = escapeHTML(child); //HTMLエスケープしたものを表示
                return escapedElement;
            } else {
                return renderDocument(child);
            }
        });
        // return `${element}${childElement}</${tag}>`;
        if(singleHTMLTag.includes(tag)){
            return `${element}${childElement.join('')}`
        }else{
            return `${element}${childElement.join('')}</${tag}>`; // 修正: childElementを文字列として結合
        }
    }
}

const render = (res, param) => {
    res.write(renderDocument(param));
}

// console.log(renderDocument(document));

module.exports = {
    e,
    render
}
