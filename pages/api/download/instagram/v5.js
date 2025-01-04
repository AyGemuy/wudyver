import axios from "axios";
import crypto from "crypto";
import fakeUserAgent from "fake-useragent";
export default async function handler(req, res) {
  if (req.method !== "GET") return res.json({
    error: "Only GET"
  });
  try {
    const {
      url
    } = req.body;
    const result = await instavideosave(url);
    res.json(result);
  } catch (e) {
    res.json({
      error: e.toString()
    });
  }
}
async function instavideosave(url) {
  const encodeUrl = text => {
    const key = "qwertyuioplkjhgf";
    const cipher = crypto.createCipheriv("aes-128-ecb", key, null);
    return cipher.update(text, "utf8", "hex") + cipher.final("hex");
  };
  try {
    const {
      data
    } = await axios.get("https://backend.instavideosave.com/allinone", {
      headers: {
        Accept: "*/*",
        Origin: "https://instavideosave.net",
        Referer: "https://instavideosave.net/",
        "User-Agent": fakeUserAgent(),
        Url: encodeUrl(url)
      }
    });
    return data;
  } catch (e) {
    throw new Error("InstaVideoSave API error: " + e.message);
  }
}