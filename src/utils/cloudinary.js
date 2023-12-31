import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;
    // using stream to upload file to cloudinary
    // const stream = fs.createReadStream(localFilePath);
    // const result = await cloudinary.uploader.upload_stream(
    //   {
    //     // folder: "images",
    //     // public_id: "images",
    //     resource_type: "auto",
    //     // overwrite: true,
    //   },
    //   stream
    // );

    // using fs to upload file to cloudinary
    const result = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });
    console.log("file uploaded successfully", result.url);
    fs.unlinkSync(localFilePath);
    return result;
  } catch (error) {
    fs.unlinkSync(localFilePath);
    return null;
  }
};

export { uploadOnCloudinary };
