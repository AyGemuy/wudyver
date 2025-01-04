import axios from "axios";
export default async function handler(req, res) {
  const {
    api = "api.paxsenix.biz.id",
      path = "/ai/gemini",
      method = "get", ...queryParams
  } = req.method === "GET" ? req.query : req.body;
  const allowedMethods = ["GET", "POST"];
  const requestMethod = method.toUpperCase();
  if (!allowedMethods.includes(requestMethod)) {
    return res.status(400).json({
      error: "Invalid HTTP method. Only GET and POST are allowed."
    });
  }
  if (!path || !requestMethod) {
    return res.status(400).json({
      error: "Missing required parameters: path or method."
    });
  }
  const options = {
    method: requestMethod,
    url: `https://${api}${path}`,
    headers: {
      "Content-Type": "application/json"
    },
    params: requestMethod === "GET" ? queryParams : undefined,
    data: requestMethod === "POST" ? queryParams : undefined
  };
  try {
    const apiRes = await axios(options);
    return res.json({
      result: apiRes.data
    });
  } catch (error) {
    const errorMessage = error.response?.data?.message || "Error while calling the external API.";
    return res.status(error.response?.status || 500).json({
      error: errorMessage
    });
  }
}