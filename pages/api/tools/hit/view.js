import connectMongo from "@/lib/mongoose";
import CountHit from "@/models/CountHit";
export default async function handler(req, res) {
  await connectMongo();
  if (req.method === "GET") {
    const {
      sites
    } = req.query;
    if (!sites) {
      return res.status(400).json({
        success: false,
        response: 400,
        message: "Paramenter 'sites' diperlukan."
      });
    }
    try {
      const site = await CountHit.findOne({
        site_name: sites
      });
      if (!site) {
        return res.status(404).json({
          success: false,
          response: 404,
          message: "Situs tidak ditemukan."
        });
      }
      return res.status(200).json({
        success: true,
        response: 200,
        data: site
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        response: 500,
        message: error.message
      });
    }
  } else {
    res.status(405).json({
      success: false,
      response: 405,
      message: "Method Not Allowed"
    });
  }
}