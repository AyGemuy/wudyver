import fetch from "node-fetch";
async function createPaste(input) {
  const response = await fetch("https://api.paste.gg/v1/pastes", {
    method: "POST",
    body: JSON.stringify({
      files: [{
        content: {
          format: "text",
          value: input
        }
      }]
    }),
    headers: {
      "Content-Type": "application/json"
    }
  });
  return await response.json();
}
export default async function handler(req, res) {
  const {
    input
  } = req.method === "POST" ? req.body : req.query;
  if (!input) {
    return res.status(400).json({
      status: 1,
      error: "Input is required"
    });
  }
  try {
    const data = await createPaste(input);
    if (data.result?.id) {
      return res.status(200).json({
        status: 0,
        url: `https://paste.gg/p/anonymous/${data.result.id}`
      });
    }
    return res.status(400).json({
      status: 1,
      error: "Failed to create paste"
    });
  } catch (error) {
    console.error("Error:", error.message);
    return res.status(500).json({
      status: 1,
      error: "Internal Server Error"
    });
  }
}