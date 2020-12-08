process.env.NODE_ENV = 'test'

const bcrypt = require("bcrypt");
const request = require("supertest")
const jwt = require("jsonwebtoken");

const app = require("../../app")
const db = require("../../db");


const BCRYPT_WORK_FACTOR = 10;

let company;
let user;


beforeEach(async function() {
    let res = await db.query(`
        INSERT INTO 
        companies (handle, name, num_employees, description, logo_url)
        VALUES('McDonald', 'McDonald Inc.', 1000,'Fast Food','https://mcdonald.jpg')
        RETURNING *`);
    company = res.rows[0];

    let job = await db.query(`
        INSERT INTO 
        jobs(title, salary, equity, company_handle)
        VALUES('Manager', 70000, 0.2, $1)
        RETURNING *
    `, [company.handle])

    company.jobs = job.rows;

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
            'test1', 
            $1, 
            'Joe', 
            'Doe', 
            'joe@gmail.com', 
            'https://joe.jpg', 
            true)
        RETURNING username, password, first_name, last_name, email, photo_url, is_admin`, 
        [hashedPassword]);

    const login = await request(app)
        .post('/login')
        .send({
            username: "test1",
            password: "password123"
        });
    
    user = response.rows[0];
    user.userToken = login.body.token;
    user.currentUsername = jwt.decode(user.userToken).username;
});

describe('GET /jobs', () => {
    test('Gets a list of jobs', async function() {
        const res = await request(app)
        .get('/jobs')
        .send({
            _token: user.userToken
        })
        const jobs = res.body.jobs;
        expect(jobs[0]).toHaveProperty('id');
        expect(jobs[0]).toHaveProperty('title');
        expect(jobs[0]).toHaveProperty('company_handle');
        
    })

    test('Unauthorized user gets a list of jobs', async function() {
        const res = await request(app)
        .get('/jobs')
        expect(res.statusCode).toBe(401)
    })

    test('Jobs search function', async function() {
        const res = await request(app)
        .get('/jobs/?search=Manager')
        .send({
            _token: user.userToken
        })

        const jobs = res.body.jobs;

        expect(jobs).toHaveLength(1)
        expect(jobs[0].title).toEqual('Manager')
        expect(jobs[0].company_handle).toEqual('McDonald')
    })

    test('Check if searches according the salary', async function() {
        const res = await request(app)
        .get('/jobs/?min_salary=60000')
        .send({
            _token: user.userToken
        })

        const jobs = res.body.jobs;
        
        expect(jobs[0].title).toEqual('Manager')
        expect(jobs[0].company_handle).toEqual('McDonald')
    })

    test('Check if searches according the equity', async function() {
        const res = await request(app)
        .get('/jobs/?min_equity=0.1')
        .send({
            _token: user.userToken
        })
        const jobs = res.body.jobs;
        expect(jobs[0].title).toEqual('Manager')
        expect(jobs[0].company_handle).toEqual('McDonald')
    })

});

describe('POST /jobs', () => {
    test('Creates a new job in a company', async function() {
        const res = await request(app)
        .post(`/jobs`)
        .send({
            title: "Front-end Software Engineer",
            salary: 100000,
            equity: 0.1,
            company_handle: "McDonald",
            _token: user.userToken
        })
        expect(res.body.job).toHaveProperty('id');
        expect(res.body.job).toHaveProperty('title');
        expect(res.body.job).toHaveProperty('salary');
        expect(res.body.job).toHaveProperty('equity');
        expect(res.body.job).toHaveProperty('company_handle');
        expect(res.body.job).toHaveProperty('date_posted');
    })

    test('Unauthorized user post a job', async function() {
        const res = await request(app)
        .post(`/jobs`)
        .send({
            title: "Front-end Software Engineer",
            salary: 100000,
            equity: 0.1,
            company_handle: "McDonald"
        })
        expect(res.statusCode).toBe(401)
    })
})

describe('GET /jobs/:id', () =>{
    test('Gets a specific job', async function(){
        let testId = company.jobs[0].id
        const res = await request(app)
        .get(`/jobs/${testId}`)
        .send({
            _token: user.userToken
        })
        expect(res.body.job.title).toEqual('Manager')
        expect(res.body.job.salary).toEqual(70000)
        expect(res.body.job.equity).toEqual(0.2)
        expect(res.body.job.company_handle).toEqual('McDonald')
    })
})

describe('PATCH /jobs/:id', () => {
    test('Update a job info', async function(){
        let testId = company.jobs[0].id
        const res = await request(app)
        .patch(`/jobs/${testId}`)
        .send({
            title: "Front-end Software Engineer",
            salary: 100000,
            equity: 0.1,
            company_handle: "McDonald",
            _token: user.userToken 
        })

        expect(res.body.job.title).toEqual('Front-end Software Engineer')
        expect(res.body.job.salary).toEqual(100000)
        expect(res.body.job.equity).toEqual(0.1)
        expect(res.body.job.company_handle).toEqual('McDonald')
    })

    test('Not allowed id', async function(){
        let testId = company.jobs[0].id
        const res = await request(app)
        .patch(`/jobs/${testId}`)
        .send({
            id: 777,
            title: "Back-end Software Engineer",
            salary: 100000,
            equity: 0.1,
            company_handle: "McDonald",
            _token: user.userToken 
        })

        expect(res.statusCode).toBe(400)
    })

    test('Not allowed user', async function(){
        let testId = company.jobs[0].id
        const res = await request(app)
        .patch(`/jobs/${testId}`)
        .send({
            title: "Front-end Software Engineer",
            salary: 100000,
            equity: 0.1,
            company_handle: "McDonald",
        })

        expect(res.statusCode).toBe(401)
    })
})

describe('DELETE /jobs/:id', ()=>{
    test('Delete a job', async function(){
        let testId = company.jobs[0].id
        const res = await request(app)
        .delete(`/jobs/${testId}`)
        .send({
            _token: user.userToken 
        })
        expect(res.body).toEqual({message: "Job deleted"});
    })

    test('Not allowed user to delete', async function(){
        let testId = company.jobs[0].id
        const res = await request(app)
        .delete(`/jobs/${testId}`)
        
        expect(res.statusCode).toBe(401)
    })
})

afterEach(async function() {
    await db.query("DELETE FROM companies");
    await db.query("DELETE FROM users");
    await db.query("DELETE FROM jobs");  
});

afterAll(async function() {
    await db.end()
})