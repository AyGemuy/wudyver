import fetch from "node-fetch";
export default async function handler(req, res) {
  const {
    text,
    type = 1
  } = req.method === "GET" ? req.query : req.body;
  if (!text) {
    return res.status(400).json({
      error: "Paramenter 'text' is required."
    });
  }
  try {
    const response = type === "1" ? await CarbonifyV1(text) : await CarbonifyV2(text);
    res.setHeader("Content-Type", "application/octet-stream");
    res.send(response);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}
async function CarbonifyV1(input) {
  try {
    const response = await fetch("https://carbonara.solopov.dev/api/cook", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        code: input
      })
    });
    if (!response.ok) throw new Error("Failed to fetch from CarbonifyV1 API");
    const buffer = await response.arrayBuffer();
    return Buffer.from(buffer);
  } catch (error) {
    throw new Error(`CarbonifyV1 error: ${error.message}`);
  }
}
async function CarbonifyV2(input) {
  try {
    const response = await fetch("https://carbon-api.vercel.app/api", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        code: input
      })
    });
    if (!response.ok) throw new Error("Failed to fetch from CarbonifyV2 API");
    const buffer = await response.arrayBuffer();
    return Buffer.from(buffer);
  } catch (error) {
    throw new Error(`CarbonifyV2 error: ${error.message}`);
  }
}