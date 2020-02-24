const Linq = require("../lib/")
    , db = new Linq('mysql://root@127.0.0.1/seller?connectionLimit=1');
async function main() {
    try {
        var count = await db.table("agrees").where(p => p.id == 1).each(1, async function () {
            console.log(arguments);
            var x = 2 / 0;
            //console.log(x);
            //throw new Error("aaa");
            await db.table("agrees").first();
        })
    }
    catch (e) { 
        console.log(e);
    }
    console.log("总数", count);
}
main();
//main();
//main();
//main();