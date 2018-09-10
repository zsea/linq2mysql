var linq = require('../lib/linq');
console.log(new linq('test').table('users').leftJoin('scores').on((p,q)=>p.id == q.userid).where({ id: 1 }).where((p,q)=>q.score>10).toSql())