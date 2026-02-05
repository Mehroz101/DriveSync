import express, { Request, Response, NextFunction } from "express";
import passport from "passport";
import { generateToken } from "../utils/jwt.js";
import {
  generateOAuthState,
  validateOAuthState,
  checkAndMarkNonce,
} from "../utils/oauthState.js";
import { authenticateToken } from "../middleware/auth.middleware.js";
import { AuthenticatedRequest } from "../types/index.js";
import driveAccount from "../models/driveAccount.js";
import { fetchDriveStats } from "../services/drive.service.js";

const router = express.Router();

/* ------------------------------------------------------------------
   PRIMARY LOGIN (MAIN USER AUTH)
-------------------------------------------------------------------*/

/**
 * Step 1: Start Google OAuth for main app login
 */
router.get("/google", (req: Request, res: Response, next: NextFunction) => {
  passport.authenticate("user-auth", {
    scope: [
      "profile",
      "email",
      "https://www.googleapis.com/auth/drive",
    ],
    accessType: "offline" as const,
    prompt: "consent" as const,
    session: false,
  } as any)(req, res, next);
});

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

        // Redirect to frontend with JWT token only (no userId in URL)
        res.redirect(`http://localhost:5173/auth/callback?token=${token}`);
      }
    )(req, res, next);
  }
);

/* ------------------------------------------------------------------
   ADD ADDITIONAL DRIVE ACCOUNT (MULTI-DRIVE)
-------------------------------------------------------------------*/

/**
 * Step 1: Start OAuth for adding another Drive account
 * IMPORTANT: Requires authentication - userId from token, not query parameter
 */

router.post(
  "/add-account",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.userId!;
      const state = generateOAuthState(userId);
      const authUrl = `${process.env.BACKEND_URL}/api/auth/add-drive-account?state=${state}`;

      res.json({ authUrl });
    } catch (error) {
      next(error);
    }
  }
);

// New: initiate reconnect for an existing Drive account by driveId
router.post(
  "/reconnect/:driveId",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.userId!;
      const { driveId } = req.params;
      if (!driveId) return res.status(400).json({ error: "driveId required" });
      const drive = await driveAccount.findById(driveId);

      if (!drive) {
        return res.status(404).json({ error: "Drive account not found" });
      }

      // include driveId in signed state meta so callback knows which account to update
      const state = generateOAuthState(userId, { driveId, email: drive.email });
      const authUrl = `${process.env.BACKEND_URL}/api/auth/add-drive-account?state=${state}`;

      res.json({ authUrl });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  "/add-drive-account",
  (req: Request, res: Response, next: NextFunction) => {
    // Get userId from authenticated token, not from query parameter
    console.log("state", req.query.state);
    const state = req.query.state as string;
    const parsedState = validateOAuthState(state);
    const loginHint = parsedState?.meta?.email;
    const isReconnect = Boolean(parsedState?.meta?.driveId);

    // Generate cryptographically signed state with authenticated userId

    passport.authenticate("add-drive-account", {
      scope: [
        "profile",
        "email",
        "https://www.googleapis.com/auth/drive",
      ],
      accessType: "offline" as const,
      prompt: "consent",
      login_hint: loginHint,
      includeGrantedScopes: true,
      session: false,
      state, // Pass signed state to OAuth
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
          return res.redirect(`http://localhost:5173/drives`);
        }

        try {
          /* ------------------------------
             Validate OAuth state securely
          -------------------------------*/
          const rawState = req.query.state as string | undefined;

          if (!rawState) {
            throw new Error("Missing OAuth state parameter");
          }

          const state = validateOAuthState(rawState);

          if (!state) {
            throw new Error("Invalid or expired OAuth state");
          }

          // Check nonce to prevent replay attacks
          if (!checkAndMarkNonce(state.nonce)) {
            throw new Error(
              "State nonce already used (replay attack prevented)"
            );
          }

          const userId = state.userId;
          const { profile, accessToken, refreshToken } = payload;

          // If this is a reconnect flow, state.meta.driveId will be set
          const reconnectDriveId = state.meta?.driveId;

          let driveaccount;
          if (reconnectDriveId) {
            // Update the existing DriveAccount by ID (do not change owner/userId)
            driveaccount = await driveAccount.findByIdAndUpdate(
              reconnectDriveId,
              {
                googleId: profile.id,
                name: profile.displayName || "",
                email: profile.emails?.[0]?.value || "",
                accessToken,
                refreshToken,
                connectionStatus: "active",
                profileImg: profile.photos?.[0]?.value || "",
                scopes: [
                  "profile",
                  "email",
                  "https://www.googleapis.com/auth/drive",
                ],
              },
              { new: true }
            );
          } else {
            // Normal add-account flow (upsert by userId + googleId)
            driveaccount = await driveAccount.findOneAndUpdate(
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
                connectionStatus: "active",
                profileImg: profile.photos?.[0]?.value || "",
                scopes: [
                  "profile",
                  "email",
                  "https://www.googleapis.com/auth/drive",
                ],
              },
              { upsert: true, new: true }
            );
          }
          await fetchDriveStats(driveaccount);

          console.log(
            `Drive account linked → user=${userId}, google=${profile.id}`
          );

          return res.redirect(`http://localhost:5173/drives`);
        } catch (error: any) {
          console.error("Drive account save failed:", error);
          return res.redirect(`http://localhost:5173/drives`);
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
      console.error("Error during logout:", err);
      return res.status(500).json({
        success: false,
        error: "Could not log out, please try again.",
      });
    }
    // Clear session cookies
    res.clearCookie("session");
    res.clearCookie("session.sig");
    res.status(200).json({ success: true });
  });
});

export default router;
