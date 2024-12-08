import fetch from "node-fetch";

export default async function handler(req, res) {
  const { type, id, domain } = req.query;

  try {
    if (type === "create") {
      const response = await fetch(
        "https://www.1secmail.com/api/v1/?action=genRandomMailbox&count=1"
      );
      if (!response.ok) {
        return res.status(response.status).json({
          success: false,
          message: `HTTP error! status: ${response.status}`,
        });
      }
      const data = await response.json();
      return res.status(200).json({ success: true, data });
    } else if (type === "get") {
      if (!id || !domain) {
        return res
          .status(400)
          .json({ success: false, message: "Missing id or domain" });
      }
      const link = `https://www.1secmail.com/api/v1/?action=getMessages&login=${id}&domain=${domain}`;
      const response = await fetch(link);
      if (!response.ok) {
        return res.status(response.status).json({
          success: false,
          message: `HTTP error! status: ${response.status}`,
        });
      }
      const data = await response.json();
      return res.status(200).json({ success: true, data });
    } else {
      return res
        .status(400)
        .json({ success: false, message: "Invalid type parameter" });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}
