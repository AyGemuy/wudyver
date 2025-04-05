import * as cheerio from "cheerio";
import PDFDocument from "pdfkit";
import fetch from "node-fetch";
async function rokuSearch(q) {
  try {
    const response = await fetch(`https://rokuhentai.com/_search?q=${encodeURIComponent(q)}`);
    const data = await response.json();
    return data["manga-cards"].map(html => {
      const $ = cheerio.load(html);
      const title = $(".mdc-typography--body1.site-manga-card__title--primary").text().trim().replace(/[\n\s]+/g, " ");
      const captionElement = $('.mdc-typography--caption:contains("images")');
      const numImagesMatch = captionElement.text().trim().match(/(\d+)\s*images/);
      const numImages = parseInt(numImagesMatch ?? 0, 10);
      const timestampText = captionElement.contents().filter((i, el) => el.nodeType === 3).text().trim().replace(/\s+/g, " ");
      const mangaLink = $("a").attr("href") || "";
      const allImageUrls = new Array(numImages).fill().map((_, i) => `${mangaLink.replace("https://rokuhentai.com/", "https://rokuhentai.com/_images/pages/")}${i === 0 ? "0" : i}.jpg`);
      return {
        title: title,
        numImages: numImages,
        timestamp: timestampText.split("images")[1] ?? "",
        mangaLink: mangaLink,
        allImageUrls: allImageUrls,
        detailsLink: $('a:contains("Details")').attr("href") || ""
      };
    });
  } catch (error) {
    return null;
  }
}
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
        } catch {}
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
  const {
    q,
    index,
    pdf
  } = req.method === "GET" ? req.query : req.body;
  if (!q) return res.status(400).json({
    error: "Query parameter 'q' is required"
  });
  const results = await rokuSearch(q);
  if (!results || results.length === 0) return res.status(404).json({
    error: "No results found"
  });
  const idx = index ? parseInt(index, 10) : 0;
  if (idx < 0 || idx >= results.length) return res.status(400).json({
    error: "Invalid index"
  });
  const selectedResult = results[idx];
  if (pdf) {
    const pdfBuffer = await createPDFBuffer(selectedResult.allImageUrls);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=Rokuhentai.pdf`);
    return res.status(200).send(pdfBuffer);
  }
  return res.status(200).json({
    result: selectedResult
  });
}