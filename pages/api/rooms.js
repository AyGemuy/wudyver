import dbConnect from "@/lib/mongoose";
import Room from "@/models/Room";
import mongoose from "mongoose";
export default async function handler(req, res) {
  await dbConnect();
  if (req.method === "GET") {
    const {
      roomName
    } = req.query;
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
        const activeMessages = room.messages.filter(msg => !msg.isDeleted);
        return res.status(200).json({
          success: true,
          data: activeMessages
        });
      } catch (error) {
        console.error("Error fetching room messages:", error);
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
        console.error("Error fetching rooms:", error);
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
      message,
      messageId,
      action,
      userId,
      avatar,
      replyToMessageId,
      emoji
    } = req.body;
    if (action === "sendMessage" || action === "replyMessage") {
      if (!roomName || !name || !message) {
        return res.status(400).json({
          success: false,
          message: "Room name, name, and message are required"
        });
      }
      try {
        const timestamp = Date.now();
        const newMessage = {
          name: name,
          message: message,
          timestamp: timestamp,
          avatar: avatar || "",
          replyTo: replyToMessageId ? new mongoose.Types.ObjectId(replyToMessageId) : null
        };
        const updatedRoom = await Room.findOneAndUpdate({
          roomName: roomName
        }, {
          $push: {
            messages: newMessage
          },
          $setOnInsert: {
            isGroup: true
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
        console.error("Error saving message or creating room:", error);
        return res.status(500).json({
          success: false,
          message: "Error saving message or creating room"
        });
      }
    }
    if (action === "editMessage") {
      if (!roomName || !messageId || !message) {
        return res.status(400).json({
          success: false,
          message: "Room name, message ID, and new message are required"
        });
      }
      try {
        const updatedRoom = await Room.findOneAndUpdate({
          roomName: roomName,
          "messages._id": new mongoose.Types.ObjectId(messageId)
        }, {
          $set: {
            "messages.$.message": message,
            "messages.$.edited": Date.now()
          }
        }, {
          new: true
        });
        if (!updatedRoom) {
          return res.status(404).json({
            success: false,
            message: "Room or message not found."
          });
        }
        return res.status(200).json({
          success: true,
          data: updatedRoom
        });
      } catch (error) {
        console.error("Error editing message:", error);
        return res.status(500).json({
          success: false,
          message: "Error editing message"
        });
      }
    }
    if (action === "deleteMessage") {
      if (!roomName || !messageId) {
        return res.status(400).json({
          success: false,
          message: "Room name and message ID are required"
        });
      }
      try {
        const updatedRoom = await Room.findOneAndUpdate({
          roomName: roomName,
          "messages._id": new mongoose.Types.ObjectId(messageId)
        }, {
          $set: {
            "messages.$.isDeleted": true
          }
        }, {
          new: true
        });
        if (!updatedRoom) {
          return res.status(404).json({
            success: false,
            message: "Room or message not found."
          });
        }
        return res.status(200).json({
          success: true,
          data: updatedRoom
        });
      } catch (error) {
        console.error("Error deleting message:", error);
        return res.status(500).json({
          success: false,
          message: "Error deleting message"
        });
      }
    }
    if (action === "toggleLike" || action === "toggleDislike") {
      if (!roomName || !messageId || !userId) {
        return res.status(400).json({
          success: false,
          message: "Room name, message ID, and user ID are required"
        });
      }
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
        const messageToUpdate = room.messages.id(messageId);
        if (!messageToUpdate) {
          return res.status(404).json({
            success: false,
            message: "Message not found"
          });
        }
        if (action === "toggleLike") {
          if (messageToUpdate.likes.includes(userId)) {
            messageToUpdate.likes = messageToUpdate.likes.filter(id => id !== userId);
          } else {
            messageToUpdate.likes.push(userId);
            messageToUpdate.dislikes = messageToUpdate.dislikes.filter(id => id !== userId);
          }
        } else if (action === "toggleDislike") {
          if (messageToUpdate.dislikes.includes(userId)) {
            messageToUpdate.dislikes = messageToUpdate.dislikes.filter(id => id !== userId);
          } else {
            messageToUpdate.dislikes.push(userId);
            messageToUpdate.likes = messageToUpdate.likes.filter(id => id !== userId);
          }
        }
        await room.save();
        return res.status(200).json({
          success: true,
          data: room
        });
      } catch (error) {
        console.error(`Error toggling ${action} for message:`, error);
        return res.status(500).json({
          success: false,
          message: `Error toggling ${action}`
        });
      }
    }
    if (action === "toggleReaction") {
      if (!roomName || !messageId || !userId || !emoji) {
        return res.status(400).json({
          success: false,
          message: "Room name, message ID, user ID, and emoji are required"
        });
      }
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
        const messageToUpdate = room.messages.id(messageId);
        if (!messageToUpdate) {
          return res.status(404).json({
            success: false,
            message: "Message not found"
          });
        }
        const existingReactionIndex = messageToUpdate.reactions.findIndex(r => r.userId === userId && r.emoji === emoji);
        if (existingReactionIndex !== -1) {
          messageToUpdate.reactions.splice(existingReactionIndex, 1);
        } else {
          messageToUpdate.reactions.push({
            userId: userId,
            emoji: emoji
          });
        }
        await room.save();
        return res.status(200).json({
          success: true,
          data: room
        });
      } catch (error) {
        console.error("Error toggling reaction:", error);
        return res.status(500).json({
          success: false,
          message: "Error toggling reaction"
        });
      }
    }
    if (action === "createGroup") {
      if (!roomName) {
        return res.status(400).json({
          success: false,
          message: "Nama grup diperlukan."
        });
      }
      try {
        const existingRoom = await Room.findOne({
          roomName: roomName
        });
        if (existingRoom) {
          return res.status(409).json({
            success: false,
            message: "Grup dengan nama ini sudah ada."
          });
        }
        const newRoom = await Room.create({
          roomName: roomName,
          isGroup: true,
          messages: []
        });
        return res.status(201).json({
          success: true,
          message: "Grup berhasil dibuat!",
          data: newRoom
        });
      } catch (error) {
        console.error("Error creating group:", error);
        return res.status(500).json({
          success: false,
          message: "Gagal membuat grup baru."
        });
      }
    }
    if (action === "deleteGroup") {
      if (!roomName) {
        return res.status(400).json({
          success: false,
          message: "Nama grup diperlukan untuk dihapus."
        });
      }
      try {
        const deletedRoom = await Room.findOneAndDelete({
          roomName: roomName
        });
        if (!deletedRoom) {
          return res.status(404).json({
            success: false,
            message: "Grup tidak ditemukan."
          });
        }
        return res.status(200).json({
          success: true,
          message: "Grup berhasil dihapus!"
        });
      } catch (error) {
        console.error("Error deleting group:", error);
        return res.status(500).json({
          success: false,
          message: "Gagal menghapus grup."
        });
      }
    }
    res.status(405).json({
      success: false,
      message: "Method or action not allowed"
    });
  }
  res.status(405).json({
    success: false,
    message: "Method Not Allowed"
  });
}