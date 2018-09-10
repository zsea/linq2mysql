var expression = require("linq2sql"), acorn = require("acorn"), mysql = require('mysql');
function getEntry(expressionTree) {
    var ast = acorn.parse(expressionTree.toString());
    var statement = ast.body[0];
    if (statement.type != "ExpressionStatement") {
        throw new Error("not support ExpressionStatement");
    }
    statement = statement.expression;
    if (statement.type != "ArrowFunctionExpression") {
        throw new Error("not support ArrowFunctionExpression");
    }
    var params = statement.params;
    var body = statement.body;
    return {
        body: body,
        params: params
    }
}
/**
 * Linq实例
 * @class
 * @param {string} dbName - 默认数据库名称
 */
function Linq(dbName) {
    if (!dbName) {
        throw new ReferenceError("dbName can't null or undefined");
    }
    var escaper = mysql.escape;
    var tables = [], wheres = [], selects = null, orders = [], groups = null, _skip = null, _take = null;
    var _tables = null;
    this.type = "linq";
    /**
     * 为表设置别名
     * @param {function} [start] - 序号生成函数 
     */
    function setAlias(start) {
        if (!start) {
            var no = 1;
            start = function () {
                return no++;
            }
        }
        for (var i = 0; i < tables.length; i++) {
            var item = tables[i];
            if (item.tableRaw.type == "linq") {
                item.table = item.tableRaw.toSql(start);
            }
            else if (item.tableRaw.type == "sql") {
                item.table = item.tableRaw.toSql(start);
            }
            else {
                item.table = `${expression.formater(item.db || dbName)}.${expression.formater(item.tableRaw)}`
            }
            item.alias = `T${start()}`;
        }
        _tables = tables.map(function (item) {
            return { value: item.alias };
        });
    }
    /**
     * 添加相关表
     * @param {string|object} table - 添加表
     * @returns Linq
     */
    this.table = function () {
        for (var i = 0; i < arguments.length; i++) {
            var item = arguments[i];
            if (typeof item === "string") {
                tables.push({ type: "from", tableRaw: item, table: item, db: dbName });
            }
            else if (item.type === "sql") {
                tables.push({ type: "from", tableRaw: item, table: null, db: dbName });
            }
            else if (typeof item === "object") {
                var _table = item.table, _db = item.db || dbName;
                tables.push({ type: "from", tableRaw: _table, table: _table, db: _db });
            }
            else {
                throw new TypeError("table type error.");
            }
        }
        //setTables();
        return this;
    }
    /**
     * where查询条件
     * @param {lambda} lambda - 查询条件
     * @param {object} [consts] - 查询条件中使用到的常量值
     * @returns Linq
     */
    this.where = function (lambda, consts) {
        if (typeof lambda === "object") {
            wheres.push(lambda)
        }
        else if (typeof lambda === "function") {
            wheres.push([lambda, consts]);
        }

        return this;
    }
    /**
     * 连接查询的条件
     * @param {lambda} lambda - 查询条件
     * @param {object} [consts] - 查询条件中使用到的常量值
     * @returns Linq
     */
    function _on(lambda, consts) {
        tables[tables.length - 1].on = [lambda, consts];
        this.on = undefined;
        return this;
    }
    /**
     * 内连接
     * @param {string|object|Linq|SqlTable} _table - 连接的表
     * @param {string} [database] - 表所在库名
     * @returns Linq
     */
    this.innerJoin = function (_table, database) {
        tables.push({ type: "INNER JOIN", table: _table, tableRaw: _table, db: database });
        this.on = _on;
        return this;
    }
    /**
     * 左连接
     * @param {string|object|Linq|SqlTable} _table - 连接的表
     * @param {string} [database] - 表所在库名
     * @returns Linq
     */
    this.leftJoin = function (_table, database) {
        tables.push({ type: "LEFT JOIN", table: _table, tableRaw: _table, db: database });
        this.on = _on;
        return this;
    }
    /**
     * 右连接
     * @param {string|object|Linq|SqlTable} _table - 连接的表
     * @param {string} [database] - 表所在库名
     * @returns Linq
     */
    this.rightJoin = function (_table, database) {
        tables.push({ type: "RIGHT JOIN", table: _table, tableRaw: _table, db: database });
        this.on = _on;
        return this;
    }
    /**
     * 字段选择
     * @param {lambda} lambda
     * @returns Linq
     */
    this.select = function (lambda) {
        selects = lambda;
        return this;
    }
    /**
     * 按升序排序的字段
     * @param {lambda} lambda
     * @returns Linq
     */
    this.orderBy = function (lambda) {
        orders = [];
        orders.push([lambda, "asc"]);
        return this;
    }
    /**
     * 按升序排序的字段
     * @param {lambda} lambda
     * @returns Linq
     */
    this.thenBy = function (lambda) {
        orders.push([lambda, "asc"]);
        return this;
    }
    /**
     * 按降序排序的字段
     * @param {lambda} lambda
     * @returns Linq
     */
    this.orderByDescending = function (lambda) {
        orders = [];
        orders.push([lambda, "desc"]);
        return this;
    }
    /**
     * 按降序排序的字段
     * @param {lambda} lambda
     * @returns Linq
     */
    this.thenByDescending = function (lambda) {
        orders.push([lambda, "desc"]);
        return this;
    }
    /**
     * 分组的字段
     * @param {lambda} lambda
     * @returns Linq
     */
    this.groupBy = function (lambda) {
        groups = lambda;
        return this;
    }
    /**
     * 设置忽略的记录条数
     * @param {Number}} num
     * @returns Linq
     */
    this.skip = function (num) {
        _skip = num;
        return this;
    }
    /**
     * 设置获取的记录条数
     * @param {Number}} num
     * @returns Linq
     */
    this.take = function (num) {
        _take = num;
        return this;
    }
    function resolveWhereExpressionTree(tree, not) {
        //var sql;
        if (tree.operator) {
            var left, right;
            if (tree.left) {
                left = resolveWhereExpressionTree(tree.left);
            }
            right = resolveWhereExpressionTree(tree.right, tree.operator === "not");
            if (left) {
                if (not) {
                    return `${left} not ${tree.operator} ${right}`
                }
                else if (tree.operator === "set") {
                    return `${left} = ${right}`
                }
                else {
                    return `${left} ${tree.operator} ${right}`
                }
            }
            else {
                return `${right}`
            }
        }
        else if (tree.type == "field") {
            return tree.value;
        }
        else if (tree.type == "const") {
            return escaper(tree.value);
        }
        else if (tree.type == "array") {
            var values = [];
            for (var i = 0; i < tree.value.length; i++) {
                values.push(resolveWhereExpressionTree(tree.value[i]))
            }
            return `(${values.join(',')})`;
        }
        else if (tree.type == "expression") {
            return `(${resolveWhereExpressionTree(tree.value)})`
        }
        throw new TypeError("unknow expression:" + JSON.stringify(tree));
    }
    function resolveWhere(lambda, consts) {
        var data = getEntry(lambda);
        var tree = expression(data.body, data.params, consts || {}, _tables);
        return resolveWhereExpressionTree(tree);
    }
    function resolveField(field) {
        if (field.type !== "field") {
            throw new TypeError("field type error:" + JSON.stringify(field))
        }
        return field.value;
    }
    function resolveFields() {
        if (selects) {
            var data = getEntry(selects);
            var tree = expression(data.body, data.params, {}, _tables);
            var fields = [];
            if (Array.isArray(tree)) {
                fields = tree.map(resolveField);
            }
            else {
                fields = [resolveField(tree)];
            }
            if (fields.length) {
                return fields.join(",");
            }
        }
        return "*"
    }
    function resolveGroup() {
        if (groups) {
            var data = getEntry(groups);
            var tree = expression(data.body, data.params, {}, _tables);
            var fields = [];
            if (Array.isArray(tree)) {
                fields = tree.map(resolveField);
            }
            else {
                fields = [resolveField(tree)];
            }
            if (fields.length) {
                return fields;
            }
        }
        return [];
    }
    function resolveOrder() {
        var _fields = []
        for (var i = 0; i < orders.length; i++) {
            var data = getEntry(orders[i][0]);
            var tree = expression(data.body, data.params, {}, _tables);
            if (Array.isArray(tree)) {
                throw new TypeError("not support array.")
            }
            else {
                //fields = [resolveField(tree)];
                _fields.push(resolveField(tree) + ' ' + orders[i][1])
            }
        }
        return _fields;
    }

    function getFirstTable() {
        var db = {
            value: tables[0].table
        }
        if (tables[0].db) {
            db.parent = { value: tables[0].db };
        }
        return db;
    }
    function resolveWhereNotAlias(lambda, consts) {
        var data = getEntry(lambda);
        var _table = getFirstTable();
        var tree = expression(data.body, data.params, consts || {}, [_table]);
        return resolveWhereExpressionTree(tree);
    }
    function resolveSet(lambda, consts) {
        var data = getEntry(lambda);
        var _table = getFirstTable();
        var tree = expression(data.body, data.params, consts || {}, [_table]);
        //return resolveWhereExpressionTree(tree);
        if (Array.isArray(tree)) {
            //throw new TypeError("not support array.")
            return tree.map(function (t) {
                return resolveWhereExpressionTree(t);
            })
        }
        else {
            return [resolveWhereExpressionTree(tree)];
        }
    }
    /**
     * 生成Update语句
     * @param {lambda|object} updater - 更新的内容
     * @param {object} [consts] - lambda表达式中所使用的常量
     * @returns string
     */
    this.toUpdateSql = function (updater, consts) {
        var sql = [], tableName = [];
        var firstTable = tables[0];
        if (firstTable.db) {
            tableName.push(expression.formater(firstTable.db));
        }
        if (firstTable.table) {
            tableName.push(expression.formater(firstTable.table));
        }
        sql.push('UPDATE')
        sql.push(tableName.join(expression.spliter));
        sql.push('SET');
        var sets = [];
        if (typeof updater === "object") {
            for (var field in updater) {
                sets.push(`${expression.formater(field)}=${escaper(updater[field])}`)
            }
        }
        else if (typeof updater === "function") {
            sets = resolveSet(updater, consts);
        }
        if (sets.length) {
            sql.push(sets.join(','));
        }
        var _wheres = wheres.map(function (w) {
            return `(${resolveWhereNotAlias(w[0], w[1])})`;
        });
        if (_wheres.length) {
            sql.push(`WHERE ${_wheres.join(' AND ')}`);
        }
        return sql.join(' ');
    }
    /**
     * 生成Insert语句
     * @param {object} inserter - 插入的的内容
     * @returns string
     */
    this.toInsertSql = function (inserter) {
        var sql = [], tableName = [];
        var firstTable = tables[0];
        if (firstTable.db) {
            tableName.push(expression.formater(firstTable.db));
        }
        if (firstTable.table) {
            tableName.push(expression.formater(firstTable.table));
        }
        sql.push('INSERT INTO')
        var fields = [], values = [];
        if (typeof inserter === "object") {
            for (var field in inserter) {
                fields.push(expression.formater(field));
                values.push(escaper(inserter[field]))
            }
        }
        else {
            throw new Error('insert only support object')
        }
        sql.push(`${tableName.join(expression.spliter)}(${fields.join(',')})`);
        sql.push(`VALUES(${values.join(',')})`);
        return sql.join(' ');
    }
    /**
     * 生成delete语句
     * @returns string
     */
    this.toDeleteSql = function () {
        var sql = [], tableName = [];
        var firstTable = tables[0];
        if (firstTable.db) {
            tableName.push(expression.formater(firstTable.db));
        }
        if (firstTable.table) {
            tableName.push(expression.formater(firstTable.table));
        }
        sql.push('DELETE FROM')
        sql.push(tableName.join(expression.spliter));
        var _wheres = wheres.map(function (w) {
            return `(${resolveWhereNotAlias(w[0], w[1])})`;
        });
        if (_wheres.length) {
            sql.push(`WHERE ${_wheres.join(' AND ')}`);
        }
        return sql.join(' ');
    }
    /**
     * 生成select语句
     * @param {Number|function} [noOrFunc] - 表别名开始的序号或者序号生成的函数
     * @param {string} [mode] - 查询语句类型：select/count，默认为select
     * @returns string
     */
    this.toSql = function (noOrFunc, mode) {
        mode = mode || "select";
        var alias_func = null;
        if (noOrFunc && typeof noOrFunc == "function") {
            alias_func = noOrFunc;
        }
        else {
            var start = 1;
            if (!isNaN(start)) {
                start = start;
            }
            if (start < 0) {
                start = 1;
            }
            alias_func = function () {
                return start++;
            }
        }
        setAlias(alias_func);

        /**
         * select语句处理
         */


        var from = [], joins = [], _wheres = [], fields = "*", _orders = [], _groupby = [];
        ///生成from
        for (var i = 0; i < tables.length; i++) {
            var t = tables[i];
            if (t.type == "from") {
                if (t.tableRaw.type == "linq") {
                    from.push(`(${t.table}) as ${t.alias}`);
                }
                if (t.tableRaw.type == "sql") {
                    from.push(`(${t.table}) as ${t.alias}`);
                }
                else {
                    from.push(`${t.table} as ${t.alias}`);
                }
            }

            else if (['INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN'].includes(t.type)) {
                var joinItem = [`${t.type} (${t.table}) as ${t.alias}`];
                if (t.tableRaw.type == "linq") {
                    joinItem = [`${t.type} (${t.table}) as ${t.alias}`];
                }
                else {
                    joinItem = [`${t.type} ${t.table} as ${t.alias}`];
                }
                //var joinOn = [];
                if (t.on) {
                    var on_lambda = t.on[0], on_const = t.on[1];
                    var exps = resolveWhere(on_lambda, on_const);
                    joinItem.push(`ON ${exps}`)
                }
                joins.push(joinItem.join('\r\n'));
            }
        }
        //生成where语句
        _wheres = wheres.map(function (w) {
            if (Array.isArray(w)) {
                return `(${resolveWhere(w[0], w[1])})`;
            }
            else {
                var sets = [];
                for (var field in w) {
                    sets.push(`${expression.formater(tables[0].alias)}.${expression.formater(field)}=${escaper(w[field])}`);
                }
                return sets.join(' AND ');
            }
        })
        //生成select语句
        fields = resolveFields();

        //生成Order by语句
        _orders = resolveOrder();

        //生成Group语句
        _groupby = resolveGroup()
        //生成limit
        var limit = null;
        if (_take !== null || _skip !== null) {
            if (_skip !== null && _take === null) {
                throw new ReferenceError("need set _take.");
            }
            if (_skip !== null && _take !== null) {
                limit = `${_skip},${_take}`;
            }
            else if (_skip === null && _take !== null) {
                limit = `${_take}`;
            }
        }

        var sql = [];
        sql.push('SELECT');
        if (mode == "count") {
            sql.push('count(1) as COUNT');
        }
        else {
            sql.push(fields);
        }
        sql.push(`FROM ${from.join(',')}`);
        if (joins.length) {
            sql.push(joins.join('\r\n'));
        }
        if (_wheres && _wheres.length) {
            sql.push(`WHERE ${_wheres.join(' AND ')}`);
        }
        if (_groupby && _groupby.length) {
            sql.push(`GROUP BY ${_groupby.join(',')}`)
        }
        if (_orders.length) {
            sql.push(`ORDER BY ${_orders.join(',')}`);
        }
        if (limit) {
            sql.push(`LIMIT ${limit}`);
        }

        return sql.join('\r\n');
    }
}
/**
 * 调用skip和take设置分页信息
 * @param {Number} size - 每页记录数量
 * @param {Number} [index] - 开始的页面，默认值1，若值为非正数也取1。
 * @returns Linq
 */
Linq.prototype.page = function (size, index) {
    if (!index || index < 0) {
        index = 1;
    }
    return this.skip((index - 1) * size).take(size);
}
/**
 * 生成Sql虚拟表
 * @param {string} sql - Sql语句
 * @class
 */
function SqlTable(sql) {
    this.type = "sql";
    this.toSql = function () {
        return sql;
    }
}
module.exports = Linq;
module.exports.SqlTable = SqlTable;
