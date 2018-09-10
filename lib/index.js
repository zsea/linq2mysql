const Linq = require('./linq'), mysql = require('mysql'), uri = require('url');

/**
 * 设置日志记录器
 * @param {function} logger - 日志记录器
 * @returns Linq
 */
Linq.prototype.setLogger=function(logger){
    this.logger=logger;
    return this;
}
/**
 * 
 * @param {string} sql - 执行的sql语句
 * @param {Array} [values] - sql语句中占位符对应的值
 * @returns object
 */
Linq.prototype.execute = function (sql, values) {
    var exector = this.__exector,self=this;
    return new Promise(function (resolve, reject) {
        //console.log("SQL:", sql);
        if (self.logger) {
            self.logger(sql, values);
        }
        exector.query(sql, values, function (error, results, fields) {
            if (error) {
                reject(error);
            }
            else {
                resolve(results);
            }
        })
    })
}
/**
 * 根据设置的条件查询数据库，并返回结果
 * @returns Array
 */
Linq.prototype.toArray = function () {
    var sql = this.toSql(null, "select");
    return this.execute(sql);
}
/**
 * 根据设置的条件查询数据库，并返回第一条记录
 * @returns object
 */
Linq.prototype.first = function () {
    this.take(1);
    return this.toArray().then(function (rows) {
        return rows[0];
    });
}
/**
 * 更新数据库中的记录
 * @param {lambda|object} updater - 更新内容
 * @param {object} [consts] - 更新lambda中的常量
 * @returns object
 */
Linq.prototype.update = function (updater, consts) {
    var sql = this.toUpdateSql(updater, consts);
    return this.execute(sql);
}
/**
 * 删除数据库中的内容
 * @returns object
 */
Linq.prototype.delete = function () {
    var sql = this.toDeleteSql();
    return this.execute(sql);
}
/**
 * 
 * @param {object} insertor - 向数据库中写入记录
 * @returns object
 */
Linq.prototype.insert = function (insertor) {
    var sql = this.toInsertSql(insertor);
    return this.execute(sql);
}
/**
 * 统计数量
 * @returns Number
 */
Linq.prototype.count = function () {
    var sql = this.toSql(null, "count");
    return this.execute(sql).then(function (rows) {
        return rows[0].COUNT;
    });
}
/**
 * 设置数sql语句执行对象
 * @param {object} exector - sql语句执行对象
 * @returns Linq
 */
Linq.prototype.setExector = function (exector) {
    this.__exector = exector;
    return this;
}
/**
 * 
 * @param {object|string} connectionStringOrconnectionObject - 数据库连接对象或字符串
 * @param {function} [logger] - 日志记录器
 * @class
 */
function db(connectionStringOrconnectionObject,logger) {
    var pool = mysql.createPool(connectionStringOrconnectionObject)
    var dbName = null;
    if (typeof connectionStringOrconnectionObject === "object") {
        dbName = connectionStringOrconnectionObject.database;
    }
    else if (typeof connectionStringOrconnectionObject === "string") {
        var url = uri.parse(connectionStringOrconnectionObject);
        dbName = url.pathname.replace(/^\//ig, '');
    }
    /**
     * 操作的数据库表
     * @param {string} table - 表名
     * @param {string} [database] - 所在数据库
     * @returns Linq
     */
    this.table = function (table, database) {
        return new Linq(database || dbName).table(table).setExector(pool).setLogger(logger);
    }
    /**
     * 执行一条Sql语句
     * @param {string} sql 
     * @param {Array} [values] - sql语句中占位符对应的值
     * @returns object
     */
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
