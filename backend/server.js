var db=[]


const http= require('http')
const { stringify } = require('querystring')
const server= http.createServer((req,res)=> {
var str=""
console.log(req.method,req.url)
req.on("data",(data)=>{
 str+=data
})
req.on("end",()=>{
    if(req.method=="POST")
        { db.push(JSON.parse(str))   
        }
        
        res.setHeader("Access-Control-Allow-Origin","*")
        res.end(JSON.stringify (db))
})

})
server.listen(3000,()=>{
    console.log("server listening")
})