import axios from "axios";
class AnonymousMailSender {
  constructor(baseURL) {
    this.client = axios.create({
      baseURL: baseURL,
      headers: {
        Accept: "application/json, text/plain, */*",
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
        Referer: "https://send-anonymous-mail.vercel.app/"
      }
    });
  }
  async send({
    to,
    subject,
    text
  }) {
    try {
      if (!to || !subject || !text) {
        throw new Error("Missing required fields for sending: to, subject, or text");
      }
      const response = await this.client.post("/api/v1/send-email", {
        to: to,
        subject: subject,
        text: text
      });
      return response.data;
    } catch (error) {
      console.error("Error sending email:", error.message);
      throw error.response?.data || error.message;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const {
    to,
    subject,
    text
  } = params;
  if (!to || !subject || !text) {
    return res.status(400).json({
      error: "Missing required fields: to, subject, or text"
    });
  }
  const mailSender = new AnonymousMailSender("https://send-anonymous-mail.onrender.com");
  try {
    const result = await mailSender.send({
      to: to,
      subject: subject,
      text: text
    });
    return res.status(200).json({
      message: "Email sent successfully",
      result: result
    });
  } catch (error) {
    console.error("API handler error:", error);
    res.status(500).json({
      error: "Failed to send email",
      details: error
    });
  }
}