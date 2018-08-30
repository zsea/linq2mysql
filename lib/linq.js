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
            return item.alias;
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
        tables.push({ type: "inner join", table: _table, tableRaw: _table });
        this.on = on;
        return this;
    }
    this.leftJoin = function (_table) {
        tables.push({ type: "left join", table: _table, tableRaw: _table });
        this.on = on;
        return this;
    }
    this.rightJoin = function (_table) {
        tables.push({ type: "right join", table: _table, tableRaw: _table });
        this.on = on;
        return this;
    }
    this.select = function (lambda) {
        selects = lambda;
        return this;
        var data = getEntry(lambda);
        var tree = expression(data.body, data.params, consts || {}, _tables);
        if (Array.isArray(tree)) {
            for (var i = 0; i < tree.length; i++) {
                selects.push(tree[i]);
            }
        }
        else {
            selects.push(tree);
        }
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
    this.toSql = function (func) {
        setAlias(func);
        var fields = selects.map(function (item) {
            return item.value;
        });
        var sql = [];
        sql.push('select');
        if (fields.length) {
            sql.push(fields.join(','));
        }
        else {
            sql.push('*');
        }
        sql.push('from');
        var tbs = tables.map(function (t) {
            return `${expression.formater(t.db)}.${expression.formater(t.table)} as ${expression.formater(t.alias)}`
        })
        sql.push(tbs.join(','));
        if (wheres.length) {
            //var ws=
        }
        return sql.join(' ');
    }
}

Linq.prototype.page = function (size, index) {
    if (!index || index < 0) {
        index = 1;
    }
    return this.skip((index - 1) * size).take(size);
}

module.exports = Linq;
