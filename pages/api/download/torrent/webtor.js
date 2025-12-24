import axios from "axios";
import * as cheerio from "cheerio";

function hasher(magnet) {
  const hashMatch1 = magnet.match(/urn:btih:(.*?)&/);
  const hashMatch2 = magnet.match(/urn:btih:([0-9a-fA-F]+)/);
  if (hashMatch1 && hashMatch1[1] && hashMatch1[1].length === 40) {
    return hashMatch1[1].toLowerCase();
  }
  if (hashMatch2 && hashMatch2[1] && hashMatch2[1].length === 40) {
    return hashMatch2[1].toLowerCase();
  }
  return null;
}
async function getWebtorCredentials() {
  try {
    const response = await axios.get("https://webtor.io");
    const src = response.data;
    const tokenMatch = src.match(/window\.__TOKEN__ = '(.*?)';/);
    const configMatch = src.match(/window\.__CONFIG__ = '(.*?)';/);
    if (!tokenMatch || !tokenMatch[1] || !configMatch || !configMatch[1]) {
      console.error("Gagal mengekstrak token atau config dari webtor.io");
      return {};
    }
    const token = tokenMatch[1];
    const configEncoded = configMatch[1];
    const decodedConfig = Buffer.from(configEncoded, "base64").toString("utf8");
    const configData = JSON.parse(decodedConfig);
    return {
      token: token,
      api: configData.sdk.apiUrl,
      apikey: configData.sdk.apiKey,
      mainHost: "webtor.io"
    };
  } catch (error) {
    console.error("Error fetching webtor.io info:", error.message);
    return {};
  }
}
async function registerTorrent(hash, host, token, apikey) {
  const urlPull = `https://${host}/store/TorrentStore/Pull`;
  const urlTouch = `https://${host}/store/TorrentStore/Touch`;
  const headers = {
    "api-key": apikey,
    "Content-Type": "application/grpc-web+proto",
    token: token,
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
  };
  try {
    const responsePull = await axios.post(urlPull, hash, {
      headers: headers
    });
    if (responsePull.status === 200) {
      const responseTouch = await axios.post(urlTouch, hash, {
        headers: headers
      });
      return responseTouch.status === 200;
    }
  } catch (error) {
    console.warn("Error in turrentstore:", error.message);
    return false;
  }
  return false;
}
async function getStreamLinks(mainHost, apiUrl, hash, token, apikey) {
  const listTorrents = [];
  try {
    const subdomainsResponse = await axios.get(`<span class="math-inline">\{apiUrl\}/subdomains\.json?infohash\=</span>{hash}&use-bandwidth=false&use-cpu=true&skip-active-job-search=false&pool=seeder&token=<span class="math-inline">\{token\}&api\-key\=</span>{apikey}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
      }
    });
    for (const subdomain of subdomainsResponse.data) {
      const embedUrl = `https://<span class="math-inline">\{subdomain\}\.</span>{mainHost}/<span class="math-inline">\{hash\}/?token\=</span>{token}&api-key=${apikey}`;
      try {
        const embedResponse = await axios.get(embedUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
          }
        });
        if (embedResponse.status === 200) {
          const $ = cheerio.load(embedResponse.data);
          let foundLinks = false;
          $("a").each((i, element) => {
            const href = $(element).attr("href");
            if (href && (href.includes(".mp4") || href.includes(".mkv") || href.includes(".avi") || href.includes(".webm"))) {
              const name = decodeURIComponent(href.split("?")[0].split("/").pop());
              const stream = `https://<span class="math-inline">\{subdomain\}\.</span>{mainHost}/<span class="math-inline">\{hash\}/</span>{href}`;
              if (!name.toLowerCase().includes("1xbet") && !name.toLowerCase().includes("sample")) {
                listTorrents.push({
                  name: name,
                  stream: stream
                });
                foundLinks = true;
              }
            }
          });
          if (foundLinks) break;
        }
      } catch (errorEmbed) {
        console.warn(`Error fetching embed URL ${embedUrl}:`, errorEmbed.message);
      }
    }
    return listTorrents.length > 0 ? listTorrents : null;
  } catch (error) {
    console.error("Error fetching stream links:", error.message);
    if (error.response) {
      console.error("Response data:", error.response.data);
      console.error("Response status:", error.response.status);
    }
    return null;
  }
}
export default async function handler(req, res) {
  const {
    magnet
  } = req.method === "GET" ? req.query : req.body;
  if (!magnet || typeof magnet !== "string") {
    return res.status(400).json({
      error: 'Paramenter "magnet" diperlukan dan harus berupa string.'
    });
  }
  try {
    const hash = hasher(magnet);
    if (!hash) {
      return res.status(400).json({
        error: "Magnet link tidak valid atau tidak dapat mengekstrak hash."
      });
    }
    const creds = await getWebtorCredentials();
    if (!creds || !creds.token || !creds.api || !creds.apikey || !creds.mainHost) {
      return res.status(503).json({
        error: "Gagal mendapatkan kredensial dari webtor.io."
      });
    }
    const {
      token,
      api,
      apikey,
      mainHost
    } = creds;
    await registerTorrent(hash, mainHost, token, apikey);
    const streamLinks = await getStreamLinks(mainHost, api, hash, token, apikey);
    if (streamLinks && streamLinks.length > 0) {
      return res.status(200).json({
        success: true,
        magnet_link: magnet,
        infohash: hash,
        files: streamLinks
      });
    } else {
      return res.status(404).json({
        success: false,
        error: "Tidak ada file stream yang ditemukan untuk magnet link ini.",
        magnet_link: magnet,
        infohash: hash
      });
    }
  } catch (error) {
    console.error("Internal Server Error in API handler:", error);
    return res.status(500).json({
      success: false,
      error: "Terjadi kesalahan internal pada server.",
      details: error.message
    });
  }
}