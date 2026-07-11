require('dotenv').config()
const http = require('http')
const crypto = require('crypto')
const mongoose = require('mongoose')

mongoose.connect(process.env.MONGO_URL)

const userSchema = new mongoose.Schema({
    email: { type: String, unique: true },
    password: String
})
const User = mongoose.model("User", userSchema)

const todoSchema = new mongoose.Schema({
    text: String,
    userId: mongoose.Schema.Types.ObjectId
})
const Todo = mongoose.model("Todo", todoSchema)

// in-memory token store: token -> userId
const sessions = new Map()

function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex')
    const hash = crypto.scryptSync(password, salt, 64).toString('hex')
    return salt + ':' + hash
}

function verifyPassword(password, stored) {
    const [salt, hash] = stored.split(':')
    const hashVerify = crypto.scryptSync(password, salt, 64).toString('hex')
    return hash === hashVerify
}

function generateToken() {
    return crypto.randomBytes(32).toString('hex')
}

function getAuthUserId(req) {
    const auth = req.headers['authorization']
    if (!auth || !auth.startsWith('Bearer ')) return null
    return sessions.get(auth.slice(7)) || null
}

function sendJSON(res, status, data) {
    res.writeHead(status, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    })
    res.end(JSON.stringify(data))
}

const server = http.createServer((req, res) => {
    let str = ""
    console.log(req.method, req.url)

    if (req.method === 'OPTIONS') {
        res.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        })
        return res.end()
    }

    req.on("data", (data) => { str += data })
    req.on("end", async () => {
        // Register
        if (req.method === 'POST' && req.url === '/register') {
            const { email, password } = JSON.parse(str)
            if (!email || !password) return sendJSON(res, 400, { error: 'Email and password required' })
            const existing = await User.findOne({ email })
            if (existing) return sendJSON(res, 400, { error: 'Email already registered' })
            await new User({ email, password: hashPassword(password) }).save()
            return sendJSON(res, 201, { message: 'Registered successfully' })
        }

        // Login
        if (req.method === 'POST' && req.url === '/login') {
            const { email, password } = JSON.parse(str)
            const user = await User.findOne({ email })
            if (!user || !verifyPassword(password, user.password))
                return sendJSON(res, 401, { error: 'Invalid email or password' })
            const token = generateToken()
            sessions.set(token, user._id.toString())
            return sendJSON(res, 200, { token })
        }

        // All todo routes require a valid token
        const userId = getAuthUserId(req)
        if (!userId) return sendJSON(res, 401, { error: 'Unauthorized - please login' })

        // Delete todo
        if (req.method === 'DELETE') {
            const { id } = JSON.parse(str)
            await Todo.findOneAndDelete({ _id: id, userId })
            const allTodos = await Todo.find({ userId })
            return sendJSON(res, 200, allTodos.map(t => ({ id: t._id, text: t.text })))
        }

        // Add todo
        if (req.method === 'POST') {
            await new Todo({ text: JSON.parse(str), userId }).save()
        }

        // Get todos (GET or after POST)
        const allTodos = await Todo.find({ userId })
        return sendJSON(res, 200, allTodos.map(t => ({ id: t._id, text: t.text })))
    })
})

server.listen(process.env.PORT || 3000, () => {
    console.log("server listening")
})
