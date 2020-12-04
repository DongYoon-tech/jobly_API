const express = require("express");
const jwt = require("jsonwebtoken");
const { SECRET_KEY } = require("../config");

const User = require("../models/user")

const router = new express.Router();

function newToken(user){
    let payload = {
        username: user.username,
        is_admin: user.is_admin
    };
    return jwt.sign(payload, SECRET_KEY);
}

router.post("/login", async function(req, res, next){
    try{
        const user = await User.authenticate(req.body)
        const token = newToken(user);
        return res.json({ token });
    }catch(err){
        return next(err);
    }
});

module.exports = router;