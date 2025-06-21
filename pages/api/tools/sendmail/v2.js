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
  async sendEmail(to, subject, text) {
    try {
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
  const {
    to,
    subject,
    text
  } = req.method === "GET" ? req.query : req.body;
  if (!to || !subject || !text) {
    return res.status(400).json({
      error: "Missing required fields: to, subject, or text"
    });
  }
  const mailSender = new AnonymousMailSender("https://send-anonymous-mail.onrender.com");
  try {
    const result = await mailSender.sendEmail(to, subject, text);
    return res.status(200).json({
      message: "Email sent successfully",
      result: result
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to send email",
      details: error
    });
  }
}