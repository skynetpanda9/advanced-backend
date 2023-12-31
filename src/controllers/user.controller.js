import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(500, "Something went wrong while generating tokens");
  }
};

const loginUser = asyncHandler(async (req, res, next) => {
  const { email, username, password } = req.body;

  // if ([email, username].some((field) => field?.trim() === "")) {
  //   return next(new ApiError(400, "Please fill in unsername & email"));
  // }
  if (!email && !username) {
    return next(new ApiError(400, "Please fill in unsername & email"));
  }

  const user = await User.findOne({ $or: [{ email }, { username }] });
  if (!user) {
    return next(new ApiError(404, "User not found"));
  }

  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    return next(new ApiError(401, "Invalid credentials"));
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User logged in successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res, next) => {
  const { _id } = req.user;

  await User.findByIdAndUpdate(
    _id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", "", options)
    .clearCookie("refreshToken", "", options)
    .json(new ApiResponse(200, {}, "User logged out successfully"));
});

const registerUser = asyncHandler(async (req, res, next) => {
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
  // const coverImageLocalPath = req.files?.coverImage[0]?.path;

  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

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

export { registerUser, loginUser, logoutUser };
