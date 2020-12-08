process.env.NODE_ENV = 'test'

const bcrypt = require("bcrypt");
const request = require("supertest")
const jwt = require("jsonwebtoken");

const app = require("../../app")
const db = require("../../db");


const BCRYPT_WORK_FACTOR = 10;


let user;


beforeEach(async function() {

    const hashedPassword = await bcrypt.hash('password123', BCRYPT_WORK_FACTOR);

    let response = await db.query(`
        INSERT INTO users (
            username, 
            password, 
            first_name, 
            last_name, 
            email, 
            photo_url, 
            is_admin)
        VALUES (
            'test2', 
            $1, 
            'Jim', 
            'Doe', 
            'jim@gmail.com', 
            'https://jim.jpg', 
            true)
        RETURNING username, password, first_name, last_name, email, photo_url, is_admin`, 
        [hashedPassword]);

    const login = await request(app)
        .post('/login')
        .send({
            username: "test2",
            password: "password123"
        });

    user = response.rows[0];
    user.userToken = login.body.token;
    user.currentUsername = jwt.decode(user.userToken).username;
});

describe('GET /users', () => {
    test('Gets a list of users', async function() {
        const res = await request(app).get('/users')
        
        const users = res.body.users;
        expect(users[0]).toHaveProperty('username');
        expect(users[0]).toHaveProperty('first_name');
        expect(users[0]).toHaveProperty('last_name');
        expect(users[0]).toHaveProperty('email');
        
    })

});

describe('POST /users', () => {
    test('Creates a new user', async function() {
        const res = await request(app)
        .post(`/users`)
        .send({
            username: "Pikachu",
            password: "pokemon",
            first_name: "pika",
            last_name: "yellow",
            email: "pikachu@gmail.com",
            photo_url: "https://pikachu.jpg",
            is_admin: true,
        })
        expect(res.body).toHaveProperty('token');
    })

    test('Already used username check', async function() {
        const res = await request(app)
        .post(`/users`)
        .send({
            username: "test2",
            password: "pokemon",
            first_name: "pika",
            last_name: "yellow",
            email: "pikachu@gmail.com",
            photo_url: "https://pikachu.jpg",
            is_admin: true,
        })
        expect(res.statusCode).toBe(400)
    })
})

describe('GET /users/:username', () =>{
    test('Gets a specific user', async function(){
        const res = await request(app)
        .get(`/users/test2`)
   
        expect(res.body.user.username).toEqual('test2')
        expect(res.body.user.first_name).toEqual('Jim')
        expect(res.body.user.last_name).toEqual('Doe')
        expect(res.body.user.email).toEqual('jim@gmail.com')
        expect(res.body.user.photo_url).toEqual('https://jim.jpg')

    })
})

describe('PATCH /users/:username', () => {
    test('Update user info', async function(){
        
        const res = await request(app)
        .patch(`/users/test2`)
        .send({
            password: "pokemon",
            first_name: "pika",
            last_name: "yellow",
            email: "pikachu@gmail.com",
            photo_url: "https://pikachu.jpg",
            is_admin: true,
            _token: user.userToken 
        })

        expect(res.body.user.username).toEqual('test2');
        expect(res.body.user.first_name).toEqual('pika');
        expect(res.body.user.last_name).toEqual('yellow');
        expect(res.body.user.email).toEqual('pikachu@gmail.com');
        expect(res.body.user.photo_url).toEqual('https://pikachu.jpg');
    })

    test('Not allowed username in request', async function(){
        const res = await request(app)
        .patch(`/users/test2`)
        .send({
            username:'test2',
            password: "pokemon",
            first_name: "pika",
            last_name: "yellow",
            email: "pikachu@gmail.com",
            photo_url: "https://pikachu.jpg",
            is_admin: true,
            _token: user.userToken 
        })

        expect(res.statusCode).toBe(400)
    })

    test('Not allowed user to update', async function(){
        const res = await request(app)
        .patch(`/users/test2`)
        .send({
            username:'test2',
            password: "pokemon",
            first_name: "pika",
            last_name: "yellow",
            email: "pikachu@gmail.com",
            photo_url: "https://pikachu.jpg",
            is_admin: true,
        })

        expect(res.statusCode).toBe(401)
    })
})

describe('DELETE /users/:username', ()=>{
    test('Delete user', async function(){
        const res = await request(app)
        .delete(`/users/test2`)
        .send({
            _token: user.userToken 
        })
        expect(res.body).toEqual({message: "User deleted"});
    })

    test('Not allowed user to delete', async function(){
        const res = await request(app).delete(`/users/test2`)
        
        expect(res.statusCode).toBe(401)
    })
})

afterEach(async function() {
    await db.query("DELETE FROM users");

});

afterAll(async function() {
    await db.end()
})