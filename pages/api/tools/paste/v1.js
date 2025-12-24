import connectMongo from "@/lib/mongoose";
import Paste from "@/models/Paste";
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
      output,
      syntax,
      expireIn
    } = req.method === "POST" ? req.body : req.query;
    const isRaw = raw === "true";
    const requestedOutput = output ? output.toLowerCase() : "json";
    const setResponse = (data, statusCode, contentType) => {
      res.setHeader("Content-Type", contentType);
      return res.status(statusCode).send(data);
    };
    switch (action) {
      case "create":
        if (!title || !content) {
          return setResponse(JSON.stringify({
            error: "Title and content are required"
          }), 400, "application/json");
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
          expiresAt: expirationDate,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        await newPaste.save();
        const responseData = {
          title: newPaste.title,
          content: newPaste.content,
          key: newPaste.key,
          syntax: newPaste.syntax,
          expiresAt: newPaste.expiresAt,
          createdAt: newPaste.createdAt,
          updatedAt: newPaste.updatedAt
        };
        if (isRaw) {
          return setResponse(newPaste.content, 201, "text/plain");
        }
        switch (requestedOutput) {
          case "text":
            return setResponse(newPaste.content, 201, "text/plain");
          case "html":
            return setResponse(newPaste.content, 201, "text/html");
          case "json":
          default:
            return setResponse(JSON.stringify(responseData), 201, "application/json");
        }
      case "get":
        if (!key && !title) {
          return setResponse(JSON.stringify({
            error: "Key or title is required to get paste"
          }), 400, "application/json");
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
            expiresAt: null,
            createdAt: new Date(),
            updatedAt: new Date()
          });
          await paste.save();
        }
        if (paste.expiresAt && new Date(paste.expiresAt) < new Date()) {
          const expiredMessage = {
            error: "Paste has expired"
          };
          return isRaw ? setResponse("Paste has expired", 410, "text/plain") : requestedOutput === "text" ? setResponse("Paste has expired", 410, "text/plain") : setResponse(JSON.stringify(expiredMessage), 410, "application/json");
        }
        if (isRaw) {
          return setResponse(paste.content, 200, "text/plain");
        }
        switch (requestedOutput) {
          case "text":
            return setResponse(paste.content, 200, "text/plain");
          case "html":
            return setResponse(paste.content, 200, "text/html");
          case "json":
          default:
            return setResponse(JSON.stringify({
              title: paste.title,
              content: paste.content,
              key: paste.key,
              syntax: paste.syntax,
              expiresAt: paste.expiresAt,
              createdAt: paste.createdAt,
              updatedAt: paste.updatedAt
            }), 200, "application/json");
        }
      case "delete":
        if (!key) {
          const errorMessage = {
            error: "Key is required to delete paste"
          };
          return isRaw ? setResponse("Key is required to delete paste", 400, "text/plain") : requestedOutput === "text" ? setResponse("Key is required to delete paste", 400, "text/plain") : setResponse(JSON.stringify(errorMessage), 400, "application/json");
        }
        const pasteToDelete = await Paste.findOneAndDelete({
          key: key
        });
        if (!pasteToDelete) {
          const notFoundMessage = {
            error: "Paste not found"
          };
          return isRaw ? setResponse("Paste not found", 404, "text/plain") : requestedOutput === "text" ? setResponse("Paste not found", 404, "text/plain") : setResponse(JSON.stringify(notFoundMessage), 404, "application/json");
        }
        const deleteSuccessMessage = {
          message: `Paste with key ${key} has been deleted`
        };
        return isRaw ? setResponse(`Paste with key ${key} has been deleted`, 200, "text/plain") : requestedOutput === "text" ? setResponse(`Paste with key ${key} has been deleted`, 200, "text/plain") : setResponse(JSON.stringify(deleteSuccessMessage), 200, "application/json");
      case "clear":
        await Paste.deleteMany({});
        const clearSuccessMessage = {
          message: "All pastes have been cleared"
        };
        return isRaw ? setResponse("All pastes have been cleared", 200, "text/plain") : requestedOutput === "text" ? setResponse("All pastes have been cleared", 200, "text/plain") : setResponse(JSON.stringify(clearSuccessMessage), 200, "application/json");
      case "list":
        const allPastes = await Paste.find({});
        return setResponse(JSON.stringify(allPastes), 200, "application/json");
      default:
        const invalidActionMessage = {
          error: "Invalid action"
        };
        return isRaw ? setResponse("Invalid action", 400, "text/plain") : requestedOutput === "text" ? setResponse("Invalid action", 400, "text/plain") : setResponse(JSON.stringify(invalidActionMessage), 400, "application/json");
    }
  } catch (error) {
    return res.status(500).json({
      error: "Internal server error"
    });
  }
}