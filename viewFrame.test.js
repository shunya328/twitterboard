const isTrue = {
    isTrue: false,
  };
  
  const document = e('h1', {'class': isTrue.isTrue ? 'red' : 'black', 'hoge':'fuga'}, [
      e('h2',{},isTrue.isTrue ? ['<>Trueだよ<>'] : [
          e('h3', {}, ['false!!!','なんで？'])
      ]),
      'hogehoge'
  ])
  