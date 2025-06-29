import axios from "axios";
import * as cheerio from "cheerio";
import {
  FormData
} from "formdata-node";
async function ytdl(query) {
  const form = new FormData();
  form.append("query", query);
  try {
    const response = await axios.post("https://yttomp4.pro/", form);
    const $ = cheerio.load(response.data);
    const results = {
      success: true,
      title: $(".vtitle").text().trim(),
      duration: $(".res_left p").text().replace("Duration: ", "").trim(),
      image: $(".ac img").attr("src"),
      video: [],
      audio: [],
      other: []
    };
    $(".tab-item-data").each((index, tab) => {
      const tabTitle = $(tab).attr("id");
      $(tab).find("tbody tr").each((i, element) => {
        const fileType = $(element).find("td").eq(0).text().trim();
        const fileSize = $(element).find("td").eq(1).text().trim();
        const downloadLink = $(element).find("a.dbtn").attr("href");
        if (tabTitle === "tab-item-1") {
          results.video.push({
            fileType: fileType,
            fileSize: fileSize,
            downloadLink: downloadLink
          });
        } else if (tabTitle === "tab-item-2") {
          results.audio.push({
            fileType: fileType,
            fileSize: fileSize,
            downloadLink: downloadLink
          });
        } else if (tabTitle === "tab-item-3") {
          results.other.push({
            fileType: fileType,
            fileSize: fileSize,
            downloadLink: downloadLink
          });
        }
      });
    });
    return results;
  } catch (error) {
    console.error("Error:", error);
    return {
      success: false,
      message: error.message
    };
  }
}
export default async function handler(req, res) {
  const {
    url
  } = req.method === "GET" ? req.query : req.body;
  if (!url) {
    return res.status(400).json({
      error: "url parameter is required"
    });
  }
  try {
    const data = await ytdl(url);
    return res.status(200).json({
      data: data
    });
  } catch (error) {
    res.status(500).json({
      error: "Internal Server Error",
      message: error.message
    });
  }
}