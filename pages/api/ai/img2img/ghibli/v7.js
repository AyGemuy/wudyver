import axios from "axios";
import {
  FormData,
  Blob
} from "formdata-node";
import SpoofHead from "@/lib/spoof-head";
class PhotoStyleLab {
  constructor() {
    this.prompts = ["Convert this image into a whimsical, magical Ghibli-style, keeping all elements the same, but applying soft textures, gentle shading, and pastel tones.", "Change the style of this image to Studio Ghibli, but do not add any new elements. Apply subtle shading, lighting, and hand-painted textures to create a dreamy atmosphere.", "Recreate this image in Studio Ghibli's signature style, preserving the composition and details, focusing on soft textures, lighting, and vibrant pastel colors.", "Apply a Studio Ghibli-style transformation to this image, using magical lighting, smooth shading, and soft colors, while keeping the original scene and objects unchanged.", "Transform this image into a gentle, Ghibli-style illustration without adding new elements, using warm, pastel colors, soft textures, and whimsical lighting.", "Transform this image into a soft, Ghibli-style illustration with gentle textures, warm pastel colors, and no new elements added to the scene.", "Convert this image into a dreamy Ghibli-style artwork, maintaining the original scene but applying soft shading, whimsical lighting, and painterly textures.", "Turn this picture into a Studio Ghibli animated style, maintaining 100% of the original image’s composition, details, and subjects.", "Reimagine this image in Studio Ghibli style, preserving the composition and adding magical lighting, soft colors, and painterly textures for a whimsical look."];
  }
  getRandomPrompt() {
    const randomIndex = Math.floor(Math.random() * this.prompts.length);
    return this.prompts[randomIndex];
  }
  async getImageData(url) {
    try {
      console.log("Mengambil data gambar...");
      const res = await axios.get(url, {
        responseType: "arraybuffer"
      });
      const contentType = res.headers["content-type"] || "image/jpeg";
      const filename = url.split("/").pop() || "image.jpg";
      return {
        buffer: res.data,
        contentType: contentType,
        filename: filename
      };
    } catch (e) {
      console.error("Gagal mengambil gambar:", e.message);
      throw e;
    }
  }
  async generate({
    imageUrl,
    type = "creative",
    style = "Turn My Photo Into Studio Ghibli",
    prompt = this.getRandomPrompt()
  }) {
    try {
      const {
        buffer,
        contentType,
        filename
      } = await this.getImageData(imageUrl);
      const form = new FormData();
      const nonce = Math.random().toString(36).slice(2, 12);
      form.set("action", "photo_style_convert");
      form.set("photo_style_converter_nonce", nonce);
      form.set("image_data", new Blob([buffer], {
        type: contentType
      }), filename);
      form.set("photo_style_name", style);
      form.set("model_type", type);
      form.set("additional_prompt", prompt);
      console.log("Mengunggah ke PhotoStyleLab...");
      const res = await axios.post("https://photostylelab.com/wp-admin/admin-ajax.php", form, {
        headers: {
          ...form.headers,
          "x-requested-with": "XMLHttpRequest",
          referer: "https://photostylelab.com/photo-styles/turn-my-photo-into-studio-ghibli/",
          ...SpoofHead()
        },
        maxBodyLength: Infinity
      });
      console.log("Unggahan selesai.");
      return res.data;
    } catch (e) {
      console.error("Gagal unggah:", e.message);
      throw e;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.imageUrl) {
    return res.status(400).json({
      error: "imageUrl is required"
    });
  }
  const ghibliImage = new PhotoStyleLab();
  try {
    const data = await ghibliImage.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({
      error: "Error during image processing"
    });
  }
}