import dbConnect from "@/lib/mongoose";
import ApiInfo from "@/models/ApiInfo";
export default async function handler(req, res) {
  await dbConnect();
  try {
    const {
      route,
      time,
      hit
    } = req.method === "POST" ? req.body : req.query;
    if (!route || !time || !hit) {
      return res.status(400).json({
        error: "Route, time, and hit are required"
      });
    }
    const result = await ApiInfo.findOneAndUpdate({
      _id: "info"
    }, {
      $inc: {
        count: hit
      },
      $set: {
        route: route,
        time: time
      }
    }, {
      new: true,
      upsert: true
    });
    const routeData = {};
    const totalHits = result.count || 0;
    routeData[route] = {
      hourly: new Array(24).fill(0),
      daily: {
        [time]: hit
      },
      weekly: {}
    };
    const output = {
      message: "Hit updated",
      route: Object.keys(routeData).map(routeKey => ({
        path: routeKey,
        hit: {
          time: {
            hourly: routeData[routeKey].hourly,
            daily: routeData[routeKey].daily,
            weekly: routeData[routeKey].weekly
          },
          totalHits: totalHits
        }
      }))
    };
    return res.status(200).json(output);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}