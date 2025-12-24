import canvafy from "canvafy";
import apiConfig from "@/configs/apiConfig";
class ImageFilter {
  constructor() {
    this.defaultConfig = {
      type: "affect",
      image: `https://${apiConfig.DOMAIN_URL}/assets/images/users/user-5.jpg`,
      image2: `https://${apiConfig.DOMAIN_URL}/assets/images/users/user-6.jpg`
    };
    this.validTypes = ["affect", "batslap", "beautiful", "darkness", "delete", "gay", "greyscale", "invert", "kiss"];
  }
  validateInputs({
    type,
    image,
    image2,
    intensity
  }) {
    if (!type || !this.validTypes.includes(type)) {
      throw new Error(`Invalid type specified. Must be one of: ${this.validTypes.join(", ")}`);
    }
    if (!image || typeof image !== "string") {
      throw new Error("Invalid or missing primary image URL");
    }
    if (["batslap", "kiss"].includes(type) && (!image2 || typeof image2 !== "string")) {
      throw new Error(`Invalid or missing secondary image URL for ${type}`);
    }
    if (type === "darkness") {
      const parsedIntensity = parseInt(intensity);
      if (isNaN(parsedIntensity) || parsedIntensity < 0 || parsedIntensity > 100) {
        throw new Error("Intensity for darkness must be a number between 0 and 100");
      }
      return parsedIntensity;
    }
    return true;
  }
  async applyFilter({
    type,
    image,
    image2,
    intensity
  }) {
    try {
      let filteredImage;
      switch (type) {
        case "affect":
          filteredImage = await canvafy.Image.affect(image);
          break;
        case "batslap":
          filteredImage = await canvafy.Image.batslap(image, image2);
          break;
        case "beautiful":
          filteredImage = await canvafy.Image.beautiful(image);
          break;
        case "darkness":
          filteredImage = await canvafy.Image.darkness(image, intensity);
          break;
        case "delete":
          filteredImage = await canvafy.Image.delete(image);
          break;
        case "gay":
          filteredImage = await canvafy.Image.gay(image);
          break;
        case "greyscale":
          filteredImage = await canvafy.Image.greyscale(image);
          break;
        case "invert":
          filteredImage = await canvafy.Image.invert(image);
          break;
        case "kiss":
          filteredImage = await canvafy.Image.kiss(image, image2);
          break;
        default:
          throw new Error("Unexpected filter type");
      }
      return filteredImage;
    } catch (error) {
      throw new Error(`Failed to apply filter: ${error.message}`);
    }
  }
}
export default async function handler(req, res) {
  const imageFilter = new ImageFilter();
  try {
    const params = req.method === "GET" ? req.query : req.body;
    const config = {
      ...imageFilter.defaultConfig,
      ...params
    };
    const intensity = imageFilter.validateInputs(config);
    const filteredImage = await imageFilter.applyFilter({
      ...config,
      intensity: config.type === "darkness" ? intensity : undefined
    });
    res.setHeader("Content-Type", "image/png");
    return res.status(200).send(filteredImage);
  } catch (error) {
    return res.status(400).json({
      error: error.message
    });
  }
}