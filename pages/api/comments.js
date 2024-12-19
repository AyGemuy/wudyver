import dbConnect from "../../lib/mongoose";
import Comment from "../../models/Comment";

export default async function handler(req, res) {
  await dbConnect();

  if (req.method === "GET") {
    try {
      const comments = await Comment.find({}).sort({ timestamp: -1 });
      res.status(200).json({ success: true, data: comments });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: "Error fetching comments" });
    }
  } else if (req.method === "POST") {
    const { name, message, parentId } = req.body;

    if (!name || !message) {
      return res.status(400).json({ success: false, message: "Name and message are required" });
    }

    try {
      const timestamp = Date.now();

      if (parentId) {
        const parentComment = await Comment.findById(parentId);
        if (!parentComment) {
          return res.status(404).json({ success: false, message: "Parent comment not found" });
        }

        parentComment.replies.push({ name, message, timestamp });
        await parentComment.save();

        return res.status(201).json({ success: true, data: parentComment });
      } else {
        const newComment = await Comment.create({ name, message, timestamp, replies: [] });
        return res.status(201).json({ success: true, data: newComment });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: "Error saving comment" });
    }
  } else if (req.method === "PUT") {
    const { commentId, message, isReply, replyIndex } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, message: "Message is required" });
    }

    try {
      let updatedComment;
      if (isReply) {
        const comment = await Comment.findById(commentId);
        if (!comment || !comment.replies[replyIndex]) {
          return res.status(404).json({ success: false, message: "Reply not found" });
        }

        comment.replies[replyIndex].message = message;
        comment.replies[replyIndex].timestamp = Date.now();
        updatedComment = await comment.save();
      } else {
        updatedComment = await Comment.findByIdAndUpdate(
          commentId,
          { message, timestamp: Date.now() },
          { new: true }
        );
      }

      return res.status(200).json({ success: true, data: updatedComment });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: "Error updating comment" });
    }
  } else if (req.method === "DELETE") {
    const { commentId, isReply, replyIndex } = req.body;

    try {
      if (isReply) {
        const comment = await Comment.findById(commentId);
        if (!comment || !comment.replies[replyIndex]) {
          return res.status(404).json({ success: false, message: "Reply not found" });
        }

        comment.replies.splice(replyIndex, 1);
        const updatedComment = await comment.save();

        return res.status(200).json({ success: true, data: updatedComment });
      } else {
        const deletedComment = await Comment.findByIdAndDelete(commentId);
        if (!deletedComment) {
          return res.status(404).json({ success: false, message: "Comment not found" });
        }

        return res.status(200).json({ success: true, message: "Comment deleted" });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: "Error deleting comment" });
    }
  } else {
    res.status(405).json({ success: false, message: "Method not allowed" });
  }
}
