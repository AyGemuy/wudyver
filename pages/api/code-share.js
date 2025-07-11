import connectMongo from "@/lib/mongoose";
import Code from "@/models/CodeShare";
export default async function handler(req, res) {
  try {
    await connectMongo();
    switch (req.method) {
      case "GET": {
        const {
          search,
          tag,
          sortBy,
          id
        } = req.query;
        let filter = {};
        if (id) {
          filter._id = id;
        } else {
          if (search) {
            filter.fileName = {
              $regex: search,
              $options: "i"
            };
          }
          if (tag) {
            filter.tag = tag;
          }
        }
        const codes = await Code.find(filter).sort({
          [sortBy || "createdAt"]: -1
        }).lean();
        return res.status(200).json(codes);
      }
      case "POST": {
        const {
          author,
          fileName,
          code,
          tag
        } = req.body;
        if (!author || !fileName || !code) {
          return res.status(400).json({
            message: "Missing required fields: author, fileName, or code!"
          });
        }
        const newCode = new Code({
          author: author,
          fileName: fileName,
          code: code,
          tag: tag || "Unknown",
          likes: 0,
          dislikes: 0,
          views: 0
        });
        await newCode.save();
        return res.status(201).json({
          message: "Code shared successfully!",
          code: newCode
        });
      }
      case "PUT": {
        const {
          id,
          action
        } = req.body;
        if (!id || !action) {
          return res.status(400).json({
            message: "Missing required fields: id and action!"
          });
        }
        let updateQuery = {};
        switch (action) {
          case "like":
            updateQuery = {
              $inc: {
                likes: 1
              }
            };
            break;
          case "dislike":
            updateQuery = {
              $inc: {
                dislikes: 1
              }
            };
            break;
          case "view":
            updateQuery = {
              $inc: {
                views: 1
              }
            };
            break;
          default:
            return res.status(400).json({
              message: "Invalid action! Valid actions are 'like', 'dislike', or 'view'."
            });
        }
        const updatedCode = await Code.findByIdAndUpdate(id, updateQuery, {
          new: true
        });
        if (!updatedCode) {
          return res.status(404).json({
            message: "Code not found!"
          });
        }
        return res.status(200).json({
          message: `${action} updated successfully!`,
          code: updatedCode
        });
      }
      case "DELETE": {
        const {
          id
        } = req.body;
        if (id) {
          const deletedCode = await Code.findByIdAndDelete(id);
          if (!deletedCode) {
            return res.status(404).json({
              message: "Code not found!"
            });
          }
          return res.status(200).json({
            message: "Code deleted successfully!"
          });
        } else {
          await Code.deleteMany({});
          return res.status(200).json({
            message: "All codes cleared!"
          });
        }
      }
      default:
        return res.status(405).json({
          message: "Method Not Allowed"
        });
    }
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({
      message: "Internal Server Error"
    });
  }
}