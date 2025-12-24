import connectMongo from "@/lib/mongoose";
import User from "@/models/User";
export default async function handler(req, res) {
  await connectMongo();
  const data = req.method === "GET" ? req.query : req.body;
  const {
    email,
    clear
  } = data;
  let clearStatus = false;
  try {
    if (clear === "true" || clear === true) {
      const result = await User.deleteMany({});
      clearStatus = true;
      return res.status(200).json({
        message: `${result.deletedCount} users have been deleted successfully.`,
        clear: clearStatus
      });
    } else if (email) {
      const deletedUser = await User.findOneAndDelete({
        email: email
      });
      if (!deletedUser) {
        return res.status(404).json({
          message: "User not found with the provided email.",
          clear: clearStatus
        });
      }
      clearStatus = true;
      return res.status(200).json({
        message: "User deleted successfully.",
        email: deletedUser.email,
        clear: clearStatus
      });
    } else {
      return res.status(400).json({
        message: "A valid email or 'clear=true' parameter is required.",
        clear: clearStatus
      });
    }
  } catch (error) {
    console.error("Error processing the request:", error);
    return res.status(500).json({
      message: "An error occurred while deleting the user(s).",
      error: error.message,
      clear: clearStatus
    });
  }
}