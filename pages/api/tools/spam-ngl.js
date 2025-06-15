import crypto from "crypto";
import fetch from "node-fetch";
export default async function handler(req, res) {
  const {
    name: username,
    message,
    count = 500
  } = req.method === "GET" ? req.query : req.body;
  if (!username || !message) {
    return res.status(400).json({
      error: "❌ Pastikan username dan pesan disertakan!"
    });
  }
  let jumlah = parseInt(count, 10);
  if (isNaN(jumlah) || jumlah <= 0) {
    return res.status(400).json({
      error: "❌ Jumlah spam tidak valid!"
    });
  }
  let counter = 0;
  const sendMessage = async (username, message) => {
    while (counter < jumlah) {
      try {
        const date = new Date();
        const minutes = date.getMinutes().toString().padStart(2, "0");
        const hours = date.getHours().toString().padStart(2, "0");
        const formattedDate = `${hours}:${minutes}`;
        const deviceId = crypto.randomBytes(21).toString("hex");
        const url = "https://ngl.link/api/submit";
        const headers = {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/109.0",
          Accept: "*/*",
          "Accept-Language": "en-US,en;q=0.5",
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          "X-Requested-With": "XMLHttpRequest",
          "Sec-Fetch-Dest": "empty",
          "Sec-Fetch-Mode": "cors",
          "Sec-Fetch-Site": "same-origin",
          Referer: `https://ngl.link/${username}`,
          Origin: "https://ngl.link"
        };
        const body = `username=${username}&question=${message}&deviceId=${deviceId}&gameSlug=&referrer=`;
        const response = await fetch(url, {
          method: "POST",
          headers: headers,
          body: body,
          mode: "cors",
          credentials: "include"
        });
        if (response.status !== 200) {
          console.log(`[${formattedDate}] [Err] Ratelimited`);
          await new Promise(resolve => setTimeout(resolve, 25e3));
        } else {
          counter++;
          console.log(`[${formattedDate}] [Msg] Sent: ${counter}`);
        }
      } catch (error) {
        console.error(`[Err] ${error.message}`);
        await new Promise(resolve => setTimeout(resolve, 5e3));
      }
    }
    return counter;
  };
  try {
    const totalSent = await sendMessage(username, message);
    return res.status(200).json({
      success: true,
      message: `✅ Pesan telah berhasil dikirim sebanyak ${totalSent} kali ke username *${username}*`
    });
  } catch (error) {
    console.error(`[Err] ${error.message}`);
    return res.status(500).json({
      error: "Terjadi kesalahan saat mengirim pesan."
    });
  }
}