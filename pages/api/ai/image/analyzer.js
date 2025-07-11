import axios from "axios";
export default async function handler(req, res) {
  try {
    const {
      url: img,
      prompt = "Analyze this image in detail, including its main elements, style, composition, and any notable features."
    } = req.method === "GET" ? req.query : req.body;
    if (!img) {
      return res.status(400).json({
        error: "Url tidak ditemukan"
      });
    }
    let imgBase64, mimeType;
    if (img.startsWith("http://") || img.startsWith("https://")) {
      const response = await axios.get(img, {
        responseType: "arraybuffer"
      });
      imgBase64 = Buffer.from(response.data, "binary").toString("base64");
      mimeType = response.headers["content-type"];
    } else {
      return res.status(400).json({
        error: "Hanya mendukung URL gambar"
      });
    }
    const response = await axios.post("https://aiimageanalyzer.online/api/analyze", {
      image: `data:${mimeType};base64,${imgBase64}`,
      prompt: prompt
    }, {
      headers: {
        "content-type": "application/json",
        origin: "https://aiimageanalyzer.online",
        referer: "https://aiimageanalyzer.online",
        "user-agent": "Postify/1.0.0"
      },
      responseType: "text"
    });
    const result = parse(response.data);
    return res.status(200).json({
      result: result
    });
  } catch (error) {
    console.error("Error:", error.message);
    return res.status(500).json({
      error: "Terjadi kesalahan"
    });
  }
}

function parse(data) {
  let result = "";
  data.split("\n").forEach(line => {
    if (line.startsWith("data: ")) {
      try {
        const json = JSON.parse(line.substring(6));
        if (json.content) {
          result += json.content;
        }
      } catch (error) {
        console.error("Parsing error:", error);
      }
    }
  });
  return result.trim();
}