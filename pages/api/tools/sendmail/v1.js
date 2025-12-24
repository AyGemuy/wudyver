import fetch from "node-fetch";
class EmailSender {
  constructor() {
    this.apiUrl = "https://api.proxynova.com/v1/send_email";
    this.headers = {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36",
      Referer: "https://www.proxynova.com/tools/send-anonymous-email/"
    };
  }
  async send({
    to,
    from,
    subject,
    message
  }) {
    try {
      if (!to || !from || !subject || !message) {
        throw new Error('Paramenter "to", "from", "subject", dan "message" wajib diisi.');
      }
      const body = new URLSearchParams({
        to: to,
        from: from,
        subject: subject,
        message: message
      });
      const response = await fetch(this.apiUrl, {
        method: "POST",
        headers: this.headers,
        body: body
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Gagal mengirim email.");
      }
      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error("Error sending email:", error);
      throw new Error(error.message || "Terjadi kesalahan yang tidak terduga saat mengirim email.");
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const {
    to,
    from,
    subject,
    message
  } = params;
  if (!to || !subject || !message) {
    return res.status(400).json({
      error: "Missing required fields: to, subject, or message"
    });
  }
  const emailSender = new EmailSender();
  try {
    const result = await emailSender.send({
      to: to,
      from: from,
      subject: subject,
      message: message
    });
    return res.status(200).json(result);
  } catch (error) {
    const statusCode = error.message.includes("wajib diisi") ? 400 : 500;
    return res.status(statusCode).json({
      success: false,
      error: error.message
    });
  }
}