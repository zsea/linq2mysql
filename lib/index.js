const Linq = require('./linq'), mysql = require('mysql'), uri = require('url');

Linq.prototype.execute = function (sql, values) {
    var pool = this.__pool;
    return new Promise(function (resolve, reject) {
        console.log("SQL:", sql);
        pool.query(sql, values, function (error, results, fields) {
            if (error) {
                reject(error);
            }
            else {
                resolve(results);
            }
        })
    })
}
Linq.prototype.toArray = function () {
    var sql = this.toSql(null, "select");
    return this.execute(sql);
}
Linq.prototype.first = function () {
    this.take(1);
    return this.toArray().then(function (rows) {
        return rows[0];
    });
}
Linq.prototype.update = function (updater, consts) {
    var sql = this.toUpdateSql(updater, consts);
    return this.execute(sql);
}
Linq.prototype.delete = function () {
    var sql = this.toDeleteSql();
    return this.execute(sql);
}
Linq.prototype.insert = function (insertor) {
    var sql = this.toInsertSql(insertor);
    return this.execute(sql);
}
Linq.prototype.count = function () {
    var sql = this.toSql(null, "count");
    return this.execute(sql).then(function (rows) {
        return rows[0].COUNT;
    });
}
Linq.prototype.setPool = function (pool) {
    this.__pool = pool;
    return this;
}
function db(connectionStringOrconnectionObject) {
    var pool = mysql.createPool(connectionStringOrconnectionObject)
    var dbName = null;
    if (typeof connectionStringOrconnectionObject === "object") {
        dbName = connectionStringOrconnectionObject.database;
    }
    else if (typeof connectionStringOrconnectionObject === "string") {
        var url = uri.parse(connectionStringOrconnectionObject);
        dbName = url.pathname.replace(/^\//ig, '');
    }
    this.table = function (table, database) {
        return new Linq(database || dbName).table(table).setPool(pool);
    }
    this.execute = function (sql, values) {
        return new Promise(function (resolve, reject) {
            pool.query(sql, values, function (error, results, fields) {
                if (error) {
                    reject(error);
                }
                else {
                    resolve(results);
                }
            })
        })
    }
}

module.exports = db;
module.exports.SqlTable = Linq.SqlTable;
