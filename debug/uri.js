var uri=require('url')
var url=uri.parse('mysql://user:pass@host/db?debug=true&charset=BIG5_CHINESE_CI&timezone=-0700');
console.log(url);