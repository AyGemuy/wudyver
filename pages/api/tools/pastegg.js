// pages/api/pasteGG.js
import fetch from "node-fetch";
export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { input } = req.body;

    try {
      const response = await fetch("https://api.paste.gg/v1/pastes", {
        method: "POST",
        body: JSON.stringify({
          files: [
            {
              content: {
                format: "text",
                value: input,
              },
            },
          ],
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (data.result?.id) {
        return res.status(200).json({
          status: 0,
          url: `https://paste.gg/p/anonymous/${data.result.id}`,
        });
      } else {
        return res.status(400).json({
          status: 1,
          error: "Failed to create paste",
        });
      }
    } catch (error) {
      console.error("Error:", error.message);
      return res.status(500).json({ status: 1, error: "Internal Server Error" });
    }
  } else {
    return res.status(405).json({ status: 1, error: "Method Not Allowed" });
  }
}
