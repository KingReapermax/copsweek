create table users(
    id serial primary key,
    name text,
    email text not null unique,
    password text not null
);
create table tasks(
    task_id serial primary key,
    email text not null,
    task text not null,
    type text not null

);

-- alter table tasks
-- add constraint fk_email
-- foreign key (email) references users(email);  --can be done, but deleting of user and task are handled in index.js explicitily, so not neede
