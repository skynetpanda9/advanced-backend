import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import uploadOnCloudinary from "../utils/cloudinary.js";

const registerUser = asyncHandler(async (req, res, next) => {
  // upload images to cloudinary, avatar
  // create user object - create entry in db
  // remove password and refresh token from response
  // check for user creation
  // return response
  const { fullName, email, username, password } = req.body;

  if (
    [fullName, email, username, password].some((field) => field?.trim() === "")
  ) {
    return next(new ApiError(400, "Please fill in all fields"));
  }

  User.findOne({ $or: [{ email }, { username }] }).then((user) => {
    if (user) {
      return next(
        new ApiError(
          409,
          `User with ${
            user.email === email ? "email" : "username"
          } already exists`
        )
      );
    }
  });

  const avatarLocalPath = req.files?.avatar[0]?.path;
  const coverImageLocalPath = req.files?.coverImage[0]?.path;

  if (!avatarLocalPath) {
    return next(new ApiError(400, "Please upload an avatar"));
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    return next(new ApiError(400, "Please upload an avatar"));
  }

  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage.url || "",
    email,
    password,
    username: username.toLowerCase(),
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    return next(new ApiError(500, "Something went wrong while creating user"));
  }

  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "user created successfully"));
});

export { registerUser };
