const express = require("express");
const ExpressError = require("../helpers/ExpressError");

const Company = require("../models/company")
const {authentication, isAdmin} = require("../middleware/auth")
const { validate } = require("jsonschema");
const companySchemaNew = require("../schemas/companyNew");
const companySchemaUpdate = require("../schemas/companyUpdate");

const router = new express.Router();

router.get("/",authentication, async function(req, res, next){
    try{
        const companies = await Company.findAll(req.query);
        return res.json({companies});
    }catch(err){
        return next(err);
    }
})

router.post("/",isAdmin, async function(req, res, next){
    try{
        const validation = validate(req.body, companySchemaNew);
        if(!validation.valid){
            throw new ExpressError(
                validation.errors.map(e => e.stack), 
                400)
        }
        const company = await Company.create(req.body);
        return res.json({company});
    }catch(err){
        return next(err);
    }
})

router.get("/:handle",authentication, async function (req, res, next) {
    try {
      const company = await Company.findOne(req.params.handle);
      return res.json({ company });
    } catch (err) {
      return next(err);
    }
  });

router.patch("/:handle", isAdmin,async function (req, res, next) {
    try {
        if("handle" in req.body){
            throw new ExpressError("Not allowed",
            400)
        };
      const validation = validate(req.body, companySchemaUpdate)
      if(!validation.valid){
          throw new ExpressError(
            validation.errors.map(e => e.stack),
            400)
      };
      const company =  await Company.update(req.params.handle, req.body);
      return res.json({ company });
    } catch (err) {
      return next(err);
    }
});

router.delete("/:handle",isAdmin, async function (req, res, next){
    try{
        await Company.remove(req.params.handle);
        return res.json({message: "Company deleted"});
    }catch (err){
        return next(err);
    }
})

module.exports = router;
