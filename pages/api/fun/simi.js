import fetch from "node-fetch";
// pages/api/chatbot.js
export default async function handler(req, res) {
  const { query } = req;
  const { text } = query;

  if (!text) {
    return res.status(400).json({ error: 'Parameter "text" diperlukan' });
  }

  const urls = [
    `https://api.simsimi.net/v2/?text=${encodeURIComponent(text)}&lc=id`,
    `http://api.brainshop.ai/get?bid=153868&key=rcKonOgrUFmn5usX&uid=1&msg=${encodeURIComponent(text)}`,
  ];

  let responseData = null;

  for (const url of urls) {
    try {
      const api = await fetch(url);
      const response = await api.json();

      // Prioritaskan Simsimi jika valid
      if (url.includes("simsimi") && response.success) {
        responseData = response.success;
        break; // keluar dari loop jika sudah mendapatkan data dari Simsimi
      }
      
      // Jika tidak ada hasil valid dari Simsimi, fallback ke Brainshop
      if (url.includes("brainshop") && response.cnt) {
        responseData = response.cnt;
        break; // keluar dari loop setelah mendapatkan data valid
      }
    } catch (error) {
      console.error("Error fetching from API:", error);
    }
  }

  if (responseData) {
    return res.status(200).json({ response: responseData });
  } else {
    return res.status(500).json({ error: "Tidak ada respons yang valid dari API" });
  }
}
