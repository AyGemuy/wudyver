import axios from "axios";
import SpoofHead from "@/lib/spoof-head";
class Artly {
  constructor() {
    this.api = {
      base: "https://getimg-x4mrsuupda-uc.a.run.app",
      endpoint: {
        generate: "/api-premium",
        transform: "/image-to-image"
      }
    };
    this.headers = {
      "user-agent": "NB Android/1.0.0",
      "accept-encoding": "gzip",
      "content-type": "application/x-www-form-urlencoded",
      ...SpoofHead()
    };
    this.logger = {
      info: (message, data = {}) => console.log(`[Artly] INFO: ${message}`, data),
      error: (message, error = {}) => console.error(`[Artly] ERROR: ${message}`, error),
      warn: (message, data = {}) => console.warn(`[Artly] WARN: ${message}`, data),
      debug: (message, data = {}) => console.debug(`[Artly] DEBUG: ${message}`, data)
    };
  }
  async txt2img({
    prompt,
    width = 512,
    height = 512,
    steps = 25,
    ...rest
  }) {
    this.logger.info("Starting text-to-image generation", {
      promptLength: prompt?.length || 0,
      width: width,
      height: height,
      steps: steps
    });
    if (!prompt?.trim()) {
      const errorMsg = "Prompt is required for image generation. Please provide a description.";
      this.logger.warn("Text-to-image generation failed: prompt is empty");
      return {
        success: false,
        code: 400,
        result: {
          error: errorMsg,
          details: "The prompt parameter cannot be empty or contain only whitespace."
        }
      };
    }
    if (prompt.length > 1e3) {
      const errorMsg = "Prompt is too long. Maximum allowed length is 1000 characters.";
      this.logger.warn("Text-to-image generation failed: prompt too long", {
        length: prompt.length
      });
      return {
        success: false,
        code: 400,
        result: {
          error: errorMsg,
          details: `Current length: ${prompt.length} characters`
        }
      };
    }
    try {
      const payload = new URLSearchParams();
      payload.append("prompt", prompt);
      payload.append("width", width.toString());
      payload.append("height", height.toString());
      payload.append("num_inference_steps", steps.toString());
      Object.entries(rest).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          payload.append(key, value.toString());
        }
      });
      this.logger.debug("Sending text-to-image request payload", {
        endpoint: `${this.api.endpoint.generate}`,
        parameters: Object.fromEntries(payload)
      });
      const response = await axios.post(`${this.api.base}${this.api.endpoint.generate}`, payload, {
        headers: this.headers,
        timeout: 3e4,
        validateStatus: status => status < 500
      });
      if (response.status >= 400) {
        const errorMsg = response.data?.error || "Image generation failed due to server error";
        this.logger.error("Text-to-image API returned error status", {
          status: response.status,
          response: response.data
        });
        return {
          success: false,
          code: response.status,
          result: {
            error: errorMsg,
            details: response.data?.details || "Please check your parameters and try again."
          }
        };
      }
      const data = response.data;
      this.logger.info("Text-to-image generation completed successfully", {
        seed: data.seed,
        cost: data.cost,
        generated: !!data.url
      });
      return {
        success: true,
        code: 200,
        result: {
          seed: data.seed,
          cost: data.cost,
          url: data.url,
          message: "Image generated successfully!"
        }
      };
    } catch (err) {
      const errorCode = err.response?.status || err.code || 500;
      let errorMessage = "Failed to generate image. Please try again later.";
      let errorDetails = "An unexpected error occurred during image generation.";
      if (err.code === "ECONNABORTED") {
        errorMessage = "Request timeout. The image generation took too long.";
        errorDetails = "Please try again with a simpler prompt or reduce the number of steps.";
      } else if (err.response?.data) {
        errorMessage = err.response.data.error || "Image generation failed";
        errorDetails = err.response.data.details || "Please check your parameters.";
      }
      this.logger.error("Text-to-image generation failed", {
        code: errorCode,
        message: err.message,
        response: err.response?.data
      });
      return {
        success: false,
        code: errorCode,
        result: {
          error: errorMessage,
          details: errorDetails
        }
      };
    }
  }
  async img2img({
    prompt,
    imageUrl,
    ...rest
  }) {
    this.logger.info("Starting image-to-image transformation", {
      promptLength: prompt?.length || 0,
      imageUrl: imageUrl ? "Provided" : "Missing"
    });
    if (!imageUrl?.trim()) {
      const errorMsg = "Image URL is required for transformation.";
      this.logger.warn("Image-to-image transformation failed: missing image URL");
      return {
        success: false,
        code: 400,
        result: {
          error: errorMsg,
          details: "Please provide a valid image URL to transform."
        }
      };
    }
    if (!prompt?.trim()) {
      const errorMsg = "Prompt is required to guide the image transformation.";
      this.logger.warn("Image-to-image transformation failed: empty prompt");
      return {
        success: false,
        code: 400,
        result: {
          error: errorMsg,
          details: "Describe how you want the image to be transformed."
        }
      };
    }
    try {
      new URL(imageUrl);
    } catch (urlError) {
      const errorMsg = "Invalid image URL format.";
      this.logger.warn("Image-to-image transformation failed: invalid URL format", {
        imageUrl: imageUrl
      });
      return {
        success: false,
        code: 400,
        result: {
          error: errorMsg,
          details: "Please provide a valid HTTP/HTTPS URL for the image."
        }
      };
    }
    try {
      const payload = new URLSearchParams();
      payload.append("image_url", imageUrl);
      payload.append("prompt", prompt);
      Object.entries(rest).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          payload.append(key, value.toString());
        }
      });
      this.logger.debug("Sending image-to-image request payload", {
        endpoint: `${this.api.endpoint.transform}`,
        parameters: {
          ...Object.fromEntries(payload),
          imageUrl: "***"
        }
      });
      const response = await axios.post(`${this.api.base}${this.api.endpoint.transform}`, payload, {
        headers: this.headers,
        timeout: 3e4,
        validateStatus: status => status < 500
      });
      if (response.status >= 400) {
        const errorMsg = response.data?.error || "Image transformation failed due to server error";
        this.logger.error("Image-to-image API returned error status", {
          status: response.status,
          response: response.data
        });
        return {
          success: false,
          code: response.status,
          result: {
            error: errorMsg,
            details: response.data?.details || "Please check your image URL and parameters."
          }
        };
      }
      const data = response.data.image || response.data;
      this.logger.info("Image-to-image transformation completed successfully", {
        seed: data.seed,
        cost: data.cost,
        transformed: !!data.url
      });
      return {
        success: true,
        code: 200,
        result: {
          seed: data.seed,
          cost: data.cost,
          url: data.url,
          message: "Image transformed successfully!"
        }
      };
    } catch (err) {
      const errorCode = err.response?.status || err.code || 500;
      let errorMessage = "Failed to transform image. Please try again later.";
      let errorDetails = "An unexpected error occurred during image transformation.";
      if (err.code === "ECONNABORTED") {
        errorMessage = "Request timeout. The image transformation took too long.";
        errorDetails = "Please try again with a simpler transformation.";
      } else if (err.response?.data) {
        errorMessage = err.response.data.error || "Image transformation failed";
        errorDetails = err.response.data.details || "Please check your image URL and parameters.";
      }
      this.logger.error("Image-to-image transformation failed", {
        code: errorCode,
        message: err.message,
        response: err.response?.data
      });
      return {
        success: false,
        code: errorCode,
        result: {
          error: errorMessage,
          details: errorDetails
        }
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!action) {
    return res.status(400).json({
      error: "Action is required."
    });
  }
  const artly = new Artly();
  try {
    let response;
    switch (action) {
      case "img2img":
        if (!params.prompt || !params.imageUrl) {
          return res.status(400).json({
            error: "Prompt and imageUrl are required for img2img."
          });
        }
        response = await artly.img2img(params);
        return res.status(200).json(response);
      case "txt2img":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Prompt is required for txt2img."
          });
        }
        response = await artly.txt2img(params);
        return res.status(200).json(response);
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}. Supported actions are 'img2img', and 'txt2img'.`
        });
    }
  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}