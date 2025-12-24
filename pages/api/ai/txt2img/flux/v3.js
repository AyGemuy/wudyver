import axios from "axios";
import {
  FormData
} from "formdata-node";
const models = ["flux_1_schnell", "flux_1_dev", "sana_1_6b"];
const sizes = ["1_1", "1_1_HD", "1_2", "2_1", "2_3", "4_5", "9_16", "3_2", "4_3", "16_9"];
const styles = ["no_style", "anime", "digital", "fantasy", "neon_punk", "dark", "low_poly", "line_art", "pixel_art", "comic", "analog_film", "surreal"];
const colors = ["no_color", "cool", "muted", "vibrant", "pastel", "bw"];
const lightings = ["no_lighting", "lighting", "dramatic", "volumetric", "studio", "sunlight", "low_light", "golden_hour"];
export default async function handler(req, res) {
  const {
    prompt,
    model = 1,
    size = 1,
    style = 1,
    color = 1,
    lighting = 1
  } = req.method === "GET" ? req.query : req.body;
  const errors = [];
  if (!prompt?.trim()) errors.push("Prompt tidak boleh kosong.");
  if (!models[model - 1]) errors.push(`Index model tidak valid, pilih dari 1 sampai ${models.length}.`);
  if (!sizes[size - 1]) errors.push(`Index size tidak valid, pilih dari 1 sampai ${sizes.length}.`);
  if (!styles[style - 1]) errors.push(`Index style tidak valid, pilih dari 1 sampai ${styles.length}.`);
  if (!colors[color - 1]) errors.push(`Index color tidak valid, pilih dari 1 sampai ${colors.length}.`);
  if (!lightings[lighting - 1]) errors.push(`Index lighting tidak valid, pilih dari 1 sampai ${lightings.length}.`);
  if (errors.length > 0) {
    return res.status(400).json({
      errors: errors
    });
  }
  try {
    const formData = new FormData();
    formData.append("prompt", prompt);
    formData.append("model", models[model - 1]);
    formData.append("size", sizes[size - 1]);
    formData.append("style", styles[style - 1]);
    formData.append("color", colors[color - 1]);
    formData.append("lighting", lightings[lighting - 1]);
    const response = await axios.post("https://api.freeflux.ai/v1/images/generate", formData, {
      headers: {
        accept: "application/json, text/plain, */*",
        "content-type": "multipart/form-data",
        origin: "https://freeflux.ai",
        priority: "u=1, i",
        referer: "https://freeflux.ai/",
        "user-agent": "Postify/1.0.0"
      }
    });
    const {
      id,
      status,
      result,
      processingTime,
      width,
      height,
      nsfw,
      seed
    } = response.data;
    const imageBuffer = Buffer.from(result.split(",")[1], "base64");
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Content-Disposition", 'inline; filename="generated_image.png"');
    return res.status(200).send(Buffer.from(imageBuffer));
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({
      errors: error.message
    });
  }
}