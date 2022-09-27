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
const FacebookStrategy = require("passport-facebook").Strategy;
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
  googleId: String,
  secret: String,
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
//google OAuth Strategy
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
//facebook Oauth Strategy
passport.use(
  new FacebookStrategy(
    {
      clientID: process.env.fb_CLIENT_ID,
      clientSecret: process.env.fb_SECRET,
      callbackURL: "http://localhost:3000/auth/facebook/secrets",
    },
    function (accessToken, refreshToken, profile, cb) {
      User.findOrCreate({ facebookId: profile.id }, function (err, user) {
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
//registration through facebook

app.get("/auth/facebook", passport.authenticate("facebook"));
//redirecting to secret when login is authenticated {google}
app.get(
  "/auth/google/secrets",
  passport.authenticate("google", { failureRedirect: "/login" }),
  function (req, res) {
    // Successful authentication, redirect home.
    res.redirect("/secrets");
  }
);
//redirecting to secret when login is authenticated {facebook}
app.get(
  "/auth/facebook/secrets",
  passport.authenticate("facebook", { failureRedirect: "/login" }),
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
  User.find({ secret: { $ne: null } }, function (err, foundUsers) {
    res.render("secrets", { secretUser: foundUsers });
  });
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

//submit route

app
  .route("/submit")
  .get(function (req, res) {
    if (req.isAuthenticated()) {
      res.render("submit");
    } else {
      res.redirect("/login");
    }
  })
  .post(function (req, res) {
    const secretText = _.capitalize(req.body.secret);
    User.findById(req.user.id, function (err, foundUser) {
      if (err) {
        console.log(err);
      } else {
        if (foundUser) {
          foundUser.secret = secretText;
          foundUser.save(function () {
            res.redirect("/secrets");
          });
        }
      }
    });
  });

//logout route and deleting the session
app.route("/logout").get(function (req, res) {
  req.logout(function (err, msg) {
    if (err) {
      console.log(err);
    } else {
      res.render("home");
    }
  });
});

app.listen(3000, () => {
  console.log("server running at 3000");
});
