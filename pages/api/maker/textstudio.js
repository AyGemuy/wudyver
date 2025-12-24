import fetch from "node-fetch";
import * as cheerio from "cheerio";
class TextStudio {
  constructor() {
    this.baseURL = "https://www.textstudio.com";
  }
  async search(query) {
    const url = `${this.baseURL}/search?q=${query}`;
    try {
      const body = await (await fetch(url)).text();
      const $ = cheerio.load(body);
      return $(".search-list a.item").map((i, elem) => ({
        title: $(elem).find(".title").text() || "No Title",
        link: `${this.baseURL}${$(elem).attr("href")}` || "No Link",
        img: $(elem).find("img").attr("src") || "No Image"
      })).get();
    } catch (error) {
      console.error("Error:", error);
      return [];
    }
  }
  async getPreset(pageUrl) {
    try {
      const body = await (await fetch(pageUrl)).text();
      const $ = cheerio.load(body);
      const presetUrl = $("#tt").data("preset-url");
      return {
        presetUrl: presetUrl
      } || {};
    } catch (error) {
      console.error("Error fetching preset:", error);
      return {};
    }
  }
  async generate(presetUrl, userText) {
    try {
      const presetData = await (await fetch(presetUrl)).json();
      presetData.text = userText;
      const postResponse = await fetch("https://api-gen.textstudio.com", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(presetData)
      });
      if (!postResponse.ok) {
        throw new Error("Failed to send data");
      }
      const buffer = await postResponse.arrayBuffer();
      return Buffer.from(buffer);
    } catch (error) {
      console.error("Error generating data:", error);
      return null;
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    query = "",
    url = "",
    text = ""
  } = req.method === "GET" ? req.query : req.body;
  const textStudio = new TextStudio();
  if (action === "search" && query) {
    try {
      const results = await textStudio.search(query);
      return res.status(200).json({
        result: results
      });
    } catch (error) {
      return res.status(500).json({
        result: "Error during search"
      });
    }
  }
  if (action === "preset" && url) {
    try {
      const presetData = await textStudio.getPreset(url);
      return res.status(200).json({
        result: presetData
      });
    } catch (error) {
      return res.status(500).json({
        result: "Error fetching preset data"
      });
    }
  }
  if (action === "create" && text && url) {
    try {
      const presetData = await textStudio.getPreset(url);
      const generatedBuffer = await textStudio.generate(presetData.presetUrl, text);
      if (generatedBuffer) {
        res.setHeader("Content-Type", "image/png");
        return res.status(200).send(generatedBuffer);
      } else {
        return res.status(500).json({
          result: "Failed to generate result"
        });
      }
    } catch (error) {
      return res.status(500).json({
        result: "Error generating result"
      });
    }
  }
  return res.status(400).json({
    result: "Invalid action or missing parameters"
  });
}