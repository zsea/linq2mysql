const Linq = require("../lib/")
    , db = new Linq('mysql://root@127.0.0.1/eshop?connectionLimit=1&supportBigNumbers=true');
async function main() {
    let data=await db.table("items").where({sales:[1,2,3,4,5,"6"],status:"ONSALE"}).toArray();
    console.log(data);
    process.exit();
}
main();
//main();
//main();
//main();