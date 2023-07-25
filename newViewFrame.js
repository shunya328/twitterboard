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
        if(singleHTMLTag.includes(tag)){
            return `${element}${childElement.join('')}`
        }else{
            return `${element}${childElement.join('')}</${tag}>`; // childElementを文字列として結合
        }
    }
}

const render = (res, param) => {
    res.write(renderDocument(param));
}

// 角さん作
const div = (param, children) => {
    if (arguments.length === 0) {
        param = {};
        children = [];
    }
    if  (arguments.length === 1) {
        if (param instanceof Array) {
            children = param;
            param = {};
        }
        else {
            children = [];
        }
    }
    return e('div', param, children);
}

module.exports = {
    e,
    div,
    render
}
