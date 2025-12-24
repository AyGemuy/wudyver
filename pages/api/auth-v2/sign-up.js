import connectMongo from "@/lib/mongoose";
import User from "@/models/User";
import jwt from "jsonwebtoken";
import apiConfig from "@/configs/apiConfig";
const generateToken = id => jwt.sign({
  id: id
}, apiConfig.JWT_SECRET, {
  expiresIn: "7d"
});
export default async function handler(req, res) {
  await connectMongo();
  if (req.method === "POST") {
    const {
      email,
      password
    } = req.body;
    const ipAddress = req.headers["x-forwarded-for"] || req.connection.remoteAddress;
    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required"
      });
    }
    try {
      const updatedUser = await User.findOneAndUpdate({
        email: email
      }, {
        $set: {
          password: password,
          ipAddress: ipAddress
        }
      }, {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true
      });
      const token = generateToken(updatedUser._id);
      const {
        password: _,
        ...userData
      } = updatedUser.toObject();
      return res.status(200).json({
        message: updatedUser.isNew ? "Sign-up successful" : "User updated successfully",
        user: userData,
        token: token
      });
    } catch (error) {
      return res.status(500).json({
        message: "Error processing the request",
        error: error.message
      });
    }
  } else {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}