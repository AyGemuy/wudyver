import axios from "axios";
import {
  v4 as uuidv4
} from "uuid";
import {
  FormData,
  Blob
} from "formdata-node";
import SpoofHead from "@/lib/spoof-head";
const headers = {
  accept: "*/*",
  "accept-encoding": "gzip, deflate, br, zstd",
  "accept-language": "vi,en;q=0.9",
  "content-type": "multipart/form-data",
  cookie: `_ga=GA1.1.${Math.random().toString().substr(2)}; __eoi=ID=${uuidv4()}:T=1717863522:RT=${Math.floor(Date.now() / 1e3)}:S=AA-AfjYNKyeeSeFWOceLt_cXZHyy; _ga_WBHK34L0J9=GS1.1.${Math.random().toString().substr(2)}`,
  origin: "https://taoanhdep.com",
  "sec-ch-ua": `"Not.A/Brand";v="24", "Google Chrome";v="125", "Chromium";v="125"`,
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"Windows"',
  "sec-fetch-dest": "empty",
  "sec-fetch-mode": "cors",
  "sec-fetch-site": "same-origin",
  "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "x-requested-with": "XMLHttpRequest",
  ...SpoofHead()
};
async function downloadImage(url) {
  try {
    const response = await axios.get(url, {
      responseType: "arraybuffer"
    });
    return Buffer.from(response.data, "binary");
  } catch (error) {
    throw new Error("Error downloading image");
  }
}
async function postToTaoanhdep(imageBuffer) {
  try {
    const form = new FormData();
    const imageBlob = new Blob([imageBuffer], {
      type: "image/jpeg"
    });
    form.append("input_image", imageBlob, {
      filename: "image.jpg"
    });
    const response = await axios.post("https://taoanhdep.com/public/xoa-nen.php", form, {
      headers: {
        ...headers
      }
    });
    const base64Image = response.data.split(",")[1];
    return Buffer.from(base64Image, "base64");
  } catch (error) {
    throw new Error("Error processing image");
  }
}
export default async function handler(req, res) {
  try {
    const {
      url: imageUrl
    } = req.query;
    if (!imageUrl) {
      return res.status(400).json({
        error: "Image URL is required."
      });
    }
    const imageBuffer = await downloadImage(imageUrl);
    const processedBuffer = await postToTaoanhdep(imageBuffer);
    res.setHeader("Content-Type", "image/jpeg");
    return res.status(200).send(processedBuffer);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}