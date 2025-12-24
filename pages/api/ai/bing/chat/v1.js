import fetch from "node-fetch";
export default async function handler(req, res) {
  const {
    prompt
  } = req.method === "GET" ? req.query : req.body;
  if (!prompt) {
    return res.status(400).json({
      error: 'Paramenter "prompt" diperlukan.'
    });
  }
  try {
    const response = await fetch(`https://loco.web.id/wp-content/uploads/api/v1/bingai.php?q=${encodeURIComponent(prompt)}`);
    if (!response.ok) throw new Error(`Gagal fetch data: ${response.statusText}`);
    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}