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

function Linq(dbName) {
    if (!dbName) {
        throw new ReferenceError("dbName can't null or undefined");
    }
    var escaper = mysql.escape;
    var tables = [], wheres = [], selects = null, orders = [], groups = null, _skip = null, _take = null;
    var _tables = null;
    this.type = "linq";
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
    this.where = function (lambda, consts) {
        if (typeof lambda === "object") {
            wheres.push(lambda)
        }
        else if (typeof lambda === "function") {
            wheres.push([lambda, consts]);
        }

        return this;
    }
    function _on(lambda, consts) {
        tables[tables.length - 1].on = [lambda, consts];
        this.on = undefined;
        return this;
    }
    this.innerJoin = function (_table) {
        tables.push({ type: "INNER JOIN", table: _table, tableRaw: _table });
        this.on = _on;
        return this;
    }
    this.leftJoin = function (_table) {
        tables.push({ type: "LEFT JOIN", table: _table, tableRaw: _table });
        this.on = _on;
        return this;
    }
    this.rightJoin = function (_table) {
        tables.push({ type: "RIGHT JOIN", table: _table, tableRaw: _table });
        this.on = _on;
        return this;
    }
    this.select = function (lambda) {
        selects = lambda;
        return this;
    }
    this.orderBy = function (lambda) {
        orders = [];
        orders.push([lambda, "asc"]);
        return this;
    }
    this.thenBy = function (lambda) {
        orders.push([lambda, "asc"]);
        return this;
    }
    this.orderByDescending = function (lambda) {
        orders = [];
        orders.push([lambda, "desc"]);
        return this;
    }
    this.thenByDescending = function (lambda) {
        orders.push([lambda, "desc"]);
        return this;
    }
    this.groupBy = function (lambda) {
        groups = lambda;
        return this;
    }
    this.skip = function (num) {
        _skip = num;
        return this;
    }
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
            for (var i = 0; i < tree.values.length; i++) {
                values.push(resolveWhereExpressionTree(tree.values[i]))
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
    function resolveGroup(){
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


        var from = [], joins = [], _wheres = [], fields = "*", _orders = [],_groupby=[];
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
        _groupby=resolveGroup()
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
        if(_groupby&&_groupby.length){
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

Linq.prototype.page = function (size, index) {
    if (!index || index < 0) {
        index = 1;
    }
    return this.skip((index - 1) * size).take(size);
}

function SqlTable(sql) {
    this.type = "sql";
    this.toSql = function () {
        return sql;
    }
}
module.exports = Linq;
module.exports.SqlTable = SqlTable;
