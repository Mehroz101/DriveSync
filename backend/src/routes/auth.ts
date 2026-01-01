import express from "express";
import passport from "passport";


const router = express.Router();

router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email", "https://www.googleapis.com/auth/drive.readonly"] })
);

router.get(
  "/google/callback",
  passport.authenticate("google", { session: false, failureRedirect: "/" }),
  async (req: any, res) => {
    // Save user ID to frontend (can use JWT or session)
    const userId = req.user._id;
    res.redirect(`http://localhost:5173/auth/callback?userId=${userId}`);
  }
);

export default router;
