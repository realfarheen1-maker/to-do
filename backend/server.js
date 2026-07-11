var db=[]

require('dotenv').config()
const http= require('http')
const mongoose = require('mongoose')

mongoose.connect(process.env.MONGO_URL)
const { stringify } = require('querystring')
const todoSchema = new mongoose.Schema({
    text: String
})
const Todo = mongoose.model("Todo", todoSchema)

const server= http.createServer((req,res)=> {
var str=""
console.log(req.method,req.url)
req.on("data",(data)=>{
 str+=data
})
req.on("end",async ()=>{
    if(req.method=="POST")
        {   var newTodo = new Todo({ text: JSON.parse(str) })
    await newTodo.save() 
        }
        
        res.setHeader("Access-Control-Allow-Origin","*")
        var allTodos = await Todo.find()
        console.log("allTodos",allTodos)
        res.end(JSON.stringify(allTodos.map(t => t.text)))
})

})
server.listen(process.env.PORT || 3000,()=>{
    console.log("server listening")
})