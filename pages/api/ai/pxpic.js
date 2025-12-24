import axios from "axios";
class PxPic {
  constructor() {
    this.BASE_URL = "https://pxpic.com";
  }
  async hdImage(imageUrl) {
    const endpoint = `${this.BASE_URL}/callPhotoEnhancer`;
    try {
      const response = await axios.post(endpoint, {
        imageUrl: imageUrl
      }, {
        headers: {
          "Content-Type": "application/json"
        }
      });
      return response.data.resultImageUrl;
    } catch (error) {
      throw new Error(error.response?.data?.message || "Failed to enhance image");
    }
  }
  async removeBg(imageUrl) {
    const endpoint = `${this.BASE_URL}/callRemoveBackground`;
    try {
      const response = await axios.post(endpoint, {
        imageUrl: imageUrl
      }, {
        headers: {
          "Content-Type": "application/json"
        }
      });
      return response.data.resultImageUrl;
    } catch (error) {
      throw new Error(error.response?.data?.message || "Failed to remove background");
    }
  }
  async addFilter(imageUrl, filterKey) {
    const validFilterKey = filterKey >= 1 && filterKey <= 70 ? filterKey : null;
    if (!validFilterKey) {
      throw new Error("Invalid filter key. It must be a number between 1 and 70.");
    }
    const endpoint = `${this.BASE_URL}/callAddFilterToPhoto`;
    try {
      const response = await axios.post(endpoint, {
        imageUrl: imageUrl,
        filterKey: validFilterKey
      }, {
        headers: {
          "Content-Type": "application/json"
        }
      });
      return response.data.resultImageUrl;
    } catch (error) {
      throw new Error(error.response?.data?.message || "Failed to apply filter");
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    url,
    key
  } = req.method === "GET" ? req.query : req.body;
  if (!action || !url) {
    return res.status(400).json({
      message: "Action and url are required"
    });
  }
  const pxPic = new PxPic();
  try {
    let resultImageUrl;
    switch (action) {
      case "hdimage":
        resultImageUrl = await pxPic.hdImage(url);
        break;
      case "removebg":
        resultImageUrl = await pxPic.removeBg(url);
        break;
      case "filter":
        if (!key || isNaN(key) || key < 1 || key > 70) {
          return res.status(400).json({
            message: "Key must be a number between 1 and 70"
          });
        }
        resultImageUrl = await pxPic.addFilter(url, parseInt(key));
        break;
      default:
        return res.status(400).json({
          message: "Invalid action"
        });
    }
    return res.status(200).json({
      resultImageUrl: resultImageUrl
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message
    });
  }
}