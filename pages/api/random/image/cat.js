import fetch from "node-fetch";
export default async function handler(req, res) {
  const {
    text,
    size,
    color,
    type,
    width,
    filter
  } = req.method === "GET" ? req.query : req.body;
  let apiUrl = "";
  let message = "";
  if (text && !size && !color) {
    apiUrl = `https://cataas.com/cat/says/${text}`;
    message = "Paramenter diperlukan: text (teks untuk dikatakan oleh kucing)";
  } else if (text && size) {
    apiUrl = `https://cataas.com/cat/says/${text}?size=${size}`;
    message = "Paramenter diperlukan: text (teks) dan size (ukuran teks)";
  } else if (text && size && color) {
    apiUrl = `https://cataas.com/cat/says/${text}?size=${size}&color=${color}`;
    message = "Paramenter diperlukan: text (teks), size (ukuran teks), dan color (warna teks)";
  } else if (type) {
    apiUrl = `https://cataas.com/cat?type=${type}`;
    message = "Paramenter diperlukan: type (jenis gambar)";
  } else if (width) {
    apiUrl = `https://cataas.com/cat?width=${width}`;
    message = "Paramenter diperlukan: width (lebar gambar)";
  } else if (filter) {
    apiUrl = `https://cataas.com/cat/gif/says/${text}?filter=${filter}&size=${size}&color=${color}`;
    message = "Paramenter diperlukan: text (teks), filter (efek), size (ukuran teks), dan color (warna teks)";
  } else {
    apiUrl = "https://cataas.com/cat";
    message = "Paramenter yang diterima: text, size, color, type, width, filter";
  }
  try {
    const response = await fetch(apiUrl);
    const contentType = response.headers.get("content-type");
    if (contentType.includes("image")) {
      const buffer = await response.arrayBuffer();
      const uint8Array = new Uint8Array(buffer);
      res.setHeader("Content-Type", contentType);
      return res.send(Buffer.from(uint8Array));
    } else if (contentType.includes("json")) {
      return res.json(await response.json());
    }
    res.status(400).json({
      error: "Unsupported content type"
    });
  } catch (error) {
    res.status(500).json({
      error: "Error fetching from Cataas API"
    });
  } finally {
    console.log(message);
  }
}