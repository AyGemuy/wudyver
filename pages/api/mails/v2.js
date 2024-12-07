import fetch from "node-fetch";

export default async function handler(req, res) {
  const { type, id } = req.query;

  try {
    if (type === "create") {
      const response = await fetch(
        "https://dropmail.me/api/graphql/web-test-wgq6m5i?query=mutation%20%7BintroduceSession%20%7Bid%2C%20expiresAt%2C%20addresses%20%7Baddress%7D%7D%7D"
      );
      if (!response.ok) {
        return res.status(response.status).json({
          success: false,
          message: `HTTP error! status: ${response.status}`,
        });
      }
      const data = await response.json();
      const result = [
        data.data.introduceSession.addresses[0].address,
        data.data.introduceSession.id,
        data.data.introduceSession.expiresAt,
      ];
      return res.status(200).json({ success: true, data: result });
    } else if (type === "get") {
      if (!id) {
        return res
          .status(400)
          .json({ success: false, message: "Missing id parameter" });
      }
      const link = `https://dropmail.me/api/graphql/web-test-wgq6m5i?query=query%20(%24id%3A%20ID!)%20%7Bsession(id%3A%24id)%20%7B%20addresses%20%7Baddress%7D%2C%20mails%7BrawSize%2C%20fromAddr%2C%20toAddr%2C%20downloadUrl%2C%20text%2C%20headerSubject%7D%7D%20%7D&variables=%7B%22id%22%3A%22${id}%22%7D`;
      const response = await fetch(link);
      if (!response.ok) {
        return res.status(response.status).json({
          success: false,
          message: `HTTP error! status: ${response.status}`,
        });
      }
      const inbox = (await response.json()).data.session.mails;
      const result = [inbox, inbox.length];
      return res.status(200).json({ success: true, data: result });
    } else {
      return res
        .status(400)
        .json({ success: false, message: "Invalid type parameter" });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}
