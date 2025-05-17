import connectMongo from "@/lib/mongoose";
import DataUser from "@/models/DataUser";
import {
  randomUUID
} from "crypto";
export default async function handler(req, res) {
  await connectMongo();
  const {
    method,
    query: {
      id,
      customId
    },
    body
  } = req;
  try {
    switch (method) {
      case "POST": {
        if (!body || typeof body !== "object") {
          return res.status(400).json({
            error: "Invalid body data. Expecting a JSON object."
          });
        }
        const newUser = await DataUser.create({
          customId: customId?.trim() || randomUUID(),
          data: body
        });
        return res.status(201).json({
          message: "Token created",
          user: newUser
        });
      }
      case "GET": {
        if (customId?.trim()) {
          const user = await DataUser.findOne({
            customId: customId.trim()
          });
          if (!user) return res.status(404).json({
            error: `Data not found for customId: ${customId}`
          });
          return res.status(200).json({
            user: user
          });
        }
        const users = await DataUser.find({});
        if (!users.length) return res.status(404).json({
          error: "No data found."
        });
        return res.status(200).json({
          users: users
        });
      }
      case "PUT": {
        if (!customId?.trim()) return res.status(400).json({
          error: "customId is required for updating data."
        });
        if (!body || typeof body !== "object") {
          return res.status(400).json({
            error: "Invalid body data. Expecting a JSON object."
          });
        }
        const updatedUser = await DataUser.findOneAndUpdate({
          customId: customId.trim()
        }, body, {
          new: true,
          runValidators: true
        });
        if (!updatedUser) return res.status(404).json({
          error: `Data not found for customId: ${customId}`
        });
        return res.status(200).json({
          message: "Data updated",
          user: updatedUser
        });
      }
      case "DELETE": {
        if (customId?.trim()) {
          const deletedUser = await DataUser.findOneAndDelete({
            customId: customId.trim()
          });
          if (!deletedUser) return res.status(404).json({
            error: `Data not found for customId: ${customId}`
          });
          return res.status(200).json({
            message: "Data deleted",
            user: deletedUser
          });
        }
        const deletedUsers = await DataUser.deleteMany({});
        if (!deletedUsers.deletedCount) return res.status(404).json({
          error: "No data found to delete."
        });
        return res.status(200).json({
          message: "All data deleted",
          deletedCount: deletedUsers.deletedCount
        });
      }
      default:
        return res.status(405).json({
          error: "Method not allowed."
        });
    }
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      details: error.message
    });
  }
}