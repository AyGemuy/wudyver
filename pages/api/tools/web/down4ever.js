import axios from "axios";
const BASE_URL = "https://downforeveryoneorjustme.com/api/httpcheck/";
const DEFAULT_HEADERS = {
  authority: "downforeveryoneorjustme.com",
  accept: "*/*",
  "user-agent": "WebsiteStatusChecker/1.0.0"
};
const checkWebsite = async websiteUrl => {
  const apiUrl = new URL(websiteUrl, BASE_URL);
  DEFAULT_HEADERS.referer = `https://downforeveryoneorjustme.com/${websiteUrl}`;
  try {
    const {
      data
    } = await axios.get(apiUrl.toString(), {
      headers: DEFAULT_HEADERS,
      maxRedirects: 5
    });
    const domainName = websiteUrl.replace(/^(https?:\/\/)?/, "");
    const {
      isDown,
      lastChecked
    } = data;
    let lastCheckedDate = new Date(lastChecked * 1e3);
    if (isNaN(lastCheckedDate.getTime())) lastCheckedDate = new Date();
    const statusMessage = isDown ? `Website ${domainName} tidak bisa diakses. Mungkin sedang mengalami masalah.` : `Website ${domainName} dapat diakses dengan baik.`;
    const lastCheckedFormatted = lastCheckedDate.toLocaleString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "numeric",
      minute: "numeric",
      hour12: false
    });
    const secondsAgo = Math.floor((Date.now() - lastCheckedDate.getTime()) / 1e3);
    const relativeTime = new Intl.RelativeTimeFormat("id", {
      numeric: "auto"
    }).format(-secondsAgo, "second");
    return {
      domain: domainName,
      status: statusMessage,
      lastChecked: `Terakhir dicek: ${lastCheckedFormatted} (${relativeTime})`
    };
  } catch (error) {
    throw new Error(`Gagal memeriksa status website: ${error.message}`);
  }
};
export default async function handler(req, res) {
  try {
    const {
      url: link
    } = req.method === "GET" ? req.query : req.body;
    if (!link) {
      return res.status(400).json({
        error: 'Paramenter "url" harus diisi untuk memeriksa status website.'
      });
    }
    const websiteStatus = await checkWebsite(link);
    return res.status(200).json({
      success: true,
      data: websiteStatus
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}