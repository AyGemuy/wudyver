import PDFDocument from "pdfkit";
import fetch from "node-fetch";
async function createPDFBuffer(imageUrls) {
  return new Promise(async (resolve, reject) => {
    try {
      const pdfDoc = new PDFDocument();
      const buffers = [];
      for (const imageUrl of imageUrls) {
        try {
          const response = await fetch(imageUrl);
          const imageBuffer = Buffer.from(await response.arrayBuffer());
          pdfDoc.addPage().image(imageBuffer, {
            width: 600
          });
        } catch (error) {
          console.error(`Failed to load image: ${imageUrl}`, error.message);
        }
      }
      pdfDoc.end();
      pdfDoc.on("data", buffer => buffers.push(buffer));
      pdfDoc.on("end", () => resolve(Buffer.concat(buffers)));
    } catch (error) {
      reject(error);
    }
  });
}
export default async function handler(req, res) {
  let imageUrls;
  if (req.method === "GET") {
    const {
      images
    } = req.method === "GET" ? req.query : req.body;
    if (!images) {
      return res.status(400).json({
        error: "No image URLs provided"
      });
    }
    imageUrls = images.split(",").map(url => url.trim());
  } else if (req.method === "POST") {
    imageUrls = Array.isArray(req.body?.images) ? req.body.images : [req.body?.images];
  }
  try {
    const pdfBuffer = await createPDFBuffer(imageUrls);
    res.setHeader("Content-Type", "application/pdf");
    return res.status(200).send(pdfBuffer);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}