//jshint esversion:6

//dotenv prioritized for secure data of admin rights
require("dotenv").config();
const express = require("express");
const ejs = require("ejs");
const mongoose = require("mongoose");
const findOrCreate = require("mongoose-findorcreate");

const app = express();
const _ = require("lodash");
const bodyParser = require("body-parser");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
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
userSchema.plugin(findOrCreate);

//creating a user object through mongoose model using our schema
const User = new mongoose.model("User", userSchema);

//passport used to create a local login strategy
passport.use(User.createStrategy());
//session to be intialized and deinitialized for particular users
passport.serializeUser(function (user, cb) {
  process.nextTick(function () {
    cb(null, { id: user.id, username: user.username });
  });
});

passport.deserializeUser(function (user, cb) {
  process.nextTick(function () {
    return cb(null, user);
  });
});
//google OAuth
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.SECRET,
      callbackURL: "http://localhost:3000/auth/google/secrets",
      userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
    },
    function (accessToken, refreshToken, profile, cb) {
      User.findOrCreate({ googleId: profile.id }, function (err, user) {
        return cb(err, user);
      });
    }
  )
);

//first local route towards home
app.get("/", function (req, res) {
  res.render("home");
});
//registration through google API
app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile"] })
);
//redirecting to secret when login is authenticated
app.get(
  "/auth/google/secrets",
  passport.authenticate("google", { failureRedirect: "/login" }),
  function (req, res) {
    // Successful authentication, redirect home.
    res.redirect("/secrets");
  }
);

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

//login route
app
  .route("/login")
  .get(function (req, res) {
    res.render("login");
  })
  .post(function (req, res) {
    const user = new User({
      username: req.body.username,
      password: req.body.password,
    });

    req.login(user, function (err) {
      if (err) {
        res.redirect("/login");
      } else {
        passport.authenticate("local")(req, res, function () {
          res.redirect("/secrets");
        });
      }
    });
  });

//logout route and deleting the session
app.route("/logout").get(function (req, res) {
  req.logout();
  res.render("home");
});

app.listen(3000, () => {
  console.log("server running at 3000");
});
