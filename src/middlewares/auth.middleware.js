import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";

export const verifyJWT = asyncHandler(async (req, _, next) => {
  try {
    const token =
      req.cookies?.accessToken || req.header("Authorization")?.split(" ")[1];

    if (!token) {
      return next(new ApiError(401, "Unauthorized request"));
    }

    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    const user = await User.findById(decoded._id).select(
      "-password -refreshToken"
    );

    if (!user) {
      // TODO: discuss about frontend
      return next(new ApiError(401, "Invalid access token"));
    }

    req.user = user;
    next();
  } catch (error) {
    return next(new ApiError(401, error?.message || "Invalid access token"));
  }
});
