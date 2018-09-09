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
```

```insert``` 方法参数只能是一个对象。

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

# 其它

```update```,```insert```,```delete```返回参数请参考[mysql](https://github.com/mysqljs/mysql)。