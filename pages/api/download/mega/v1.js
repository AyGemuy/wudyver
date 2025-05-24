import {
  File
} from "megajs";
import {
  lookup
} from "mime-types";
export default async function handler(req, res) {
  const {
    url: inputUrl,
    format
  } = req.method === "GET" ? req.query : req.body;
  const url = decodeURIComponent(inputUrl);
  if (!url) return res.status(400).json({
    error: "File URL is required"
  });
  try {
    const file = File.fromURL(url);
    await file.loadAttributes();
    return format === "json" ? res.status(200).json({
      ...file,
      name: file.name,
      size: file.size,
      url: file.url,
      mime: lookup(file.name) || "application/octet-stream"
    }) : (async () => {
      const fileBuffer = await file.downloadBuffer();
      const mimeType = lookup(file.name) || "application/octet-stream";
      res.setHeader("Content-Type", mimeType);
      res.setHeader("Content-Disposition", `attachment; filename="${file.name}"`);
      return res.status(200).send(fileBuffer);
    })();
  } catch (error) {
    res.status(500).json({
      error: "Failed to process file"
    });
  }
}