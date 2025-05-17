import dbConnect from "@/lib/mongoose";
import Room from "@/models/Room";
export default async function handler(req, res) {
  await dbConnect();
  if (req.method === "GET") {
    const {
      roomName
    } = req.method === "GET" ? req.query : req.body;
    if (roomName) {
      try {
        const room = await Room.findOne({
          roomName: roomName
        });
        if (!room) {
          return res.status(404).json({
            success: false,
            message: "Room not found"
          });
        }
        return res.status(200).json({
          success: true,
          data: room.messages
        });
      } catch (error) {
        return res.status(500).json({
          success: false,
          message: "Error fetching room messages"
        });
      }
    } else {
      try {
        const rooms = await Room.find();
        if (rooms.length === 0) {
          return res.status(404).json({
            success: false,
            message: "No rooms found"
          });
        }
        return res.status(200).json({
          success: true,
          data: rooms
        });
      } catch (error) {
        return res.status(500).json({
          success: false,
          message: "Error fetching rooms"
        });
      }
    }
  }
  if (req.method === "POST") {
    const {
      roomName,
      name,
      message
    } = req.body;
    if (!roomName || !name || !message) {
      return res.status(400).json({
        success: false,
        message: "Room name, name, and message are required"
      });
    }
    try {
      const timestamp = Date.now();
      const updatedRoom = await Room.findOneAndUpdate({
        roomName: roomName
      }, {
        $push: {
          messages: {
            name: name,
            message: message,
            timestamp: timestamp
          }
        }
      }, {
        new: true,
        upsert: true
      });
      return res.status(201).json({
        success: true,
        data: updatedRoom
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Error saving message or creating room"
      });
    }
  }
  res.status(405).json({
    success: false,
    message: "Method not allowed"
  });
}