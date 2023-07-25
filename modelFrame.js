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

  const execQuery = function (db, method, data) {
    return new Promise((resolve, reject) => {
      switch (method) {
        case "all":
          db.all(sqlQuery, (err, rows) => {
            if (err) {
              return reject(err);
            }
            return resolve(rows);
          });
        case "get":
          db.get(sqlQuery, (err, row) => {
            if (err) {
              return reject(err);
            }
            return resolve(row);
          });
        case "run":
          db.run(sqlQuery, (err) => {
            if (err) {
              return reject(err);
            }
            return resolve(null);
          });
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
