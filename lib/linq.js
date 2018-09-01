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
        wheres.push([lambda, consts]);
        return this;
        var data = getEntry(lambda);
        var tree = expression(data.body, data.params, consts || {}, _tables);
        wheres.push(tree);
        return this;
    }
    function _on(lambda, consts) {
        tables[tables.length - 1].on = [lambda, consts];
        this.on = undefined;
        return this;
        var data = getEntry(lambda);
        var tree = expression(data.body, data.params, consts || {}, _tables);
        wheres.push(tree);
        this.on = undefined;
        return this;
    }
    this.innerJoin = function (_table) {
        tables.push({ type: "INNER JOIN", table: _table, tableRaw: _table });
        this.on = on;
        return this;
    }
    this.leftJoin = function (_table) {
        tables.push({ type: "LEFT JOIN", table: _table, tableRaw: _table });
        this.on = on;
        return this;
    }
    this.rightJoin = function (_table) {
        tables.push({ type: "RIGHT JOIN", table: _table, tableRaw: _table });
        this.on = on;
        return this;
    }
    this.select = function (lambda) {
        selects = lambda;
        return this;
    }
    this.orderby = function (lambda) {
        orders = [];
        orders.push([lambda, "asc"]);
        return this;
        var data = getEntry(lambda);
        var tree = expression(data.body, data.params, consts || {}, _tables);
        orders = [];
        if (Array.isArray(tree)) {
            for (var i = 0; i < tree.length; i++) {
                orders.push([tree[i], 'asc']);
            }
        }
        else {
            orders.push([tree, 'asc']);
        }
        return this;
    }
    this.thenBy = function (lambda) {
        orders.push([lambda, "asc"]);
        return this;
        var data = getEntry(lambda);
        var tree = expression(data.body, data.params, consts || {}, _tables);
        if (Array.isArray(tree)) {
            for (var i = 0; i < tree.length; i++) {
                orders.push([tree[i], 'asc']);
            }
        }
        else {
            orders.push([tree, 'asc']);
        }
        return this;
    }
    this.orderByDescending = function (lambda) {
        orders = [];
        orders.push([lambda, "desc"]);
        return this;
        var data = getEntry(lambda);
        var tree = expression(data.body, data.params, consts || {}, _tables);
        orders = [];
        if (Array.isArray(tree)) {
            for (var i = 0; i < tree.length; i++) {
                orders.push([tree[i], 'desc']);
            }
        }
        else {
            orders.push([tree, 'desc']);
        }
        return this;
    }
    this.thenByDescending = function (lambda) {
        orders.push([lambda, "desc"]);
        return this;
        var data = getEntry(lambda);
        var tree = expression(data.body, data.params, consts || {}, _tables);
        if (Array.isArray(tree)) {
            for (var i = 0; i < tree.length; i++) {
                orders.push([tree[i], 'desc']);
            }
        }
        else {
            orders.push([tree, 'desc']);
        }
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
                    return `(${left} not ${tree.operator} ${right})`
                }
                else {
                    return `(${left} ${tree.operator} ${right})`
                }
            }
            else {
                return `(${right})`
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
    this.toSql = function (noOrFunc, mode) {
        //mode = mode || "select";
        var alias_func = null;
        if (noOrFunc && typeof noOrFunc == "string") {
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
         * 开发中，当成select语句处理
         */

        ///生成from
        var from = [], joins = [], _wheres = [], fields = "*";
        for (var i = 0; i < tables.length; i++) {
            var t = tables[i];
            if (t.type == "from") {
                from.push(`(${t.table}) as ${t.alias}`);
            }

            else if (['INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN'].includes(t.type)) {
                var joinItem = [`${t.type} (${t.table}) as ${t.alias}`];
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
            return `(${resolveWhere(w[0], w[1])})`;
        })
        //生成select语句
        fields = resolveFields();

        var sql = [];
        sql.push('SELECT');
        sql.push(fields);
        sql.push(`FROM ${from.join(',')}`);
        if (joins.length) {
            sql.push(joins.join('\r\n'));
        }
        if(_wheres){
            sql.push(`WHERE ${_wheres.join(' AND ')}`);
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

module.exports = Linq;
