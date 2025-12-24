import canvafy from "canvafy";
import apiConfig from "@/configs/apiConfig";
class SpotifyImageGenerator {
  constructor() {
    this.defaultConfig = {
      author: "wudy",
      album: "wudy",
      timestamp: "608000",
      image: `https://${apiConfig.DOMAIN_URL}/assets/images/users/user-6.jpg`,
      title: "wudy",
      blur: 5,
      overlayOpacity: .7
    };
  }
  validateInputs({
    author,
    album,
    timestamp,
    image,
    title,
    blur,
    overlayOpacity
  }) {
    if (!author || typeof author !== "string" || author.length > 100) {
      throw new Error("Invalid or missing author. Must be a string with max 100 characters");
    }
    if (!album || typeof album !== "string" || album.length > 100) {
      throw new Error("Invalid or missing album. Must be a string with max 100 characters");
    }
    if (!timestamp || typeof timestamp !== "string") {
      throw new Error("Invalid or missing timestamp. Must be a string of comma-separated numbers");
    }
    const timestampValues = timestamp.split(",").map(Number);
    if (timestampValues.length !== 2 || timestampValues.some(isNaN) || timestampValues.some(val => val < 0)) {
      throw new Error("Timestamp must be two comma-separated non-negative numbers (start, end)");
    }
    if (timestampValues[0] > timestampValues[1]) {
      throw new Error("Timestamp start must be less than or equal to end");
    }
    if (!image || typeof image !== "string") {
      throw new Error("Invalid or missing image URL");
    }
    if (!title || typeof title !== "string" || title.length > 100) {
      throw new Error("Invalid or missing title. Must be a string with max 100 characters");
    }
    const parsedBlur = Number(blur);
    if (isNaN(parsedBlur) || parsedBlur < 0 || parsedBlur > 10) {
      throw new Error("Blur must be a number between 0 and 10");
    }
    const opacity = Number(overlayOpacity);
    if (isNaN(opacity) || opacity < 0 || opacity > 1) {
      throw new Error("Overlay opacity must be a number between 0 and 1");
    }
    return {
      author: author,
      album: album,
      timestamp: timestampValues,
      image: image,
      title: title,
      blur: parsedBlur,
      overlayOpacity: opacity
    };
  }
  async generateSpotifyImage({
    author,
    album,
    timestamp,
    image,
    title,
    blur,
    overlayOpacity
  }) {
    try {
      const spotifyImage = await new canvafy.Spotify().setAuthor(author).setAlbum(album).setTimestamp(...timestamp).setImage(image).setTitle(title).setBlur(blur).setOverlayOpacity(overlayOpacity).build();
      return spotifyImage;
    } catch (error) {
      throw new Error(`Failed to generate Spotify image: ${error.message}`);
    }
  }
}
export default async function handler(req, res) {
  const spotifyGenerator = new SpotifyImageGenerator();
  try {
    const params = req.method === "GET" ? req.query : req.body;
    const config = {
      ...spotifyGenerator.defaultConfig,
      ...params
    };
    const validatedConfig = spotifyGenerator.validateInputs(config);
    const spotifyImage = await spotifyGenerator.generateSpotifyImage(validatedConfig);
    res.setHeader("Content-Type", "image/png");
    return res.status(200).send(spotifyImage);
  } catch (error) {
    return res.status(400).json({
      error: error.message
    });
  }
}