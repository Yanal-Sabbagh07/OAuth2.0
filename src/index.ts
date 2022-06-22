import express from "express";
import mongoose, { Error } from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import session from "express-session";
import passport from "passport";
import User from "./User";
import { IMongoDBUser } from "./types";

const GoogleStrategy = require("passport-google-oauth20").Strategy;
const GitHubStrategy = require("passport-github").Strategy;
dotenv.config();
const app = express();
mongoose
  .connect(
    `${process.env.START_MONGODB}${process.env.MONGODB_USURNAME}:${process.env.MONGODB_PASSWORD}${process.env.END_MONGODB}`
  )
  .then(() => {
    console.log("MongoDB connected!!");
  })
  .catch((err) => {
    console.log("Failed to connect to MongoDB", err);
  });

// Middleware
app.use(express.json());
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);

app.set("trust proxy", 1);

app.use(
  session({
    secret: "secretcode",
    resave: true,
    saveUninitialized: true,
    cookie: {
      sameSite: "none",
      secure: true,
      maxAge: 1000 * 60 * 60 * 1, // One hour
    },
  })
);
app.use(passport.initialize());
app.use(passport.session());

app.get("/", (req, res) => {
  res.send("API IS RUNNING ...");
});

passport.serializeUser((user: IMongoDBUser, done: any) => {
  return done(null, user._id);
});

passport.deserializeUser((id: string, done: any) => {
  User.findById(id, (err: Error, doc: IMongoDBUser) => {
    // Whatever we return goes to the client and binds to the req.user property
    return done(null, doc);
  });
});
//  google auth strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: `${process.env.GOOGLE_CLIENT_ID}`,
      clientSecret: `${process.env.GOOGLE_CLIENT_SECRET}`,
      callbackURL: "https://oauth2-0.herokuapp.com/oauth/google/callback",
      scope: ["profile"],
      state: true,
    },
    function (_: any, __: any, profile: any, cb: any) {
      User.findOne(
        { googleId: profile.id },
        async (err: Error, doc: IMongoDBUser) => {
          if (err) {
            console.log("error");
            return cb(err, null);
          }

          if (!doc) {
            const newUser = new User({
              googleId: profile.id,
              username: profile.name.givenName,
            });

            await newUser.save();
            cb(null, newUser);
            console.log("new Google user added to the DB");
          }
          cb(null, doc);
          console.log("Google user is Loged in ");
        }
      );
    }
  )
);
// githu auth strategy
passport.use(
  new GitHubStrategy(
    {
      clientID: `${process.env.GITHUB_CLIENT_ID}`,
      clientSecret: `${process.env.GITHUB_CLIENT_SECRET}`,
      callbackURL: "https://oauth2-0.herokuapp.com/oauth/github/callback",
    },
    function (_: any, __: any, profile: any, cb: any) {
      User.findOne(
        { githubId: profile.id },
        async (err: Error, doc: IMongoDBUser) => {
          if (err) {
            console.log("error");
            return cb(err, null);
          }

          if (!doc) {
            console.log("no doc");
            const newUser = new User({
              githubId: profile.id,
              username: profile.username,
            });
            console.log("existed");
            await newUser.save();
            cb(null, newUser);
          }
          cb(null, doc);
          console.log("Github user is Logged in ");
        }
      );
    }
  )
);

// google authentication reqquest
app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile"] })
);
app.get(
  "/oauth/google/callback",
  passport.authenticate("google", {
    failureRedirect: "https://gallant-hodgkin-fb9c52.netlify.app",
    session: true,
  }),
  function (req, res) {
    res.redirect("http://localhost:3000");
  }
);

// github authentication request
app.get("/auth/github", passport.authenticate("github"));

app.get(
  "/oauth/github/callback",
  passport.authenticate("github", { failureRedirect: "/login" }),
  function (req, res) {
    // Successful authentication, redirect home.
    res.redirect("http://localhost:3001");
  }
);

app.get("/getuser", (req, res) => {
  res.send(req.user);
});

app.get("/logout", (req, res) => {
  if (req.user) {
    req.logOut(() => {
      console.log("Done logging out.");
    });
  }

  res.send("done");
});

app.listen(process.env.PORT || 4000, () => {
  console.log("Server Starrted");
});
