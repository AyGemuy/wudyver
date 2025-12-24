import * as cheerio from "cheerio";
import fetch from "node-fetch";
import {
  parseStringPromise
} from "xml2js";
export default async function handler(req, res) {
  const {
    lang = "id",
      hero,
      id
  } = req.method === "GET" ? req.query : req.body;
  if (!hero) return res.status(400).json({
    success: false,
    message: "Missing hero parameter"
  });
  try {
    const url = lang === "en" ? `https://mobilelegendsbuild.com/sitemap.xml` : `https://mobile-legends.fandom.com/wiki/${hero}/Audio/${lang}`;
    let response = await fetch(url);
    let data = await response.text();
    if (lang === "en") {
      const result = await parseStringPromise(data);
      const targetUrl = result.urlset.url.filter(url => url.loc[0].includes("sound/" + hero)).map(url => url.loc[0])[0];
      if (!targetUrl) return res.status(404).json({
        success: false,
        message: "No sounds found"
      });
      response = await fetch(targetUrl);
      data = await response.text();
    }
    const $ = cheerio.load(data);
    const sounds = $("audio").map((i, el) => $(el).attr("src")).get();
    const sound = id ? sounds[parseInt(id) - 1] : sounds[Math.floor(Math.random() * sounds.length)];
    return res.status(200).json({
      success: true,
      sound: sound
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
}