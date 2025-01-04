import {
  File
} from "megajs";
import {
  lookup
} from "mime-types";
export default async function handler(req, res) {
  const {
    url
  } = req.method === "GET" ? req.query : req.body;
  if (!url) return res.status(400).json({
    error: "File URL is required"
  });
  try {
    const file = File.fromURL(url);
    await file.loadAttributes();
    const fileBuffer = await file.downloadBuffer();
    const mimeType = lookup(file.name) || "application/octet-stream";
    res.setHeader("Content-Type", mimeType);
    res.setHeader("Content-Disposition", `attachment; filename="${file.name}"`);
    res.status(200).send(fileBuffer);
  } catch (error) {
    res.status(500).json({
      error: "Failed to process file"
    });
  }
}