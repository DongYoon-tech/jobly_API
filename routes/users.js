const express = require("express");
const ExpressError = require("../helpers/ExpressError");
const {ensureCorrectUser} = require("../middleware/auth")
const jwt = require("jsonwebtoken");
const { SECRET_KEY } = require("../config");

const User = require("../models/user")
const { validate } = require("jsonschema");
const userSchemaNew = require("../schemas/userNew");
const userSchemaUpdate = require("../schemas/userUpdate");

const router = new express.Router();

function newToken(user){
    let payload = {
        username: user.username,
        is_admin: user.is_admin
    };
    return jwt.sign(payload, SECRET_KEY);
}

router.post("/", async function(req, res, next){
    try{
        const validation = validate(req.body, userSchemaNew);
        if(!validation.valid){
            throw new ExpressError(
                validation.errors.map(e => e.stack), 
                400)
        }

        const user = await User.create(req.body);
        const token = newToken(user)
        return res.json({ token });
    }catch(err){
        return next(err);
    }
})

router.get("/", async function(req, res, next){
    try{
        const users = await User.findAll();
        return res.json({ users });
    }catch(err){
        return next(err);
    }
})

router.get("/:username", async function (req, res, next) {
    try {
      const user = await User.findOne(req.params.username);
      return res.json({ user });
    } catch (err) {
      return next(err);
    }
  });

router.patch("/:username", ensureCorrectUser, async function (req, res, next) {
    try {
        if("username" in req.body || "password" in req.body){
            throw new ExpressError("Not allowed",
            400)
        };
      const validation = validate(req.body, userSchemaUpdate)
      if(!validation.valid){
          throw new ExpressError(
            validation.errors.map(e => e.stack),
            400)
      };
      const user =  await User.update(req.params.username, req.body);
      return res.json({ user });
    } catch (err) {
      return next(err);
    }
});

router.delete("/:username",ensureCorrectUser,async function (req, res, next){
    try{
        await User.remove(req.params.username);
        return res.json({message: "User deleted"});
    }catch (err){
        return next(err);
    }
})

module.exports = router;
