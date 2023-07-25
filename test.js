// hoge関数の定義
function hoge(input) {
    // 返されるオブジェクトの定義
    const obj = {
      value: input,
      // fugaメソッドを定義
      fuga: function (arg) {
        console.log(`fugaメソッドが呼ばれました！ 引数: ${arg}`);
      },
    };
  
    // 返されるオブジェクトを返す
    return obj;
  }
  
  // hoge関数を呼び出してprepareオブジェクトを作成
  const prepare = hoge('aaa');
  
  // prepareオブジェクトのfugaメソッドを呼び出す
  prepare.fuga('bbb'); // 結果：fugaメソッドが呼ばれました！ 引数: bbb