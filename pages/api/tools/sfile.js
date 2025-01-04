import axios from "axios";
import * as cheerio from "cheerio";
import fetch from "node-fetch";
async function search_v2(query, page = 1) {
  try {
    const data = await fetch(`https://sfile.mobi/search.php?q=${query}&page=${page}`);
    const $ = cheerio.load(await data.text());
    const result = $(".list").map((index, element) => {
      const text = $(element).text();
      const name = $(element).find("a").text();
      const link = $(element).find("a").attr("href");
      const size = text.match(/\((.*?)\)/)?.[1] || "";
      return {
        name: name,
        link: link,
        size: size
      };
    }).get().filter(item => item.name);
    return {
      total: result.length,
      result: result
    };
  } catch (error) {
    throw error;
  }
}
async function dl_v2(id) {
  try {
    const {
      data
    } = await axios.get(`https://sfile-api.vercel.app/download/${id}`);
    const downloadUrl = data?.data?.url;
    const filename = downloadUrl ? downloadUrl.split("/").pop().split("&")[0] : "unknown";
    const {
      data: fileBuffer
    } = await axios.get(downloadUrl, {
      responseType: "arraybuffer",
      headers: {
        Referer: downloadUrl
      }
    });
    return {
      status: true,
      data: {
        date: data?.data?.date,
        total: data?.data?.downloaded,
        result: downloadUrl,
        filename: filename,
        buffer: fileBuffer.toString("base64")
      }
    };
  } catch (error) {
    throw error;
  }
}
async function dl_v1(url) {
  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36 Edg/117.0.2045.47",
    Referer: url,
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9"
  };
  try {
    const {
      data,
      headers: responseHeaders
    } = await axios.get(url, {
      headers: headers
    });
    const cookies = responseHeaders["set-cookie"]?.map(cookie => cookie.split(";")[0]).join("; ") || "";
    headers.Cookie = cookies;
    const filename = data.match(/<h1 class="intro">(.*?)<\/h1>/s)?.[1] || "unknown";
    const mimetype = data.match(/<div class="list">.*? - (.*?)<\/div>/)?.[1] || "";
    const downloadUrl = data.match(/<a class="w3-button w3-blue w3-round" id="download" href="([^"]+)"/)?.[1];
    headers.Referer = downloadUrl;
    if (!downloadUrl) return {
      status: false,
      message: "Download URL tidak ditemukan"
    };
    const {
      data: downloadPageData
    } = await axios.get(downloadUrl, {
      headers: headers
    });
    const finalDownloadUrl = downloadPageData.match(/<a class="w3-button w3-blue w3-round" id="download" href="([^"]+)"/)?.[1];
    const key = downloadPageData.match(/&k='\+(.*?)';/)?.[1].replace(`'`, "");
    const finalUrl = finalDownloadUrl + (key ? `&k=${key}` : "");
    const filesize = downloadPageData.match(/Download File \((.*?)\)/)?.[1];
    if (!finalUrl) return {
      status: false,
      message: "Download URL tidak ditemukan"
    };
    const {
      data: fileBuffer,
      headers: fileHeaders
    } = await axios.get(finalUrl, {
      responseType: "arraybuffer",
      headers: {
        ...headers,
        Referer: url
      }
    });
    const filenameFinal = fileHeaders["content-disposition"]?.match(/filename=["']?([^"';]+)["']?/)?.[1] || "unknown";
    return {
      status: true,
      data: {
        filename: filenameFinal,
        filesize: filesize,
        mimetype: mimetype || fileHeaders["content-type"],
        buffer: fileBuffer.toString("base64")
      }
    };
  } catch (err) {
    console.error("Error:", err);
    return {
      status: false,
      message: err.message || "Kesalahan tidak diketahui"
    };
  }
}
async function search_v1(id) {
  try {
    const {
      data
    } = await axios.get(`https://sfile-api.vercel.app/search/${id}`);
    return data?.data;
  } catch (error) {
    throw error;
  }
}
export default async function handler(req, res) {
  const {
    type,
    version = 1,
    query = "",
    page = 1,
    id = "",
    url = ""
  } = req.method === "GET" ? req.query : req.body;
  try {
    if (req.method === "GET") {
      let result;
      if (type === "dl" && version === "2") {
        if (!id) {
          return res.status(400).json({
            message: "Parameter 'id' wajib disertakan untuk pengunduhan.",
            example: "/api/sfile?type=dl&version=2&id=12345"
          });
        }
        result = await dl_v2(id);
      } else if (type === "search" && version === "2") {
        if (!query) {
          return res.status(400).json({
            message: "Parameter 'query' wajib disertakan untuk pencarian.",
            example: "/api/sfile?type=search&version=2&query=test&page=1"
          });
        }
        result = await search_v2(query, page);
      } else if (type === "dl" && version === "1") {
        if (!url) {
          return res.status(400).json({
            message: "Parameter 'url' wajib disertakan untuk pengunduhan.",
            example: "/api/sfile?type=dl&version=1&url=https://example.com"
          });
        }
        result = await dl_v1(url);
      } else if (type === "search" && version === "1") {
        if (!id) {
          return res.status(400).json({
            message: "Parameter 'id' wajib disertakan untuk pencarian.",
            example: "/api/sfile?type=search&version=1&id=12345"
          });
        }
        result = await search_v1(id);
      } else {
        return res.status(400).json({
          message: "Parameter 'type' atau 'version' tidak valid. Harap pilih salah satu: dl, search.",
          example: "/api/sfile?type=dl&version=2&id=12345"
        });
      }
      Promise.resolve(result).then(() => {
        console.log("Query processing complete!");
      }).catch(error => {
        console.error("Error processing query:", error);
      });
      return res.status(200).json(result);
    } else {
      return res.status(405).json({
        message: "Metode tidak diizinkan"
      });
    }
  } catch (error) {
    return res.status(400).json({
      message: error.message || "Terjadi kesalahan"
    });
  }
}