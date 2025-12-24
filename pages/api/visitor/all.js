import dbConnect from "@/lib/mongoose";
import ApiInfo from "@/models/ApiInfo";
export default async function handler(req, res) {
  await dbConnect();
  try {
    const apiInfo = await ApiInfo.findOne({
      _id: "info"
    });
    if (!apiInfo) {
      return res.status(404).json({
        message: "API information not found."
      });
    }
    return res.status(200).json(apiInfo);
  } catch (error) {
    res.status(500).json({
      error: "Internal Server Error"
    });
  }
}