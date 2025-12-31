import passport from "passport";
import { Strategy as GoogleStrategy, Profile } from "passport-google-oauth20";
import User from "../models/user.js";
import dotenv from "dotenv";
dotenv.config();
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      callbackURL: "/auth/google/callback",
      scope: ["profile", "email", "https://www.googleapis.com/auth/drive.readonly"],
    },
    async (accessToken: string, refreshToken: string, profile: Profile, done) => {
      try {
         
        // Save or update user
        const existingUser = await User.findOne({ googleId: profile.id });
        if (existingUser) {
          existingUser.accessToken = accessToken;
          existingUser.refreshToken = refreshToken;
          await existingUser.save();
          return done(null, existingUser);
        }

        const newUser = await User.create({
          googleId: profile.id,
          email: profile.emails?.[0].value,
          accessToken,
          refreshToken,
        });

        done(null, newUser);
      } catch (err) {
        done(err as Error, undefined);
      }
    }
  )
);

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user: any, done) => done(null, user));

export default passport;
