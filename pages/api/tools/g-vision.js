import axios from "axios";
class GoogleVisionAPI {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.endpoint = "https://vision.googleapis.com/v1/images:annotate";
    this.features = {
      TYPE_UNSPECIFIED: "TYPE_UNSPECIFIED",
      FACE_DETECTION: "FACE_DETECTION",
      LANDMARK_DETECTION: "LANDMARK_DETECTION",
      LOGO_DETECTION: "LOGO_DETECTION",
      LABEL_DETECTION: "LABEL_DETECTION",
      TEXT_DETECTION: "TEXT_DETECTION",
      DOCUMENT_TEXT_DETECTION: "DOCUMENT_TEXT_DETECTION",
      SAFE_SEARCH_DETECTION: "SAFE_SEARCH_DETECTION",
      IMAGE_PROPERTIES: "IMAGE_PROPERTIES",
      CROP_HINTS: "CROP_HINTS",
      WEB_DETECTION: "WEB_DETECTION",
      PRODUCT_SEARCH: "PRODUCT_SEARCH",
      OBJECT_LOCALIZATION: "OBJECT_LOCALIZATION"
    };
  }
  async generate({
    image,
    features,
    imageContext,
    ...rest
  }) {
    if (!this.apiKey) {
      throw new Error("API key is required.");
    }
    if (!features) {
      throw new Error("Features are required.");
    }
    const normalizedFeatures = Array.isArray(features) ? features : [features];
    const validFeatureTypes = Object.values(this.features);
    for (const type of normalizedFeatures) {
      if (!validFeatureTypes.includes(type)) {
        throw new Error(`Invalid feature type: ${type}. Valid types are: ${validFeatureTypes.join(", ")}`);
      }
    }
    let imageData;
    if (typeof image === "string") {
      if (image.startsWith("http://") || image.startsWith("https://") || image.startsWith("gs://")) {
        imageData = {
          source: {
            imageUri: image
          }
        };
      } else {
        imageData = {
          content: image
        };
      }
    } else if (Buffer.isBuffer(image)) {
      imageData = {
        content: image.toString("base64")
      };
    } else {
      throw new Error("Invalid image input: must be URL/GCS URI, base64 string, or Buffer.");
    }
    const request = {
      image: imageData,
      features: normalizedFeatures.map(type => ({
        type: type
      })),
      ...rest
    };
    if (imageContext) {
      request.imageContext = imageContext;
    }
    const requestBody = {
      requests: [request]
    };
    try {
      const response = await axios.post(`${this.endpoint}?key=${this.apiKey}`, requestBody, {
        headers: {
          "Content-Type": "application/json"
        }
      });
      const annotationResponse = response.data.responses[0];
      if (annotationResponse.error) {
        throw new Error(`API error: ${annotationResponse.error.message}`);
      }
      return annotationResponse;
    } catch (error) {
      console.error("Error in API call:", error.response ? error.response.data : error.message);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.image) {
    return res.status(400).json({
      error: "Parameter 'image' diperlukan"
    });
  }
  const api = new GoogleVisionAPI();
  try {
    const data = await api.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses gambar";
    console.error("Vision API Error:", error);
    return res.status(500).json({
      error: errorMessage
    });
  }
}