import connectMongo from "@/lib/mongoose";
import User from "@/models/User";
export default async function handler(req, res) {
  await connectMongo();
  if (req.method === "POST" || req.method === "GET") {
    const {
      email
    } = req.body;
    const {
      email: queryEmail
    } = req.query;
    const emailToDelete = email || queryEmail;
    if (!emailToDelete) {
      return res.status(400).json({
        message: "Email is required"
      });
    }
    try {
      const deletedUser = await User.findOneAndDelete({
        email: emailToDelete
      });
      if (!deletedUser) {
        return res.status(404).json({
          message: "User not found"
        });
      }
      return res.status(200).json({
        message: "User deleted successfully",
        deletedUser: deletedUser
      });
    } catch (error) {
      return res.status(500).json({
        message: "Error processing the request",
        error: error.message
      });
    }
  } else {
    res.setHeader("Allow", ["POST", "GET"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}