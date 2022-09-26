//jshint esversion:6

//dotenv prioritized for secure data of admin rights
require("dotenv").config();
const express = require("express");
const ejs = require("ejs");
const mongoose = require("mongoose");

const app = express();
const _ = require("lodash");
const bodyParser = require("body-parser");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

app.set("view engine", "ejs");

//we initialized the session with various options
app.use(
  session({
    secret: "EnigmawithCaesarCipher.",
    resave: false,
    saveUninitialized: false,
  })
);

//initialized passport to be used in our app
app.use(passport.initialize());
//we used passport to handle the sessions
app.use(passport.session());

//using local mongoose for mongoDB server
mongoose.connect("mongodb://localhost:27017/userDB");

//creating user schema through mongoose
const userSchema = new mongoose.Schema({
  email: String,
  password: String,
});

//we used passport local mongoose as a plugin for our schema
userSchema.plugin(passportLocalMongoose);

//creating a user object through mongoose model using our schema
const User = new mongoose.model("User", userSchema);

//passport used to create a local login strategy
passport.use(User.createStrategy());
//session to be intialized and deinitialized for particular users
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

//first local route towards home
app.get("/", function (req, res) {
  res.render("home");
});

//register route
app
  .route("/register")
  .get(function (req, res) {
    res.render("register");
  })
  //authenticating the user through passport
  .post(function (req, res) {
    User.register(
      { username: req.body.username },
      req.body.password,
      function (err, userdata) {
        if (err) {
          console.log(err);
          res.redirect("/login");
        } else {
          passport.authenticate("local")(req, res, function () {
            res.redirect("/secrets");
          });
        }
      }
    );
  });

//only allowing users who are authenticated to secrets page
app.route("/secrets").get(function (req, res) {
  if (req.isAuthenticated()) {
    res.render("secrets");
  } else {
    res.redirect("/login");
  }
});

app
  .route("/login")
  .get(function (req, res) {
    res.render("login");
  })
  .post(function (req, res) {});

app.route("/logout").get(function (req, res) {
  res.render("home");
});

app.listen(3000, () => {
  console.log("server running at 3000");
});
