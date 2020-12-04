const db = require("../db")
const ExpressError = require("../helpers/ExpressError");
const sqlForPartialUpdate = require("../helpers/partialUpdate");

class Job {

    static async findAll(q){
        let initialQuery = `SELECT id, title, company_handle FROM jobs`;
        let whereQuery = [];

        if(q.search){
            whereQuery.push(`title ILIKE '%${q.search}%'`);
        }

        if(q.min_salary){
            whereQuery.push(`salary > ${+q.min_salary}`)
        }
        if(q.min_equity){
            whereQuery.push(`salary > ${+q.min_equity}`)
        }

        if (whereQuery.length > 0){
            initialQuery += ' WHERE ';
        }

        let finalQuery = initialQuery + whereQuery.join(' AND ') + " ORDER BY id";
        
        const res = await db.query(finalQuery);
        return res.rows;
    }

    static async create(data){
        const res =  await db.query(
            `INSERT INTO jobs (
                title,
                salary,
                equity,
                company_handle)
            VALUES ($1, $2, $3, $4)
            RETURNING id, title, salary, equity, company_handle, date_posted`,
            [
                data.title,
                data.salary,
                data.equity,
                data.company_handle
            ]
        );
            
        return res.rows[0];
    }

    static async findOne(id){
        const res = await db.query(
            `SELECT id, 
            title, 
            salary, 
            equity, 
            company_handle
            FROM jobs
            WHERE id = $1`, [id]
        )
        
        if(res.rows.length ===0) {
            throw new ExpressError(`There is no job with an id: ${id}`, 
            400)
        }

        return res.rows[0];
    }

    static async update(id, data){
        let {query, values} = sqlForPartialUpdate(
            "jobs",
            data,
            "id",
            id
        )
       const res = await db.query(query, values);
       if(res.rows.length === 0){
           throw new ExpressError(`There is no job with an id: ${id}`, 400)
       }

       return res.rows[0]
    }
    
    static async remove(id){
        const res = await db.query(
            `DELETE FROM jobs
            WHERE id = $1
            RETURNING id`,
            [id]
        );

        if(res.rows.length ===0){
            throw new ExpressError(`There is no job with an id: ${id}`,400)
        }
    }
}

module.exports = Job;