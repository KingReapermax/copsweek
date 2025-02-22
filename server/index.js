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


app.use(cors());
app.use(bodyParser.json());
app.use(cookieParser());
app.set('view-engine', 'ejs');
app.set('views', 'views');
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
// app.use((err, req, res, next) => {
//     console.error('Backend Error:', err);
//     res.status(500).json({ error: 'Internal Server Error' });
// });

async function user_tasks(email){
    const tasks = await db.query('SELECT * FROM tasks WHERE email=$1', [email]);
    return tasks.rows;
}
async function find_task(email, id){
    const task = await db.query('select * from tasks where email=$1 and task_id=$2', [email, id]);
    return task.rows[0];
}
async function find_user(email){
    const user = await db.query('select * from users where email=$1', [email]);
    return user.rows[0];
}


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
app.get('/dashboard', authenticate, async (req, res) => {
    // console.log(req.user.email, await user_tasks(req.user.email));
    // const tasksi = await user_tasks(req.user.email);
    const tasksi = await user_tasks(req.user.email);
    // console.log(tasksi);
    res.render('dashboard.ejs', {tasks: tasksi});
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
    const data = req.body;
    const name=data.name;
    const email=data.email;
    const password=data.password;

    const result = await db.query('SELECT * FROM users WHERE email=$1', [email.toLowerCase()]);
    // let user = result.rows[0]['name'];
    if(result.length>1){
        return res.render('/login.ejs', {message: 'User already exists'});
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
// app.get('/tasks', authenticate, async (req, res) => {
//     res.json(user_tasks(req.user.email));
// });
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
app.delete('/tasks/:id', authenticate, async (req, res) => {
    const {id} = req.params;
    console.log(id);
    let task;
    try{
        task = await find_task(req.user.email, id);
        await db.query('DELETE FROM tasks WHERE email=$1 and task_id=$2', [req.user.email, id]);
        res.status(200).json({ message: "Task deleted"});
    }catch(err){
        res.status(500).json({ message: "Error deleting task"});
    }
    if(!task){
        return res.status(404).json({ message: "Task not found" });
    }
   
});
app.get('/profile', authenticate, async (req, res) => {
    try{
        const user = await find_user(req.user.email);
        res.render('user.ejs', {user: user.name, email: user.email});
    }catch(err){
        console.log(err);
        res.redirect('/logout');
    }
});
app.post('/profile', authenticate, async (req, res) => {
    const data = req.body;
    const name=data.name;
    // const email=data.email;
    const old_password=data.old_password;
    const new_password=data.new_password;
    // if(!name||!email||!new_password||!old_password){
    //     console.log('All fields are required');
    //     return res.status(400).json({ message: "All fields are required" });
    // }
    
    const user = await find_user(req.user.email);
    const old_user = await find_user(req.user.email);
    console.log(user);
    console.log(old_password);
    bcrypt.compare(old_password, user.password, async (err, result) => {
        if(err){
            console.log('Invalid password in update-profile');
            return res.status(400).json({ message: "Invalid password" });
        }
        if(result){
            const hashedPassword = await bcrypt.hash(new_password, 10);

            await db.query('UPDATE users SET name=$1, email=$2, password=$3 WHERE email=$4', [name, req.user.email, hashedPassword, req.user.email]);
            console.log('from');
            console.log(user);
            console.log('to');
            console.log(old_user); 
            res.status(200).redirect('/profile');
        }else{
            return res.status(400).json({ message: "server error" });
        }
    });
    
});
app.post('/profile_delete', authenticate, async (req, res) => {
    const data = req.body; 
    const ps = data.password;
    console.log(ps); // ✅ Make sure password is received
    if (!ps) {
        return res.status(400).json({ error: 'Password is required' });
    }
    
    try{
        const user = await find_user(req.user.email);
        console.log(user);

        bcrypt.compare(ps, user.password, async(err, result)=>{
            if(err){
                console.log('Invalid password in delete');
                return res.status(400).json({ message: "Invalid password" });
            }
            if(result){

                await db.query('DELETE FROM users WHERE email=$1', [req.user.email]);
                console.log('user deleted');
                res.clearCookie('token');
                res.status(200);
                res.redirect('/logout');    

            } else {
                return res.status(400).json({ message: "Invalid password" });
            }
        })
        
    }catch(err){
        res.status(500).json({ message: "Error deleting user" });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

