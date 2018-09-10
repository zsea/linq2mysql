var linq = require('../lib/index');
var db = new linq("mysql://root@127.0.0.1/linq?connectionLimit=10", function (sql, values) {
    console.log(sql);
});
process.on('unhandledRejection', function (reason, p) {
    console.error("Promise中有未处理的错误", p, " 错误原因: ", reason);
    // application specific logging, throwing an error, or other logic here
    setTimeout(function () {
        process.exit(1);
    }, 5000)
});
async function main(params) {
    /*
    await db.table('users').insert({
        username:'admin',
        password:'admin888',
        age:39
    })*/
    //await db.table("users").where(p=>p.age==0).update({age:10});
    /*
    var users=await db.table('users').where(p=>p.age>=0).toArray();
    console.log(users);
    users=await db.table('users').where(p=>p.username=="'").toArray();
    console.log(users);
    users=await db.table('users').leftJoin('scores').on((p,q)=>p.id==q.userid).where(p=>p.age>=0).select((p,q)=>{
        p.id,
        p.username,
        p.password,
        p.age,
        q.score
    }).toArray();
    console.log(users);
    users=await db.table('users').innerJoin('scores').on((p,q)=>p.id==q.userid).where(p=>p.age>=0).select((p,q)=>{
        p.id,
        p.username,
        p.password,
        p.age,
        q.score
    }).toArray();
    console.log(users);
    */
    /*
    await db.table("scores").where(p=>p.userid==1).update(p=>{
        p.score=p.score+1
    })
    */
    /*
    await db.table("scores").where(p=>p.userid==1).update(p=>{
      p.score=99
  })
  */
    /*
    var count=await db.table("scores").where(p=>p.userid==1).count();
    console.log(count)
    var users=await db.table('users').innerJoin('scores').on((p,q)=>p.id==q.userid).where(p=>p.age>=0).orderByDescending(p=>p.id).select((p,q)=>{
        p.id,
        p.username,
        p.password,
        p.age,
        q.score
    }).toArray();
    console.log(users);
    */
    /*
     var users = await db.table('users').innerJoin('scores').on((p, q) => p.id == q.userid).where(p => p.age >= 0).orderByDescending(p => p.id).thenBy(p=>p.id).select((p, q) => {
         p.id,
             p.username,
             p.password,
             p.age,
             q.score
     }).toArray();
     console.log(users);
     */
    /*
    var users = await db.table('users').innerJoin('scores').on((p, q) => p.id == q.userid).where(p => p.age >= 0).orderByDescending(p => p.id).thenBy(p => p.id).select((p, q) => {
        p.id,
            p.username,
            p.password,
            p.age,
            q.score
    }).skip(1).take(1).toArray();
    console.log(users);
    */
    /*
     var user = await db.table('users').innerJoin('scores').on((p, q) => p.id == q.userid).where(p => p.age >= 0).orderByDescending(p => p.id).thenBy(p => p.id).select((p, q) => {
         p.id,
             p.username,
             p.password,
             p.age,
             q.score
     }).first();
     console.log(user);
     */

    //测试group by
    var user = await db.table('users').where({ id: 1 }).update({id:1});
    console.log(user);
    process.exit();
}
main();