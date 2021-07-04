const Linq = require("../lib/")
    , db = new Linq('mysql://root@127.0.0.1/eshop?connectionLimit=1&supportBigNumbers=true');
async function main() {
    let data=await db.table("items").toArray();
    console.log(data);
    process.exit();
}
main();
//main();
//main();
//main();