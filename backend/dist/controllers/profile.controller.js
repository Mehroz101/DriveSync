import User from "../models/user.js";
import { fetchGoogleProfile } from "../services/profile.service.js";
import { ApiError } from "../utils/apiError.js";
export const getProfile = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.userId);
        if (!user)
            throw new ApiError(404, "User not found");
        const profile = await fetchGoogleProfile(user);
        res.json({
            id: profile.id,
            email: profile.email,
            name: profile.name,
            picture: profile.picture,
        });
    }
    catch (error) {
        next(error);
    }
};
