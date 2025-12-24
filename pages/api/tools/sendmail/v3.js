import axios from "axios";
class ContactMailSender {
  constructor(host, auth) {
    this.host = host;
    this.auth = auth;
  }
  async sendMail({
    from,
    name,
    message
  }) {
    try {
      if (!from || !name || !message) {
        throw new Error("Missing required fields: from, name, or message");
      }
      const url = `${this.host}/wp-json/tmy/v1/send_mail`;
      const params = new URLSearchParams({
        from: encodeURIComponent(from),
        name: encodeURIComponent(name),
        message: encodeURIComponent(message),
        auth: this.auth
      });
      const response = await axios.get(`${url}?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error("Error sending contact mail:", error.message);
      throw error.response?.data || error.message;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const {
    email,
    name,
    message
  } = params;
  if (!email || !name || !message) {
    return res.status(400).json({
      error: "Missing required fields: email, name, or message"
    });
  }
  const host = "https://wp.tmy.io";
  const auth = "G7v2E4k5pR3aM1iD9sT8hN6cK4xL0oP3bH5jC2yZ9q";
  const mailSender = new ContactMailSender(host, auth);
  try {
    const result = await mailSender.sendMail({
      from: email,
      name: name,
      message: message
    });
    return res.status(200).json({
      message: "Contact mail sent successfully",
      result: result
    });
  } catch (error) {
    console.error("API handler error:", error);
    res.status(500).json({
      error: "Failed to send contact mail",
      details: error
    });
  }
}