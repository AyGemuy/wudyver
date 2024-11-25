import { Canvas } from "canvacard";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const { image = 'https://i.pinimg.com/564x/3d/45/32/3d453283cac1c901dc1cbe6e5fc7171b.jpg', effect = 'trigger', ...params } = req.query;

  if (!image || !effect) {
    return res.status(400).json({ error: "Image and effect are required" });
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
        imageBuffer = await Canvas.brightness(image, parseInt(params.amount || 0));
        break;
      case "darkness":
        imageBuffer = await Canvas.darkness(image, parseInt(params.amount || 0));
        break;
      case "threshold":
        imageBuffer = await Canvas.threshold(image, parseInt(params.amount || 0));
        break;
      case "convolute":
        imageBuffer = await Canvas.convolute(image, JSON.parse(params.matrix || "[]"), parseInt(params.opaque || 1));
        break;
      case "pixelate":
        imageBuffer = await Canvas.pixelate(image, parseInt(params.pixels || 10));
        break;
      case "sharpen":
        imageBuffer = await Canvas.sharpen(image, parseInt(params.lvl || 1));
        break;
      case "burn":
        imageBuffer = await Canvas.burn(image, parseInt(params.lvl || 1));
        break;
      case "circle":
        imageBuffer = await Canvas.circle(image);
        break;
      case "fuse":
        imageBuffer = await Canvas.fuse(image, params.image2);
        break;
      case "resize":
        imageBuffer = await Canvas.resize(image, parseInt(params.width || 100), parseInt(params.height || 100));
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
        imageBuffer = await Canvas.distracted(image, params.image2, params.image3);
        break;
      case "jail":
        imageBuffer = await Canvas.jail(image, params.greyscale);
        break;
      case "bed":
        imageBuffer = await Canvas.bed(image, params.image2);
        break;
      case "delete":
        imageBuffer = await Canvas.delete(image, params.dark);
        break;
      case "gradient":
        imageBuffer = await Canvas.gradient(params.colorFrom, params.colorTo, parseInt(params.width || 100), parseInt(params.height || 100));
        break;
      case "quote":
        imageBuffer = await Canvas.quote({ text: params.text, author: params.author }, params.font);
        break;
      case "phub":
        imageBuffer = await Canvas.phub({ text: params.text }, params.font);
        break;
      case "wanted":
        imageBuffer = await Canvas.wanted(image);
        break;
      case "wasted":
        imageBuffer = await Canvas.wasted(image);
        break;
      case "youtube":
        imageBuffer = await Canvas.youtube({ text: params.text });
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
        return res.status(400).json({ error: "Invalid effect" });
    }

    res.setHeader("Content-Type", "image/png");
    return res.status(200).send(imageBuffer);

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Error processing the image" });
  }
};
