import dbConnect from "@/lib/mongoose";
import Comment from "@/models/Comment";
export default async function handler(req, res) {
  await dbConnect();
  if (req.method === "GET") {
    try {
      const comments = await Comment.find({}).sort({
        createdAt: -1
      });
      return res.status(200).json({
        success: true,
        data: comments
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error fetching comments"
      });
    }
  } else if (req.method === "POST") {
    const {
      name,
      message,
      parentId
    } = req.body;
    if (!name || !message) {
      return res.status(400).json({
        success: false,
        message: "Name and message are required"
      });
    }
    try {
      if (parentId) {
        const parentComment = await Comment.findById(parentId);
        if (!parentComment) {
          return res.status(404).json({
            success: false,
            message: "Parent comment not found"
          });
        }
        parentComment.replies.push({
          name: name,
          message: message,
          timestamp: Date.now()
        });
        await parentComment.save();
        res.status(201).json({
          success: true
        });
      } else {
        await Comment.create({
          name: name,
          message: message,
          timestamp: Date.now(),
          replies: []
        });
        res.status(201).json({
          success: true
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error saving comment"
      });
    }
  } else if (req.method === "PUT") {
    const {
      commentId,
      message
    } = req.body;
    if (!message) {
      return res.status(400).json({
        success: false,
        message: "Message is required"
      });
    }
    try {
      const updatedComment = await Comment.findOneAndUpdate({
        _id: commentId
      }, {
        message: message,
        updatedAt: Date.now()
      }, {
        new: true
      });
      if (!updatedComment) {
        return res.status(404).json({
          success: false,
          message: "Comment not found"
        });
      }
      return res.status(200).json({
        success: true,
        data: updatedComment
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error updating comment"
      });
    }
  } else if (req.method === "DELETE") {
    const {
      commentId
    } = req.body;
    try {
      const deletedComment = await Comment.findByIdAndDelete(commentId);
      if (!deletedComment) {
        return res.status(404).json({
          success: false,
          message: "Comment not found"
        });
      }
      return res.status(200).json({
        success: true,
        message: "Comment deleted"
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error deleting comment"
      });
    }
  } else {
    res.status(405).json({
      success: false,
      message: "Method not allowed"
    });
  }
}