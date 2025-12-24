import axios from "axios";
const deviceIDs = () => {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === "x" ? r : r & 3 | 8).toString(16);
  });
};
const typeMsg = {
  anonymous: "",
  confessions: "confess",
  "3words": "3words",
  neverhave: "neverhave",
  tbh: "tbh",
  shipme: "shipme",
  yourcrush: "yourcrush",
  cancelled: "cancelled",
  dealbreaker: "dealbreaker"
};
const ngl = {
  send: async (link, message, type = "anonymous") => {
    const username = link.split("/").pop();
    let referrer, gameSlug;
    if (type === "anonymous") {
      referrer = `https://ngl.link/${username}`;
      gameSlug = "";
    } else if (type === "confessions" || type === "3words") {
      referrer = `https://${type}.ngl.link/${username}`;
      gameSlug = type;
    } else {
      gameSlug = typeMsg[type] || "";
      referrer = `https://ngl.link/${username}/${gameSlug}`;
    }
    const deviceId = deviceIDs();
    const data = {
      username: username,
      question: message,
      deviceId: deviceId,
      gameSlug: gameSlug,
      referrer: referrer
    };
    const url = "https://ngl.link/api/submit";
    try {
      const response = await axios.post(url, data, {
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Postify/1.0.0"
        }
      });
      return response.status === 200;
    } catch (error) {
      console.error(`❌ Error:`, error.message);
      return false;
    }
  }
};
export default async function handler(req, res) {
  const {
    link,
    message,
    type = "anonymous"
  } = req.method === "GET" ? req.query : req.body;
  if (!link || !message) {
    return res.status(400).json({
      error: "Link and message are required"
    });
  }
  try {
    const success = await ngl.send(link, message, type);
    if (success) {
      return res.status(200).json({
        message: `Pesan (${type}) berhasil dikirim!`
      });
    } else {
      return res.status(500).json({
        error: `Pesan (${type}) gagal dikirim`
      });
    }
  } catch (error) {
    return res.status(500).json({
      error: "Terjadi kesalahan saat mengirim pesan",
      details: error.message
    });
  }
}