import express from 'express';
import bodyParser from 'body-parser';
import {v4 as uuidv4} from 'uuid';
import dotenv from 'dotenv';
import cors from 'cors';
import bcrypt from 'bcrypt';
import pg from 'pg';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';



dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;
const SECRET = process.env.SECRET||'JHVTR^TIB*niuq8e';
const db = new pg.Client({
    user: process.env.DB_USER||'postgres',
    host: process.env.DB_HOST||'localhost',
    database: process.env.DB_DATABASE||'copsweek',
    password: process.env.DB_PASSWORD||'Ikshwak,123',
    port: process.env.DB_PORT||5432,
})
db.connect();
// let users = db.query('SELECT * FROM users');
// let tasks = db.query('SELECT * FROM tasks');
async function user_tasks(user){
    let tasks = await db.query("select * from tasks where tasks.email=$1", [user.email]);
    return tasks;
}
app.use(cors());
app.use(bodyParser.json());
app.use(cookieParser());
app.set('view-engine', 'ejs');
app.set('views', 'views');
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));

const authenticate = (req, res, next) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ message: "Unauthorized" });

    try {
        const verified = jwt.verify(token, SECRET);
        req.user = verified;
        next();
    } catch (err) {
        return res.status(403).json({ message: "Invalid token" });
    }
};
let users=[];

app.get(['/', '/login'], (req, res) => {
    if (req.cookies.token) {
        return res.redirect('/dashboard');
    }
    res.render('login.ejs');
});
app.get('/dashboard', authenticate, (req, res) => {
    res.render('dashboard.ejs', { tasks: req.user.tasks });
});
app.post('/login', async (req, res) => {
    const {email, password} = req.body;
    const user = users.find(user=> user.email===email);
    if(user==null){
        return res.render('login.ejs', {message: 'User not found'});
    } 
    await bcrypt.compare(password, user.password, (err, result) => {
        if(error){
            return res.render('login.ejs', {message: 'Invalid password'});
        }
        if(result){
            const token = jwt.sign({email: user.email}, SECRET, {expiresIn: '1h'});
            res.cookie('token', token, {httpOnly: true });
            return res.render('/dashboard', {tasks: user.tasks});
        }
    });
});
app.get('/register', (req, res) => {
    res.render('register.ejs');
});
app.post('/register', async (req, res) => {
    const {name, email, password} = req.body;
    const user = users.find(user=> user.email===email);
    if(user!=null){
        return res.render('/register.ejs', {message: 'User already exists'});
    }

    try{
        const hashedPassword = await bcrypt.hash(password, 10);
        users.push({email, password: hashedPassword, tasks: {}});
        console
        res.status(200).redirect('/login');
    } catch(error){
        res.status(502).send({message: 'Error creating user'});
    }
});
app.get('/logout', (req, res) => {
    res.clearCookie('token');
    res.redirect('/login');
});
app.get('/tasks', authenticate, (req, res) => {
    res.json(req.user.tasks);
});
app.post('/tasks', authenticate, (req, res) => {
    const {task} = req.body;
    const taski = {id: uuidv4(), task};
    try{
        req.user.tasks.push(task);
        res.status(201).json({ message: "Task added" });
    }catch(err){
        res.status(500);
    }
});
app.delete('/tasks/:id', authenticate, (req, res) => {
    const {id} = req.params;
    const task = req.user.tasks.find(task => task.id === id);
    if(!task){
        return res.status(404).json({ message: "Task not found" });
    }
    try{
        req.user.tasks = req.user.tasks.filter(task => task.id !== id);
        res.status(200).json({ message: "Task deleted" });
    }catch(err){
        res.status(500).json({ message: "Error deleting task" });
    }
});
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

