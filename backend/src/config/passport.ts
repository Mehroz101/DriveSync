import passport from "passport";
import { Strategy as GoogleStrategy, Profile } from "passport-google-oauth20";
import User from "../models/user.js";
import DriveAccount from "../models/driveAccount.js";
import { generateToken } from "../utils/jwt.js";
import dotenv from "dotenv";
dotenv.config();

// Main user authentication strategy
passport.use(
  "user-auth",
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      callbackURL: "/api/auth/google/callback",
      scope: [
        "profile",
        "email",
        "https://www.googleapis.com/auth/drive.readonly",
      ],
    },
    async (
      accessToken: string,
      refreshToken: string,
      profile: Profile,
      done
    ) => {
      try {
        // Find or create user
        let user = await User.findOne({ googleId: profile.id });
        if (!user) {
          user = await User.create({
            googleId: profile.id,
            email: profile.emails?.[0].value,
            name: profile.displayName,
            authType: 'google',
          });
        }

        // Create or update drive account for this user
        await DriveAccount.findOneAndUpdate(
          { googleId: profile.id, userId: user._id },
          {
            userId: user._id,
            name: profile.displayName || profile.emails?.[0].value || "",
            email: profile.emails?.[0].value || "",
            googleId: profile.id,
            accessToken,
            refreshToken,
            scopes: ["profile", "email", "https://www.googleapis.com/auth/drive.readonly"],
          },
          { upsert: true, new: true }
        );

        done(null, user);
      } catch (err) {
        done(err as Error, undefined);
      }
    }
  )
);

// Strategy for adding additional drive accounts
passport.use(
  "add-drive-account",
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      callbackURL: `${process.env.BACKEND_URL}/api/auth/add-drive-account/callback`,
      scope: [
        "profile",
        "email",
        "https://www.googleapis.com/auth/drive.readonly",
      ],
    },
    async (
      accessToken: string,
      refreshToken: string,
      profile: Profile,
      done
    ) => {
      try {
        // This strategy expects the user to be provided in the state parameter
        // The user ID will be passed through the state parameter
        done(null, { profile, accessToken, refreshToken });
      } catch (err) {
        done(err as Error, undefined);
      }
    }
  )
);

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user: any, done) => done(null, user));

export default passport;