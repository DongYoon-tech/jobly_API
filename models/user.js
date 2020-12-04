const db = require("../db")
const bcrypt = require("bcrypt");
const ExpressError = require("../helpers/ExpressError");
const sqlForPartialUpdate = require("../helpers/partialUpdate");

const BCRYPT_WORK_FACTOR = 10;

class User {

    static async findAll(){
        
        const res = await db.query(`SELECT username, first_name, last_name, email FROM users`);
        return res.rows;
    }

    static async create(data){

        const verifyUser = await db.query(
            `SELECT username 
              FROM users 
              WHERE username = $1`,
            [data.username]
          );
      
          if (verifyUser.rows[0]) {
            throw new ExpressError(
              `There already exists a user with username '${data.username}`,
              400
            );
          }

        const hashedPassword = await bcrypt.hash(data.password, BCRYPT_WORK_FACTOR);
        
        const res =  await db.query(
            `INSERT INTO users (
                username,
                password,
                first_name,
                last_name,
                email,
                photo_url)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING username, password, first_name, last_name, email, photo_url`,
            [
                data.username,
                hashedPassword, 
                data.first_name,
                data.last_name,
                data.email,
                data.photo_url
            ]
        );
            
        return res.rows[0];
    }

    static async findOne(username){
        const res = await db.query(
            `SELECT username, 
            first_name, 
            last_name, 
            email, 
            photo_url
            FROM users
            WHERE username = $1`, [username]
        )
        
        if(res.rows.length ===0) {
            throw new ExpressError(`There is no user with username: ${username}`, 
            400)
        }

        return res.rows[0];
    }

    static async update(username, data){
        let {query, values} = sqlForPartialUpdate(
            "users",
            data,
            "username",
            username
        )
       const res = await db.query(query, values);
       if(res.rows.length === 0){
           throw new ExpressError(`There is no user with an username: ${username}`, 400)
       }

       delete res.rows[0].password;
       return res.rows[0];
    }
    
    static async remove(username){
        const res = await db.query(
            `DELETE FROM users
            WHERE username = $1
            RETURNING username`,
            [username]
        );

        if(res.rows.length ===0){
            throw new ExpressError(`There is no user with an username: ${username}`,400)
        }
    }

    static async authenticate(data){

        const res = await db.query(
            `SELECT username, 
                    password, 
                    first_name, 
                    last_name, 
                    email, 
                    photo_url, 
                    is_admin
              FROM users 
              WHERE username = $1`,
            [data.username]
          );
      
          let user = res.rows[0];
      
          if (user) {
            const auth = await bcrypt.compare(data.password, user.password);
            if (auth) {
              return user;
            }
          }
      
          throw new ExpressError("Invalid Password", 401);

    }
}

module.exports = User;