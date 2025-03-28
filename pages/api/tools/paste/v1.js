import connectMongo from "../../../../lib/mongoose";
import Paste from "../../../../models/Paste";
import crypto from "crypto";
const generateRandomKey = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from(crypto.randomBytes(8)).map(byte => chars[byte % chars.length]).join("");
};
export default async function handler(req, res) {
  try {
    await connectMongo();
    const {
      action,
      key,
      title,
      content,
      raw,
      syntax,
      expireIn
    } = req.method === "POST" ? req.body : req.query;
    const isRaw = raw === "true";
    switch (action) {
      case "create":
        if (!title || !content) {
          return res.status(400).json({
            error: "Title and content are required"
          });
        }
        let newKey = key || generateRandomKey();
        while (await Paste.findOne({
            key: newKey
          })) {
          newKey = generateRandomKey();
        }
        const expirationDate = expireIn ? new Date(Date.now() + parseInt(expireIn) * 1e3) : null;
        const newPaste = new Paste({
          title: title,
          content: content,
          key: newKey,
          syntax: syntax || "text",
          expiresAt: expirationDate
        });
        await newPaste.save();
        const response = {
          title: newPaste.title,
          content: newPaste.content,
          key: newPaste.key,
          syntax: newPaste.syntax,
          expiresAt: newPaste.expiresAt
        };
        return isRaw ? res.status(201).send(newPaste.content) : res.status(201).json(response);
      case "get":
        if (!key && !title) {
          return res.status(400).json({
            error: "Key or title is required to get paste"
          });
        }
        let paste;
        if (key) paste = await Paste.findOne({
          key: key
        });
        else if (title) paste = await Paste.findOne({
          title: title
        });
        if (!paste) {
          paste = new Paste({
            title: title || "Untitled",
            content: "This paste was automatically initialized as it was not found.",
            key: key || generateRandomKey(),
            syntax: syntax || "text",
            expiresAt: null
          });
          await paste.save();
        }
        if (paste.expiresAt && new Date(paste.expiresAt) < new Date()) {
          return res.status(410).send(isRaw ? "Paste has expired" : JSON.stringify({
            error: "Paste has expired"
          }));
        }
        return isRaw ? res.status(200).send(paste.content) : res.status(200).json({
          title: paste.title,
          content: paste.content,
          key: paste.key,
          syntax: paste.syntax,
          expiresAt: paste.expiresAt
        });
      case "delete":
        if (!key) {
          return res.status(400).send(isRaw ? "Key is required to delete paste" : JSON.stringify({
            error: "Key is required to delete paste"
          }));
        }
        const pasteToDelete = await Paste.findOneAndDelete({
          key: key
        });
        if (!pasteToDelete) {
          return res.status(404).send(isRaw ? "Paste not found" : JSON.stringify({
            error: "Paste not found"
          }));
        }
        return res.status(200).send(isRaw ? `Paste with key ${key} has been deleted` : JSON.stringify({
          message: `Paste with key ${key} has been deleted`
        }));
      case "clear":
        await Paste.deleteMany({});
        return res.status(200).send(isRaw ? "All pastes have been cleared" : JSON.stringify({
          message: "All pastes have been cleared"
        }));
      case "list":
        const allPastes = await Paste.find({});
        return res.status(200).json(allPastes);
      default:
        return res.status(400).send(isRaw ? "Invalid action" : JSON.stringify({
          error: "Invalid action"
        }));
    }
  } catch (error) {
    return res.status(500).json({
      error: "Internal server error"
    });
  }
}