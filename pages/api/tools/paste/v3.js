import axios from "axios";
const API_URL = "https://pastebin.com/api/api_post.php";
const API_KEY = "_L_ZkBp7K3aZMY7z4ombPIztLxITOOpD";
async function createPaste({
  title = "",
  content
}) {
  const data = new URLSearchParams({
    api_dev_key: API_KEY,
    api_paste_name: title,
    api_paste_code: content,
    api_paste_format: "text",
    api_paste_expire_date: "N",
    api_option: "paste"
  });
  const {
    data: result
  } = await axios.post(API_URL, data, {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    }
  });
  const rawUrl = result.replace(/^(https:\/\/pastebin\.com\/)([a-zA-Z0-9]+)$/, "$1raw/$2");
  return {
    status: result ? 0 : 1,
    original: result,
    raw: rawUrl
  };
}
export default async function handler(req, res) {
  const {
    title,
    content
  } = req.method === "POST" ? req.body : req.query;
  if (!content) return res.status(400).json({
    error: "Content is required"
  });
  try {
    const result = await createPaste({
      title: title,
      content: content
    });
    return res.status(200).json(result);
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({
      error: "Failed to create paste"
    });
  }
}