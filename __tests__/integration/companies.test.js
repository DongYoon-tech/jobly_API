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
        VALUES('Walmart', 'Walmart Inc.', 500,'Grocery Store','https://walmart.jpg')
        RETURNING *`);
    company = res.rows[0];

    let job = await db.query(`
        INSERT INTO 
        jobs(title, salary, equity, company_handle)
        VALUES('software engineer', 120000, 0.2, $1)
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
            'testUser', 
            $1, 
            'James', 
            'Bond', 
            'test@gmail.com', 
            'https://test.jpg', 
            true)
        RETURNING username, password, first_name, last_name, email, photo_url, is_admin`, 
        [hashedPassword]);

    const login = await request(app)
        .post('/login')
        .send({
            username: "testUser",
            password: "password123"
        });
    
    user = response.rows[0];
    user.userToken = login.body.token;
    user.currentUsername = jwt.decode(user.userToken).username;
});

describe('GET /companies', () => {
    test('Gets a list of companies', async function() {
        const res = await request(app)
        .get('/companies')
        .send({
            _token: user.userToken
        })
        const companies = res.body.companies;
        expect(companies[0]).toHaveProperty('handle');
        expect(companies[0]).toHaveProperty("name");
        
    })

    test('Unauthorized user gets a list of companies', async function() {
        const res = await request(app)
        .get('/companies')
        expect(res.statusCode).toBe(401)
    })

    test('Companies search function', async function() {
        const res = await request(app)
        .get('/companies/?search=Walmart')
        .send({
            _token: user.userToken
        })
        const companies = res.body.companies;
        expect(companies).toHaveLength(1)
        expect(companies[0].handle).toEqual('Walmart')
        expect(companies[0].name).toEqual('Walmart Inc.')
    })

    test('Check if searches according the min_employees', async function() {
        const res = await request(app)
        .get('/companies/?min_employees=200')
        .send({
            _token: user.userToken
        })
        const companies = res.body.companies;
        expect(companies[0].handle).toEqual('Walmart')
        expect(companies[0].name).toEqual('Walmart Inc.')
    })

    test('Check if searches according the max_employees', async function() {
        const res = await request(app)
        .get('/companies/?max_employees=600')
        .send({
            _token: user.userToken
        })
        const companies = res.body.companies;
        expect(companies[0].handle).toEqual('Walmart')
        expect(companies[0].name).toEqual('Walmart Inc.')
    })

    test('Min_employess should not be greater than max_employees', async function() {
        const res = await request(app)
        .get('/companies/?min_employees=1000&max_employees=5')
        .send({
            _token: user.userToken
        })
        expect(res.statusCode).toBe(400)
    })
});

describe('POST /companies', () => {
    test('Creates a new company', async function() {
        const res = await request(app)
        .post(`/companies`)
        .send({
            handle: "Uber",
            name: "Uber inc.",
            num_employees: 1500,
            description: "Transportation company",
            logo_url:"https://uber.jpg",
            _token: user.userToken
        })
        expect(res.body.company).toHaveProperty('handle');
        expect(res.body.company).toHaveProperty('name');
        expect(res.body.company).toHaveProperty('num_employees');
        expect(res.body.company).toHaveProperty('description');
        expect(res.body.company).toHaveProperty('logo_url');
    })

    test('Unauthorized user creates a new company', async function() {
        const res = await request(app)
        .post(`/companies`)
        .send({
            handle: "Uber",
            name: "Uber inc.",
            num_employees: 1500,
            description: "Transportation company",
            logo_url:"https://uber.jpg",
        })
        expect(res.statusCode).toBe(401)
    })
})

describe('GET /companies/:handle', () =>{
    test('Gets a specific company', async function(){
        const res = await request(app)
        .get(`/companies/Walmart`)
        .send({
            _token: user.userToken
        })

        expect(res.body.company.handle).toEqual('Walmart')
        expect(res.body.company.name).toEqual('Walmart Inc.')
        expect(res.body.company.num_employees).toEqual(500)
        expect(res.body.company.description).toEqual('Grocery Store')
        expect(res.body.company.logo_url).toEqual('https://walmart.jpg')
        expect(res.body.company.jobs[0]).toHaveProperty('id')
        expect(res.body.company.jobs[0]).toHaveProperty('title')
        expect(res.body.company.jobs[0]).toHaveProperty('salary')
        expect(res.body.company.jobs[0]).toHaveProperty('equity')
    })
})

describe('PATCH /companies/:handle', () => {
    test('Update a company info', async function(){
        const res = await request(app)
        .patch(`/companies/Walmart`)
        .send({
            name: 'Ralph inc',
            _token: user.userToken 
        })

        expect(res.body.company.handle).toEqual('Walmart')
        expect(res.body.company.name).toEqual('Ralph inc')
    })

    test('Not allowed handle info', async function(){
        const res = await request(app)
        .patch(`/companies/Walmart`)
        .send({
            handle: 'Ralph',
            name: 'Ralph inc',
            _token: user.userToken 
        })

        expect(res.statusCode).toBe(400)
    })

    test('Not allowed user', async function(){
        const res = await request(app)
        .patch(`/companies/Walmart`)
        .send({
            handle: 'Ralph',
            name: 'Ralph inc',
        })

        expect(res.statusCode).toBe(401)
    })
})

describe('DELETE /companies/:handle', ()=>{
    test('Delete a company', async function(){
        const res = await request(app)
        .delete(`/companies/Walmart`)
        .send({
            _token: user.userToken 
        })
        expect(res.body).toEqual({message: "Company deleted"});
    })

    test('Not allowed user to delete', async function(){
        const res = await request(app)
        .delete(`/companies/Walmart`)
        
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