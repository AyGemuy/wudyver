// pages/api/createPaste.js

import axios from 'axios';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { title = '', content } = req.body;

    const data = new URLSearchParams({
      api_dev_key: "_L_ZkBp7K3aZMY7z4ombPIztLxITOOpD",
      api_paste_name: title,
      api_paste_code: content,
      api_paste_format: "text",
      api_paste_expire_date: "N",
      api_option: "paste",
    });

    try {
      const result = (
        await axios.post("https://pastebin.com/api/api_post.php", data, {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        })
      ).data;

      const rawUrl = result.replace(
        /^(https:\/\/pastebin\.com\/)([a-zA-Z0-9]+)$/,
        "$1raw/$2"
      );

      return res.status(200).json({
        status: result ? 0 : 1,
        original: result || null,
        raw: rawUrl || null,
      });
    } catch (error) {
      console.error("Error:", error);
      return res.status(500).json({ error: 'Failed to create paste' });
    }
  } else {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
}
