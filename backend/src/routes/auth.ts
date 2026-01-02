import express from "express";
import passport from "passport";
import { Request, Response } from "express";

const router = express.Router();

// Main authentication route
router.get(
  "/google",
  (req: Request, res: Response, next: express.NextFunction) => {
    (passport.authenticate as any)("user-auth", {
      scope: [
        "profile",
        "email",
        "https://www.googleapis.com/auth/drive.readonly",
      ],
      accessType: "offline" as const,
      prompt: "consent" as const,
    })(req, res, next);
  }
);

// Main authentication callback
router.get(
  "/google/callback",
  (req: Request, res: Response, next: express.NextFunction) => {
    (passport.authenticate as any)("user-auth", { session: false, failureRedirect: "/" }, async (err: Error | null, user: any) => {
      if (err || !user) {
        return res.redirect("/");
      }
      
      // Save user ID to frontend (can use JWT or session)
      const userId = user._id;
      res.redirect(`http://localhost:5173/auth/callback?userId=${userId}`);
    })(req, res, next);
  }
);

// Route for adding additional drive accounts
router.get(
  "/add-drive-account",
  (req: Request, res: Response, next: express.NextFunction) => {
    // Store the current user ID in the session or pass it via state
    const userId = req.query.userId;
    if (!userId) {
      return res.status(400).json({ error: "User ID is required to add a drive account" });
    }
    
    // Store the userId in the session or pass it via state
    (req.session as any).addingDriveUserId = userId;
    
    (passport.authenticate as any)("add-drive-account", {
      scope: [
        "profile",
        "email",
        "https://www.googleapis.com/auth/drive.readonly",
      ],
      accessType: "offline" as const,
      prompt: "consent" as const,
      state: userId as string, // Pass user ID in state
    })(req, res, next);
  }
);

// Callback for adding additional drive accounts
router.get(
  "/add-drive-account/callback",
  (req: Request, res: Response, next: express.NextFunction) => {
    (passport.authenticate as any)("add-drive-account", { session: false, failureRedirect: "/" }, async (err: Error | null, result: any) => {
      if (err || !result) {
        return res.redirect("/");
      }
      
      try {
        // Get the user ID from state or session
        const queryState = req.query.state;
        const stateUserId = typeof queryState === 'string' ? queryState : undefined;
        const sessionUserId = (req.session as any).addingDriveUserId;
        const userId = stateUserId || sessionUserId;
        
        if (!userId) {
          return res.status(400).json({ error: "User ID not found" });
        }
        
        const { profile, accessToken, refreshToken } = result;
        
        // Import DriveAccount model
        const DriveAccount = (await import("../models/driveAccount.js")).default;
        
        // Create or update the drive account for this user
        await DriveAccount.findOneAndUpdate(
          { googleId: profile.id, userId },
          {
            userId,
            name: profile.displayName || profile.emails?.[0].value || "",
            email: profile.emails?.[0].value || "",
            googleId: profile.id,
            accessToken,
            refreshToken,
            scopes: ["profile", "email", "https://www.googleapis.com/auth/drive.readonly"],
          },
          { upsert: true, new: true }
        );
        
        // Redirect back to frontend with success
        res.redirect(`http://localhost:5173/dashboard?driveAdded=true`);
      } catch (error) {
        console.error("Error adding drive account:", error);
        res.redirect(`http://localhost:5173/dashboard?driveAdded=false&error=${encodeURIComponent(error instanceof Error ? error.message : "Unknown error")}`);
      }
    })(req, res, next);
  }
);

export default router;
