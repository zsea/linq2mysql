var linq=require('../lib/linq');

var q=new linq('db');
console.log(q.table('tb').where(p=>p.x==1&&p.y==7).select(p=>{p.x,p.y}).toSql());
console.log('=============');
var db=new linq('db').table('tb').where(p=>p.x==1&&p.y==7).select(p=>p.x);
console.log(new linq('db').table('tb').leftJoin(db).on((q,p)=>q.x==p.x).where((q,p)=>p.x==1&&p.y==7).select(p=>{p.x,p.y}).toSql());
console.log('=============');
console.log(new linq('db').table('tb').where(p=>p.x==1&&p.y==7).orderBy(p=>p.x).thenByDescending(p=>p.y).select(p=>p.x).toSql())