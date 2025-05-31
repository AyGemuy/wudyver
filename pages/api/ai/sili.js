import axios from "axios";
const encodeKey = "c2stY3dheXdxbHlndG5hZm5oc2dmbmRpY3NxcnlhcmJjb2pzdmdmampzc3F0bWpzZHdl";
const decodeKey = encodedKey => Buffer.from(encodedKey, "base64").toString("utf-8");
export default async function handler(req, res) {
  const {
    prompt,
    model = "internlm/internlm2_5-7b-chat",
    system
  } = req.method === "GET" ? req.query : req.body;
  const url = "https://api.siliconflow.cn/v1/chat/completions";
  if (!prompt) {
    return res.status(400).json({
      error: "Prompt tidak diberikan"
    });
  }
  try {
    const messages = [{
      role: "user",
      content: prompt
    }, ...system ? [{
      role: "system",
      content: system
    }] : []];
    const requestData = {
      model: model,
      messages: messages
    };
    const {
      data
    } = await axios.post(url, requestData, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${decodeKey(encodeKey)}`
      }
    });
    return res.status(200).json({
      result: data
    });
  } catch (error) {
    res.status(500).json({
      error: error.response?.data || error.message
    });
  }
}