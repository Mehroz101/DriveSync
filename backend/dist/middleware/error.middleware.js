import { ApiError } from "../utils/apiError.js";
export const errorHandler = (err, req, res, _next) => {
    if (err instanceof ApiError) {
        return res.status(err.statusCode).json({
            message: err.message,
        });
    }
    console.error("Unhandled Error:", err);
    res.status(500).json({
        message: "Internal server error",
    });
};
