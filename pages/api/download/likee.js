import axios from "axios";
import * as cheerio from "cheerio";
import {
  FormData
} from "formdata-node";
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }
  const {
    url
  } = req.body;
  if (!url) {
    return res.status(400).json({
      error: "URL parameter is required"
    });
  }
  try {
    const form = new FormData();
    form.append("id", url);
    form.append("locale", "en");
    const response = await axios.post("https://likeedownloader.com/process", form, {
      headers: form.headers
    });
    const json = response.data;
    const urls = [];
    const $ = cheerio.load(json.template);
    $("a").each((_, e) => urls.push($(e).attr("href")));
    const result = {
      watermark: urls[0],
      "no watermark": urls[1]
    };
    res.status(200).json({
      creator: "Wudysoft",
      status: true,
      caption: $("p.infotext").text().replace(/\r?\n|\r/g, "").trim(),
      data: result
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({
      creator: "Wudysoft",
      status: false,
      error: "Failed to process the URL"
    });
  }
}