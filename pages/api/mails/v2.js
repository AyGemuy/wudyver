import axios from "axios";
class Dropmail {
  constructor() {
    this.baseUrl = "https://dropmail.me/api/graphql/web-test-wgq6m5i";
  }
  async create() {
    try {
      const query = `mutation { introduceSession { id, expiresAt, addresses { address } } }`;
      const response = await axios.get(`${this.baseUrl}?query=${encodeURIComponent(query)}`);
      const data = response.data.data.introduceSession;
      return {
        success: true,
        message: "Temporary email created successfully.",
        email: data.addresses[0].address,
        sessionId: data.id,
        expiresAt: data.expiresAt
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to create temporary email.",
        error: error.response?.statusText || error.message
      };
    }
  }
  async getInbox({
    id,
    page = 1
  }) {
    if (!id) return {
      success: false,
      message: "Session ID is required."
    };
    try {
      const query = `query ($id: ID!) { session(id: $id) { mails { rawSize, fromAddr, toAddr, downloadUrl, text, headerSubject } } }`;
      const variables = JSON.stringify({
        id: id
      });
      const response = await axios.get(`${this.baseUrl}?query=${encodeURIComponent(query)}&variables=${encodeURIComponent(variables)}`);
      const mails = response.data.data.session.mails || [];
      const pageSize = 5;
      const startIndex = (page - 1) * pageSize;
      const paginatedMails = mails.slice(startIndex, startIndex + pageSize);
      return {
        success: true,
        message: paginatedMails.length > 0 ? "Emails retrieved successfully." : "No emails found.",
        totalEmails: mails.length,
        currentPage: page,
        emails: paginatedMails.map(email => ({
          subject: email.headerSubject || "No Subject",
          from: email.fromAddr,
          to: email.toAddr,
          text: email.text || "No Content",
          downloadUrl: email.downloadUrl
        }))
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to retrieve emails.",
        error: error.response?.statusText || error.message
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "POST" ? req.body : req.query;
  if (!action) return res.status(400).json({
    error: "Action is required. Available actions: create, message"
  });
  try {
    const dropmail = new Dropmail();
    let result;
    switch (action) {
      case "create":
        result = await dropmail.create();
        break;
      case "message":
        if (!params.id) {
          return res.status(400).json({
            error: "Missing 'id' parameter. Example: { id: 'xxxx' }"
          });
        }
        result = await dropmail.getInbox(params);
        break;
      default:
        return res.status(400).json({
          error: "Action is required. Available actions: create, message"
        });
    }
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
      error: error.message
    });
  }
}