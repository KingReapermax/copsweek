import express from 'express';
import bodyParser from 'body-parser';
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


async function user_tasks(email){
    let tasks = await db.query("select (task, type) from tasks where tasks.email=$1", [email]);

    return tasks.rows;
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
        return res.redirect('/logout');
    }
};
// let users=[];

app.get(['/', '/login'], (req, res) => {
    if (req.cookies.token) {
        return res.redirect('/dashboard');
    }
    res.render('login.ejs');
});
app.get('/dashboard', authenticate, (req, res) => {
    res.render('dashboard.ejs', {tasks: user_tasks(req.user.email)});
});
app.post('/login', async (req, res) => {
    const {email, password} = req.body;
    try{
        const result = await db.query('SELECT * FROM users WHERE email=$1', [email.toLowerCase()]);
        let user = result.rows[0];
        if(user==null||result.rows.length!=1){
            return res.render('login.ejs', {message: 'User not found'});
        } 
        bcrypt.compare(password, user.password, (err, result) => {
            if(err){
                return res.render('login.ejs', {message: 'Invalid password'});
            }
            if(result){
                const token = jwt.sign({email: email.toLowerCase()}, SECRET, {expiresIn: '1h'});
                res.cookie('token', token, {httpOnly: true });
                return res.redirect('/dashboard');
            }
        });
    }catch(err){
        res.status(502).send({message: 'Error logging in'});
    }
});
app.get('/register', (req, res) => {
    res.render('register.ejs');
});
app.post('/register', async (req, res) => {
    const {name, email, password} = req.body;
    const result = await db.query('SELECT * FROM users WHERE email=$1', [email.toLowerCase()]);
    // let user = result.rows[0]['name'];
    if(result.length>1){
        return res.render('/register.ejs', {message: 'User already exists'});
    }

    try{
        const hashedPassword = await bcrypt.hash(password, 10);
        // users.push({email, password: hashedPassword, tasks: {}});
    

        await db.query('INSERT INTO users (name, email, password) VALUES ($1, $2, $3)', [name, email.toLowerCase(), hashedPassword]);
        res.status(200).redirect('/login');
        
    } catch(error){
        res.status(502).send({message: 'Error creating user'});
    }
});
app.get('/logout', (req, res) => {
    res.clearCookie('token');
    res.redirect('/login');
});
app.get('/tasks', authenticate, async (req, res) => {
    res.redirect('/dashboard');
});
app.post('/tasks', authenticate, async (req, res) => {
    const task = req.body;
    console.log(task, req.user.email);
    try{
        await db.query('INSERT INTO tasks (task, email, type) VALUES ($1, $2, $3)', [task.task, req.user.email, task.type]);
        
        res.redirect('/dashboard');     
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

