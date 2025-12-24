import axios from "axios";
import {
  FormData,
  Blob
} from "formdata-node";
import {
  fileTypeFromBuffer
} from "file-type";
async function fetchImageBuffer(url) {
  try {
    const response = await axios.get(url, {
      responseType: "arraybuffer"
    });
    if (response.status !== 200) throw new Error("Failed to fetch image");
    return response.data;
  } catch (error) {
    throw new Error("Error fetching image: " + error.message);
  }
}
async function photoManipulation(namaFile, blob, effectId, ext, mime) {
  try {
    const fd = new FormData();
    fd.append("name", `${namaFile}.${ext}`);
    fd.append("file", blob, `${namaFile}.${ext}`);
    const uploadResponse = await axios.post("https://photomania.net/upload/file", fd, {
      headers: fd.getHeaders()
    });
    if (uploadResponse.status !== 200) throw new Error("Failed to upload file");
    const uploadData = uploadResponse.data;
    const formData = new URLSearchParams({
      photoId: `${uploadData.id}`,
      effectId: `${effectId}`
    });
    const renderResponse = await axios.post("https://photomania.net/render", formData, {
      headers: {
        accept: "application/json, text/javascript, */*; q=0.01",
        "content-type": "application/x-www-form-urlencoded; charset=UTF-8"
      }
    });
    if (renderResponse.status !== 200) throw new Error("Failed to render photo");
    const renderData = renderResponse.data;
    return {
      status: renderResponse.status,
      result: {
        url: renderData.url,
        url_secure: renderData.url_secure,
        ukuran: renderData.width + " x " + renderData.height,
        expires_at: renderData.expires_at
      }
    };
  } catch (error) {
    console.error("Error:", error);
    return {
      error: error.message
    };
  }
}
async function fetchEffectsList() {
  try {
    const response = await axios.get("https://raw.githubusercontent.com/imbharat420/Tasks/f1c0e5b24778891e18031acbeefecffe2ecfb4e3/knovator%20Gujarat/Knovator/src/utils/data.json");
    if (response.status !== 200) throw new Error("Failed to fetch effects list");
    const data = response.data;
    if (!data.sidebar) throw new Error("Invalid data format");
    const effects = data.sidebar.flatMap(category => category.zones || []).flatMap(zone => zone.effects || []).map(effect => ({
      id: effect.id,
      api_id: effect.api_id,
      name: effect.name
    }));
    return effects;
  } catch (error) {
    throw new Error("Failed to fetch effects list: " + error.message);
  }
}
export default async function handler(req, res) {
  if (req.method === "GET" || req.method === "POST") {
    try {
      const input = req.method === "GET" ? req.query.effectIndex : req.body.effectIndex;
      if (!input) {
        return res.status(400).json({
          error: "Please provide the desired effect index.\nUsage: *photomania <effectIndex>*"
        });
      }
      const effectIndex = parseInt(input.trim(), 10);
      const effects = await fetchEffectsList();
      if (isNaN(effectIndex) || effectIndex < 1 || effectIndex > effects.length) {
        const itemsList = effects.map((effect, index) => `${index + 1}. ${effect.name}`).join("\n");
        return res.status(400).json({
          error: `Invalid effect index. Please provide a valid index.\n\nAvailable options:\n${itemsList}\n\nUsage: *photomania <effectIndex>*`
        });
      }
      const selectedEffect = effects[effectIndex - 1];
      const imageUrl = req.method === "GET" ? req.query.imageUrl : req.body.imageUrl;
      if (!imageUrl) {
        return res.status(400).json({
          error: "No image URL provided"
        });
      }
      const buffer = await fetchImageBuffer(imageUrl);
      const {
        ext,
        mime
      } = await fileTypeFromBuffer(buffer) || {};
      if (!mime) throw new Error("No media found or unsupported media type");
      const blob = new Blob([buffer], {
        type: mime
      });
      const photoManipulationResult = await photoManipulation("image", blob, selectedEffect.api_id, ext, mime);
      if (photoManipulationResult.error) {
        throw new Error(photoManipulationResult.error);
      }
      return res.status(200).json({
        result: {
          url: photoManipulationResult.result.url,
          url_secure: photoManipulationResult.result.url_secure,
          ukuran: photoManipulationResult.result.ukuran,
          expires_at: photoManipulationResult.result.expires_at
        }
      });
    } catch (error) {
      console.error("Error:", error);
      return res.status(500).json({
        error: error.message
      });
    }
  } else {
    res.status(405).json({
      error: "Method Not Allowed"
    });
  }
}