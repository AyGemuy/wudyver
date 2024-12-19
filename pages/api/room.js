import dbConnect from "../../lib/mongoose";
import Room from "../../models/Room";

export default async function handler(req, res) {
  await dbConnect();

  if (req.method === 'GET') {
    const { roomName } = req.query;
    try {
      // Fetch room data by room name
      const room = await Room.findOne({ roomName });
      if (!room) {
        return res.status(404).json({ success: false, message: "Room not found" });
      }
      return res.status(200).json({ success: true, data: room });
    } catch (error) {
      return res.status(500).json({ success: false, message: "Error fetching room" });
    }
  }

  if (req.method === 'POST') {
    const { roomName, name, message } = req.body;
    if (!roomName || !name || !message) {
      return res.status(400).json({ success: false, message: "Room name, name, and message are required" });
    }

    try {
      const timestamp = Date.now();
      const room = await Room.findOne({ roomName });
      
      if (room) {
        // If room exists, add new message
        room.messages.push({ name, message, timestamp });
        await room.save();
        return res.status(201).json({ success: true, data: room });
      } else {
        // If room doesn't exist, create a new room
        const newRoom = new Room({
          roomName,
          messages: [{ name, message, timestamp }],
        });
        await newRoom.save();
        return res.status(201).json({ success: true, data: newRoom });
      }
    } catch (error) {
      return res.status(500).json({ success: false, message: "Error saving message or creating room" });
    }
  }

  res.status(405).json({ success: false, message: "Method not allowed" });
}
