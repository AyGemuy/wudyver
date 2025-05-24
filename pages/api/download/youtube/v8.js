import fetch from "node-fetch";
const getId = url => url.match(/(?:https?:\/\/)?(?:www\.|m\.)?youtu(?:be)?\.(?:com|be)(?:\/watch\/?\?v=|\/embed\/|\/)([^\s&\?\/\#]+)/)[1];
const Ace = async url => {
  try {
    const id = getId(url);
    if (!id) throw new Error("Invalid YouTube URL");
    const apiUrl = `https://wudysoft-down.hf.space/ace?id=${id}`;
    const response = await fetch(apiUrl);
    if (!response.ok) throw new Error("AceThinker API request failed");
    return await response.json();
  } catch (error) {
    throw new Error(`AceThinker Fetch Error: ${error.message}`);
  }
};
export default async function handler(req, res) {
  const {
    url
  } = req.method === "GET" ? req.query : req.body;
  if (!url) {
    return res.status(400).json({
      error: "Invalid YouTube URL"
    });
  }
  try {
    const result = await Ace(url);
    return res.status(200).json({
      result: result
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}