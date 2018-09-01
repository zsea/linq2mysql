var linq=require('../lib/linq');

var q=new linq('db');
console.log(q.table('tb').where(p=>p.x==1&&p.y==7).select(p=>{p.x,p.y}).toSql());