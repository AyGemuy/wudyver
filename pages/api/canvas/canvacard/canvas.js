import {
  Canvas
} from "canvacard";
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      message: "Method Not Allowed"
    });
  }
  const {
    image = "https://png.pngtree.com/thumb_back/fw800/background/20230117/pngtree-girl-with-red-eyes-in-anime-style-backdrop-poster-head-photo-image_49274352.jpg",
      effect = "jail", ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!image || !effect) {
    return res.status(400).json({
      error: "Image and effect are required"
    });
  }
  try {
    let imageBuffer;
    switch (effect) {
      case "trigger":
        imageBuffer = await Canvas.trigger(image);
        break;
      case "invert":
        imageBuffer = await Canvas.invert(image);
        break;
      case "sepia":
        imageBuffer = await Canvas.sepia(image);
        break;
      case "greyscale":
        imageBuffer = await Canvas.greyscale(image);
        break;
      case "brightness":
        imageBuffer = await Canvas.brightness(image, params.amount ? parseInt(params.amount) : 0);
        break;
      case "darkness":
        imageBuffer = await Canvas.darkness(image, params.amount ? parseInt(params.amount) : 0);
        break;
      case "threshold":
        imageBuffer = await Canvas.threshold(image, params.amount ? parseInt(params.amount) : 0);
        break;
      case "convolute":
        imageBuffer = await Canvas.convolute(image, params.matrix ? JSON.parse(params.matrix) : [], params.opaque ? parseInt(params.opaque) : 1);
        break;
      case "pixelate":
        imageBuffer = await Canvas.pixelate(image, params.pixels ? parseInt(params.pixels) : 5);
        break;
      case "sharpen":
        imageBuffer = await Canvas.sharpen(image, params.lvl ? parseInt(params.lvl) : 1);
        break;
      case "burn":
        imageBuffer = await Canvas.burn(image, params.lvl ? parseInt(params.lvl) : 1);
        break;
      case "circle":
        imageBuffer = await Canvas.circle(image);
        break;
      case "fuse":
        imageBuffer = await Canvas.fuse(image, params.image2);
        break;
      case "resize":
        imageBuffer = await Canvas.resize(image, params.width ? parseInt(params.width) : 100, params.height ? parseInt(params.height) : 100);
        break;
      case "kiss":
        imageBuffer = await Canvas.kiss(image, params.image2);
        break;
      case "spank":
        imageBuffer = await Canvas.spank(image, params.image2);
        break;
      case "slap":
        imageBuffer = await Canvas.slap(image, params.image2);
        break;
      case "facepalm":
        imageBuffer = await Canvas.facepalm(image);
        break;
      case "colorfy":
        imageBuffer = await Canvas.colorfy(image, params.color);
        break;
      case "distracted":
        imageBuffer = await Canvas.distracted(image, params.image2, params.image3 || null);
        break;
      case "jail":
        imageBuffer = await Canvas.jail(image, params.greyscale !== undefined ? params.greyscale : false);
        break;
      case "bed":
        imageBuffer = await Canvas.bed(image, params.image2);
        break;
      case "delete":
        imageBuffer = await Canvas.delete(image, params.dark !== undefined ? params.dark : false);
        break;
      case "gradient":
        imageBuffer = await Canvas.gradient(params.colorFrom, params.colorTo, params.width ? parseInt(params.width) : 100, params.height ? parseInt(params.height) : 100);
        break;
      case "quote":
        imageBuffer = await Canvas.quote({
          text: params.text,
          author: params.author
        }, params.font || "Arial");
        break;
      case "phub":
        imageBuffer = await Canvas.phub({
          text: params.text
        }, params.font || "Arial");
        break;
      case "wanted":
        imageBuffer = await Canvas.wanted(image);
        break;
      case "wasted":
        imageBuffer = await Canvas.wasted(image);
        break;
      case "youtube":
        imageBuffer = await Canvas.youtube({
          username: params.username,
          content: params.content,
          avatar: params.avatar,
          dark: params.dark || false
        });
        break;
      case "reply":
        imageBuffer = await Canvas.reply({
          avatar1: params.avatar1,
          avatar2: params.avatar2,
          user1: params.user1,
          user2: params.user2,
          hex1: params.hex1,
          hex2: params.hex2,
          mainText: params.mainText,
          replyText: params.replyText
        });
        break;
      default:
        return res.status(400).json({
          error: "Invalid effect"
        });
    }
    res.setHeader("Content-Type", "image/png");
    return res.status(200).send(imageBuffer);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Error processing the image"
    });
  }
}