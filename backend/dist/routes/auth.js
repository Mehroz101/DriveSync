import express from "express";
import passport from "passport";
const router = express.Router();
// Main authentication route
router.get("/google", (req, res, next) => {
    passport.authenticate("user-auth", {
        scope: [
            "profile",
            "email",
            "https://www.googleapis.com/auth/drive.readonly",
        ],
        accessType: "offline",
        prompt: "consent",
    })(req, res, next);
});
// Main authentication callback
router.get("/google/callback", (req, res, next) => {
    passport.authenticate("user-auth", { session: false, failureRedirect: "/" }, async (err, user) => {
        if (err || !user) {
            return res.redirect("/");
        }
        // Save user ID to frontend (can use JWT or session)
        const userId = user._id;
        res.redirect(`http://localhost:5173/auth/callback?userId=${userId}`);
    })(req, res, next);
});
// Route for adding additional drive accounts
router.get("/add-drive-account", (req, res, next) => {
    // Store the current user ID in the session or pass it via state
    const userId = req.query.userId;
    if (!userId) {
        return res.status(400).json({ error: "User ID is required to add a drive account" });
    }
    // Store the userId in the session or pass it via state
    req.session.addingDriveUserId = userId;
    passport.authenticate("add-drive-account", {
        scope: [
            "profile",
            "email",
            "https://www.googleapis.com/auth/drive.readonly",
        ],
        accessType: "offline",
        prompt: "consent",
        state: userId, // Pass user ID in state
    })(req, res, next);
});
// Callback for adding additional drive accounts
router.get("/add-drive-account/callback", (req, res, next) => {
    passport.authenticate("add-drive-account", { session: false, failureRedirect: "/" }, async (err, result) => {
        if (err || !result) {
            return res.redirect("/");
        }
        try {
            // Get the user ID from state or session
            const queryState = req.query.state;
            const stateUserId = typeof queryState === 'string' ? queryState : undefined;
            const sessionUserId = req.session.addingDriveUserId;
            const userId = stateUserId || sessionUserId;
            if (!userId) {
                return res.status(400).json({ error: "User ID not found" });
            }
            const { profile, accessToken, refreshToken } = result;
            // Import DriveAccount model
            const DriveAccount = (await import("../models/driveAccount.js")).default;
            // Create or update the drive account for this user
            await DriveAccount.findOneAndUpdate({ googleId: profile.id, userId }, {
                userId,
                name: profile.displayName || profile.emails?.[0].value || "",
                email: profile.emails?.[0].value || "",
                googleId: profile.id,
                accessToken,
                refreshToken,
                scopes: ["profile", "email", "https://www.googleapis.com/auth/drive.readonly"],
            }, { upsert: true, new: true });
            // Redirect back to frontend with success
            res.redirect(`http://localhost:5173/dashboard?driveAdded=true`);
        }
        catch (error) {
            console.error("Error adding drive account:", error);
            res.redirect(`http://localhost:5173/dashboard?driveAdded=false&error=${encodeURIComponent(error instanceof Error ? error.message : "Unknown error")}`);
        }
    })(req, res, next);
});
export default router;
