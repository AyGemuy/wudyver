import fetch from "node-fetch";
import crypto from "crypto";
const hexRandom = () => crypto.randomBytes(3).toString("hex");
const fetchImage = async (url, code) => {
  try {
    const response = await fetch(url);
    return {
      buffer: Buffer.from(await response.arrayBuffer()),
      code: code
    };
  } catch {
    return {
      buffer: null,
      code: null
    };
  }
};
const generate = async (code = hexRandom()) => {
  const url = `https://dummyimage.com/300.png/${hexRandom().slice(0, 3)}/${hexRandom().slice(0, 3)}&text=${encodeURIComponent(code)}`;
  return await fetchImage(url, code);
};
const generateV1 = async (code = hexRandom()) => {
  const url = `https://via.placeholder.com/300/${hexRandom().slice(0, 3)}/${hexRandom().slice(0, 3)}?text=${encodeURIComponent(code)}`;
  return await fetchImage(url, code);
};
const generateV2 = async (code = hexRandom()) => {
  const url = `https://fakeimg.pl/300x300/${hexRandom()}/${hexRandom()}/?text=${encodeURIComponent(code)}`;
  return await fetchImage(url, code);
};
const generateV3 = async (code = hexRandom()) => {
  const url = `https://api.sylvain.pro/en/captcha?text=${encodeURIComponent(code)}`;
  return await fetchImage(url, code);
};
const generateV4 = async (code = hexRandom()) => {
  const url = `https://api-gen.textstudio.com/?text=${encodeURIComponent(code)}`;
  return await fetchImage(url, code);
};
export default async function handler(req, res) {
  const {
    text,
    version
  } = req.method === "GET" ? req.query : req.body;
  if (!text) {
    return res.status(400).json({
      error: "text parameter is required"
    });
  }
  let imageResponse;
  switch (version) {
    case "1":
      imageResponse = await generateV1(text);
      break;
    case "2":
      imageResponse = await generateV2(text);
      break;
    case "3":
      imageResponse = await generateV3(text);
      break;
    case "4":
      imageResponse = await generateV4(text);
      break;
    default:
      imageResponse = await generate(text);
      break;
  }
  if (imageResponse.buffer) {
    res.setHeader("Content-Type", "image/png");
    return res.end(imageResponse.buffer);
  } else {
    res.status(500).json({
      error: "Failed to generate captcha"
    });
  }
}