//jshint esversion:6
require("dotenv").config();
const express = require("express");
const ejs = require("ejs");
const mongoose = require("mongoose");

const app = express();
const _ = require("lodash");
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
const saltrounds = 10;

mongoose.connect("mongodb://localhost:27017/userDB");
const userSchema = new mongoose.Schema({
  email: String,
  password: String,
});

const User = new mongoose.model("User", userSchema);

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

app.set("view engine", "ejs");

app.get("/", function (req, res) {
  res.render("home");
});

app
  .route("/register")
  .get(function (req, res) {
    res.render("register");
  })
  .post(function (req, res) {
    bcrypt.hash(req.body.password, saltrounds, function (err, hash) {
      if (!err) {
        const user = new User({
          email: req.body.username,
          password: hash,
        });
        user.save(function (err) {
          if (!err) {
            console.log("Successfully registerd");
            res.render("secrets");
          } else {
            console.error(err);
          }
        });
      }
    });
  });

app
  .route("/login")
  .get(function (req, res) {
    res.render("login");
  })
  .post(function (req, res) {
    const validateUsername = req.body.username;
    const validatePassword = req.body.password;

    User.findOne({ email: validateUsername }, function (err, foundUser) {
      console.log(foundUser);
      if (!err) {
        if (foundUser) {
          bcrypt.compare(
            validatePassword,
            foundUser.password,
            function (err, result) {
              if (result === true) {
                console.log("logged in successfully");
                res.render("secrets");
              } else {
                console.error(err);
                console.log("wrong credentials");
                res.render("login");
              }
            }
          );
        }
      }
    });
  });

app.route("/logout").get(function (req, res) {
  res.render("home");
});

app.listen(3000, () => {
  console.log("server running at 3000");
});
