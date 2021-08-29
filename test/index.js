const Linq = require("../lib/")
    , db = new Linq('mysql://root@127.0.0.1/eshop?connectionLimit=1&supportBigNumbers=true',function(sql){
        console.log(sql);
    });
async function main() {
    let data=await db.table("items").where({sales:[1,2,3,4,5,"6"],status:"ONSALE"}).select(p=>p["*"]).toArray();
    //console.log(data);
    process.exit();
}
main();
//main();
//main();
//main();