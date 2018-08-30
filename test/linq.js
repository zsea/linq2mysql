const assert=require("power-assert"),linq=require("../lib/linq");

describe("简单语句测试",()=>{
    it("最简单语句",()=>{
        var q=new linq("db");
        q.table("table");
        //q.where(p=>p.a==1);
        var sql=q.toSql();
        //console.log(sql)
        assert(sql=="select * from `db`.`table` as `T1`");
    })
})