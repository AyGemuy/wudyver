import axios from "axios";
const apiDomains = {
  1: "api.myquran.com/v2"
};
export default async function handler(req, res) {
  const {
    api = 1,
      path = "/sholat",
      method = "get", ...queryParams
  } = req.method === "GET" ? req.query : req.body;
  const isCustomDomain = typeof api === "string" && api.includes(".");
  const apiUrl = isCustomDomain ? api : apiDomains[parseInt(api, 10)];
  if (!apiUrl) return res.status(400).json({
    error: `Invalid API. Use an index between 1-${Object.keys(apiDomains).length} or provide a valid custom domain.`
  });
  try {
    const options = {
      method: method.toUpperCase(),
      url: `https://${apiUrl}${path}`,
      ...method.toUpperCase() === "GET" ? {
        params: queryParams
      } : {
        data: queryParams
      }
    };
    const apiRes = await axios(options);
    return res.json({
      result: apiRes.data
    });
  } catch (error) {
    return res.status(error.response?.status || 500).json({
      error: error.response?.data?.message || "Error while calling the external API."
    });
  }
}