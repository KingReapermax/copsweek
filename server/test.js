import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();
const db = new pg.Client({
    user: process.env.DB_USER||'postgres',
    host: process.env.DB_HOST||'localhost',
    database: process.env.DB_DATABASE||'copsweek',
    password: process.env.DB_PASSWORD||'Ikshwak,123',
    port: process.env.DB_PORT||5432,
})
db.connect();

const x = db.query('select task, type from tasks where tasks.email=$1', ['ikshwakgunnoju@gmail.com']);
console.log(x.rows);