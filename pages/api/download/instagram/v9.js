import axios from "axios";
const base = "https://gramsaver.com/api/";
const headers = {
  authority: "gramsaver.com",
  accept: "*/*",
  referer: "https://gramsaver.com/",
  "user-agent": "apitester.org Android/7.5(641)"
};
const extractId = url => {
  const regex = /(?:reel|p)\/(?<id>[A-Za-z0-9_-]+)\/?$/;
  const match = url.match(regex);
  return match?.groups?.id ?? null;
};
const fetchData = async id => {
  const url = new URL(id, base);
  try {
    const response = await axios.get(url.toString(), {
      headers: headers
    });
    return response.data;
  } catch (error) {
    if (error.response) {
      throw new Error(`Request failed with status: ${error.response.status}`);
    }
    throw new Error(`Network error: ${error.message}`);
  }
};
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }
  const {
    url,
    maxRetries = 3,
    delay = 1e3
  } = req.method === "GET" ? req.query : req.body;
  if (!url) {
    return res.status(400).json({
      error: "URL parameter is required"
    });
  }
  const id = extractId(url);
  if (!id) {
    return res.status(400).json({
      error: "Invalid Instagram URL"
    });
  }
  const retryFetch = async () => {
    let lastError;
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fetchData(id);
      } catch (error) {
        lastError = error;
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    throw lastError;
  };
  try {
    const data = await retryFetch();
    res.status(200).json({
      success: true,
      data: data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}