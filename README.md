# 介绍

在Nodejs中，使用Linq语法查询Mysql数据库。

# 入门

## 安装

```
npm install --save linq2mysql
```

## 使用

```javascript
var linq = require('linq2mysql');
var db = new linq("mysql://root@127.0.0.1/linq?connectionLimit=10");
```

具体数据库连接参数请参考[mysql](https://github.com/mysqljs/mysql)。

## 查询

### where

查询条件使用```where```方法添加，可以级联多个```where```条件，多个```where```方法调用生成的SQL语句用**AND**进行连接。

```where```参数可以是**lambda**表达式，也可以是一个对象。对象各字段条件用**AND**语句连接，单个```key```转换为```=```。

关于where的更多内容请参考[linq2sql](https://github.com/zsea/linq2sql)。

### 基础查询

```javascript
await db.table("users").where(p=>p.age==0).toArray()
```
### 带变量的查询

```javascript
await db.table("users").where(p=>p.age==age,{age:0}).toArray()
```

### 只返回第一个数据

```javascript
await db.table("users").where(p=>p.age==0).first()
```

### 统计

```javascript
await db.table("users").where(p=>p.age==0).count()
```

### 分页

```javascript
await db.table("users").where(p=>p.age==0).skip(1).take(1).toArray()
```

### 返回指定字段

```javascript
await db.table("users").where(p=>p.age==0).select(p=>{p.age,p.id}).toArray()
```

### 查询大量数据

当数据量特别大的时候，如果直接返回大量数据，将会造成溢出。

```javascript
await db.table("users").where(p=>p.age==0).each(function(row){});
await db.table("users").where(p=>p.age==0).each(async function(row){});
await db.table("users").where(p=>p.age==0).each(10,function(row){});
```

each方法共有两个参数：

* 第一个参数:指定并发处理的数量，该参数可以省略。
* 第二个参数:指定处理的函数，当函数返回```false```取消后续的执行。

each方法返回值为已处理的总行数。

**返回值受javascript数据类型大小限制**

### 排序

排序共有四个方法：
* orderBy - 升序
* thenBy - 升序
* orderByDescending - 降序
* thenByDescending - 降序

### 链接

支持左链接、右链接、内链接

* leftJoin
* rightJoin
* innerJoin

链接方法返回的对象支持```on```方法，用于添加链接条件；```on```方法返回的对象不再具有```on```方法。

```javascript
await db.table('users').leftJoin('scores').on((p,q)=>p.id==q.userid).where(p=>p.age>=0).select((p,q)=>{
        p.id,
        p.username,
        p.password,
        p.age,
        q.score
    }).toArray();
```

## Insert

```javascript
await db.table('users').insert({
        username:'admin',
        password:'admin888',
        age:39
    })
await db.table('users').insert([{
        username:'admin',
        password:'admin888',
        age:39
    },{
        username:'admin',
        password:'admin888',
        age:39
    }])
```

```insert``` 方法参数可以是一个对象或数组。

## Update

```javascript
await db.table("users").where(p=>p.age==0).update({age:10});
await db.table("scores").where(p=>p.userid==1).update(p=>{
        p.score=p.score+1
    });
```

## Delete

```javascript
await db.table("users").where(p=>p.age==0).delete()
```

## Count

```javascript
var count=await db.table("scores").where(p=>p.userid==1).count();
```

## Exists

判断指定的查询条件是否在数据库中有数据。

```javascript
var exists=await db.table("scores").where(p=>p.userid==1).exists();
```

## SqlTable

在查询的时候，可以使用SQL语句做为一个虚拟表。

```javascript
var items=await db.table(new linq.SqlTable('select * from scores where score>10')).where(p=>p.userid==1).toArray();
```

## 更新或插入对象

在某些时候，我们需要判断指定查询条件的在数据库中是否有值，在有的时候调用更新语句，没有的时候调用写入语句。

```javascript
await db.table("scores").where({ id: 1 }).insertOrUpdate({ userid: 1, score: 50 });
await db.table("scores").where({ id: 1 }).insertOrUpdate({ userid: 1, score: 50 }, function (e, m) {
        return {
            entity: { userid: 1, score: 99 },
            mode: "INSERT"
        }
    })
```

```insertOrUpdate```方法有两入参数，```insertOrUpdate(entity,handler)```

* entity 要插入或更新的对象
* handler 在更新或插入对象前，对对象数据进行处理，```handler```有两个参数```handler(entity,mode)```,```entity```是```insertOrUpdate```方法传入的数据对象，```mode```是将进行的操作```UPDATE```或```INSERT```。返回值是一个对象，有两个属性：```entity```是要插入或更新的对象，```mode```是将要进行的操作，可选值同上。

## db.table

该方法返回一个Linq实例，只有在调用```count```,```insert```,```delete```,```update```,```first```,```toArray```,```exists```,```insertOrUpdate```，才会返回数据，其它方法均返回对象本身。

### 参数

* table - 可以是表名称，SqlTable对象和db.table实例。
* [database] - 指定库名称，默认为链接字符串中指定的库名。

## db.execute

执行sql语句，并返回结果。

```javascript
await db.execute(sql,[values]);
```

## db.each

执行sql语句，并通过流模式处理返回的数据。

```javascript
await db.each(sql,[values],[max],callback);
```

# 事务

```MyISAM```引擎不支持事务操作。

## 开始一个事务

```javascript
let trans = await db.beginTransaction();
```

事务开始后，你可以像```db```一样进行数据库操作

## 提交事务

```javascript
await trans.commit();
```

## 回滚事务

```javascript
await trans.rollback();
```

*无论是提交还是回滚事务，当前事务的连接都将释放回链接池中。*

# 其它

```update```,```insert```,```delete```返回参数请参考[mysql](https://github.com/mysqljs/mysql)。

在连接参数中指定```supportBigNumbers```而没有指定```bigNumberStrings```时，```bigint```类型的数据将被转换为Javascript中的```BigInt```类型。