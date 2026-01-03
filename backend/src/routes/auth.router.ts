import express, { Request, Response, NextFunction } from "express";
import passport from "passport";
import { generateToken } from "../utils/jwt.js";

const router = express.Router();

/* ------------------------------------------------------------------
   PRIMARY LOGIN (MAIN USER AUTH)
-------------------------------------------------------------------*/

/**
 * Step 1: Start Google OAuth for main app login
 */
router.get(
  "/google",
  (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate("user-auth", {
      scope: [
        "profile",
        "email",
        "https://www.googleapis.com/auth/drive.readonly",
      ],
      accessType: "offline" as const,
      prompt: "consent" as const,
      session: false,
    } as any)(req, res, next);
  }
);

/**
 * Step 2: Google OAuth callback (main login)
 */
router.get(
  "/google/callback",
  (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate(
      "user-auth",
      { session: false, failureRedirect: "/" },
      (err: Error | null, user: any) => {
        if (err || !user) {
          console.error("Main login failed:", err);
          return res.redirect("/");
        }

        // Generate JWT token for the user
        const token = generateToken({
          userId: user._id.toString(),
          email: user.email,
        });

        // Redirect to frontend with both userId and JWT token
        res.redirect(
          `http://localhost:5173/auth/callback?userId=${user._id}&token=${token}`
        );
      }
    )(req, res, next);
  }
);

/* ------------------------------------------------------------------
   ADD ADDITIONAL DRIVE ACCOUNT (MULTI-DRIVE)
-------------------------------------------------------------------*/

/**
 * Step 1: Start OAuth for adding another Drive account
 * IMPORTANT: must start from backend
 */
router.get(
  "/add-drive-account",
  (req: Request, res: Response, next: NextFunction) => {
    const { userId } = req.query;

    if (!userId || typeof userId !== "string") {
      return res.status(400).json({
        error: "userId is required to add a drive account",
      });
    }

    passport.authenticate("add-drive-account", {
      scope: [
        "profile",
        "email",
        "https://www.googleapis.com/auth/drive.readonly",
      ],
      accessType: "offline" as const,
      prompt: "consent" as const,
      session: false,
      state: JSON.stringify({ userId }),
    } as any)(req, res, next);
  }
);

/**
 * Step 2: Callback for adding Drive account
 */
router.get(
  "/add-drive-account/callback",
  (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate(
      "add-drive-account",
      { session: false, failureRedirect: "/" },
      async (err: Error | null, payload: any) => {
        if (err || !payload) {
          console.error("Add-drive OAuth failed:", err);
          return res.redirect("/");
        }

        try {
          /* ------------------------------
             Extract state safely
          -------------------------------*/
          const rawState = req.query.state as string | undefined;
          const parsedState = rawState ? JSON.parse(rawState) : null;
          const userId = parsedState?.userId;

          if (!userId) {
            throw new Error("Missing userId in OAuth state");
          }

          const { profile, accessToken, refreshToken } = payload;

          const DriveAccount = (
            await import("../models/driveAccount.js")
          ).default;

          const driveAccount = await DriveAccount.findOneAndUpdate(
            {
              userId,
              googleId: profile.id,
            },
            {
              userId,
              googleId: profile.id,
              name: profile.displayName || "",
              email: profile.emails?.[0]?.value || "",
              accessToken,
              refreshToken,
              scopes: [
                "profile",
                "email",
                "https://www.googleapis.com/auth/drive.readonly",
              ],
            },
            { upsert: true, new: true }
          );

          console.log(
            `Drive account linked → user=${userId}, google=${profile.id}`
          );

          return res.redirect(
            `http://localhost:5173/dashboard?driveAdded=true&accountId=${driveAccount._id}`
          );
        } catch (error: any) {
          console.error("Drive account save failed:", error);
          return res.redirect(
            `http://localhost:5173/dashboard?driveAdded=false&error=${encodeURIComponent(
              error.message || "Unknown error"
            )}`
          );
        }
      }
    )(req, res, next);
  }
);

/* ------------------------------------------------------------------
   LOGOUT
-------------------------------------------------------------------*/

router.post("/logout", (req: Request, res: Response) => {
  // Handle logout with callback to ensure session cleanup
  req.logout((err) => {
    if (err) {
      console.error('Error during logout:', err);
      return res.status(500).json({ success: false, error: 'Could not log out, please try again.' });
    }
    // Clear session cookies
    res.clearCookie("session");
    res.clearCookie("session.sig");
    res.status(200).json({ success: true });
  });
});

export default router;
