const express = require("express");
const ExpressError = require("../helpers/ExpressError");

const Job = require("../models/job")
const {authentication, isAdmin} = require("../middleware/auth")
const { validate } = require("jsonschema");
const jobSchemaNew = require("../schemas/jobNew");
const jobSchemaUpdate = require("../schemas/jobUpdate");

const router = new express.Router();

router.post("/",isAdmin, async function(req, res, next){
    try{
        const validation = validate(req.body, jobSchemaNew);
        if(!validation.valid){
            throw new ExpressError(
                validation.errors.map(e => e.stack), 
                400)
        }
        const job = await Job.create(req.body);
        return res.json({job});
    }catch(err){
        return next(err);
    }
})

router.get("/", authentication, async function(req, res, next){
    try{
        const jobs = await Job.findAll(req.query);
        return res.json({jobs});
    }catch(err){
        return next(err);
    }
})

router.get("/:id",authentication, async function (req, res, next) {
    try {
      const job = await Job.findOne(req.params.id);
      return res.json({ job });
    } catch (err) {
      return next(err);
    }
  });

router.patch("/:id",isAdmin, async function (req, res, next) {
    try {
        if("id" in req.body){
            throw new ExpressError("Not allowed",
            400)
        };
      const validation = validate(req.body, jobSchemaUpdate)
      if(!validation.valid){
          throw new ExpressError(
            validation.errors.map(e => e.stack),
            400)
      };
      const job =  await Job.update(req.params.id, req.body);
      return res.json({ job });
    } catch (err) {
      return next(err);
    }
});

router.delete("/:id", isAdmin,async function (req, res, next){
    try{
        await Job.remove(req.params.id);
        return res.json({message: "Job deleted"});
    }catch (err){
        return next(err);
    }
})

module.exports = router;
