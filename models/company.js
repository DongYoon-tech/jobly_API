const db = require("../db")
const ExpressError = require("../helpers/ExpressError");
const sqlForPartialUpdate = require("../helpers/partialUpdate");

class Company {

    static async findAll(q){
        let initialQuery = `SELECT handle, name FROM companies`;
        let whereQuery = [];

        if(q.min_employees >= q.max_employees){
            throw new ExpressError("Min employees should be less than max employees", 400)
        }

        if(q.search){
            whereQuery.push(`name ILIKE '%${q.search}%'`);
        }

        if(q.min_employees){
            whereQuery.push(`num_employees >= ${+q.min_employees}`)
        }
        if(q.max_employees){
            whereQuery.push(`num_employees <= ${+q.max_employees}`)
        }

        if (whereQuery.length > 0){
            initialQuery += ' WHERE ';
        }

        let finalQuery = initialQuery + whereQuery.join(' AND ') + " ORDER BY name";
        
        const res = await db.query(finalQuery);
        return res.rows;
    }

    static async create(data){
        const res =  await db.query(
            `INSERT INTO companies (
                handle,
                name,
                num_employees,
                description,
                logo_url)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING handle, name, num_employees, description, logo_url`,
            [
                data.handle,
                data.name,
                data.num_employees,
                data.description,
                data.logo_url
            ]
        );
            
        return res.rows[0];
    }

    static async findOne(handle){
        const res = await db.query(
            `SELECT handle, 
            name, 
            num_employees, 
            description, 
            logo_url
            FROM companies
            WHERE handle = $1`, [handle]
        )

        
        if(res.rows.length ===0) {
            throw new ExpressError(`There is no company with handle ${handle}`, 
            400)
        }

        const jobsHandle = await db.query(
            `SELECT id,
            title,
            salary,
            equity
            FROM jobs
            WHERE company_handle = $1`,
            [handle]
        )
        const company = res.rows[0]
        company.jobs = jobsHandle.rows
        return company;
    }

    static async update(handle, data){
        let {query, values} = sqlForPartialUpdate(
            "companies",
            data,
            "handle",
            handle
        )
       const res = await db.query(query, values);
       if(res.rows.length === 0){
           throw new ExpressError(`There is no company with an handle ${handle}`, 400)
       }

       return res.rows[0]
    }
    
    static async remove(handle){
        const res = await db.query(
            `DELETE FROM companies
            WHERE handle = $1
            RETURNING handle`,
            [handle]
        );

        if(res.rows.length ===0){
            throw new ExpressError(`There is no company with handle ${handle}`,400)
        }
    }
}

module.exports = Company;