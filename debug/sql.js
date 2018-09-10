var linq = require('../lib/linq');
console.log(new linq('db').table('tb').where(p => p.x > 2).toSql())