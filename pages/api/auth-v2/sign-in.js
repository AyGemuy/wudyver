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
    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required"
      });
    }
    try {
      const user = await User.findOne({
        email: email,
        password: password
      });
      if (!user) {
        return res.status(401).json({
          message: "Invalid email or password"
        });
      }
      const token = generateToken(user._id);
      const {
        password: _,
        ...userData
      } = user.toObject();
      return res.status(200).json({
        message: "Sign-in successful",
        user: userData,
        token: token
      });
    } catch {
      return res.status(500).json({
        message: "Error signing in"
      });
    }
  } else {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}