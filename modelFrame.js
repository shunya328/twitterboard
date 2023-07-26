const sql = (strings, ...values) => {
  // string:テンプレートリテラルの普通の文字列部分が配列として渡される
  // values:式部分が配列として渡される

  let sqlQuery = "";

  for (let i = 0; i < strings.length; i++) {
    sqlQuery += strings[i];
    if (i < values.length) {
      sqlQuery += values[i];
    }
  }

  const execQuery = function (db, method, param) {
    return new Promise((resolve, reject) => {
      switch (method) {
        case "all":
          db.all(sqlQuery, param, (err, rows) => {
            if (err) {
              return reject(err);
            }
            resolve(rows);
          });
          break;
        case "get":
          db.get(sqlQuery, param, (err, row) => {
            if (err) {
              return reject(err);
            }
            resolve(row);
          });
          break;
        case "run":
          db.run(sqlQuery, param, (err) => {
            if (err) {
              return reject(err);
            }
            resolve(null);
          });
          break;
      }
    });
  };

  const obj = {
    value: sqlQuery,
    execQuery: execQuery,
  };

  return obj;
};

module.exports = {
  sql,
};
