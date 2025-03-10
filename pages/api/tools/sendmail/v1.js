import fetch from "node-fetch";
export default async function handler(req, res) {
  const {
    to,
    from,
    subject,
    message
  } = req.method === "GET" ? req.query : req.body;
  if (!to || !from || !subject || !message) {
    return res.status(400).json({
      error: 'Parameter "to", "from", "subject", dan "message" wajib diisi.'
    });
  }
  try {
    const response = await fetch("https://api.proxynova.com/v1/send_email", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36",
        Referer: "https://www.proxynova.com/tools/send-anonymous-email/"
      },
      body: new URLSearchParams({
        to: to,
        from: from,
        subject: subject,
        message: message
      })
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || "Gagal mengirim email.");
    }
    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error("Error sending email:", error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}