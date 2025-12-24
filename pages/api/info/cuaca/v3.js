import axios from "axios";
import * as cheerio from "cheerio";
const lang = {
  en: "weather+in+{query}",
  id: "cuaca+di+{query}"
};
const proxyUrls = ["https://files.xianqiao.wang/"];
const google = {
  weather: async (query, language = "id", tempUnit = "C") => {
    const url = `https://www.google.com/search?hl=${language}&lr=lang_en&q=${lang[language].replace("{query}", query.replace(" ", "+"))}`;
    const headers = {
      "User-Agent": "Mozilla/5.0"
    };
    try {
      const {
        data
      } = await axios.get(proxyUrls + url, {
        headers: headers
      });
      const $ = cheerio.load(data);
      const [temperature, humidity, wind, condition, location] = [$("#wob_tm").text(), $("#wob_hm").text(), $("#wob_ws").text(), $("#wob_dc").text(), $("span.BBwThe, div.wob_loc, #wob_loc").first().text()];
      if (!temperature || !humidity || !wind || !condition || !location) {
        throw new Error(`Missing data: ${[ "temperature", "humidity", "wind", "condition", "location" ].filter(f => !eval(f)).join(", ")}`);
      }
      const tempUnitSpan = $('div.vk_bk.wob-unit span[aria-disabled="true"]').text();
      let tempValue = parseFloat(temperature);
      const sourceUnit = tempUnitSpan.replace("°", "").toUpperCase();
      if (sourceUnit === "F") tempValue = (tempValue - 32) * 5 / 9;
      if (sourceUnit === "K") tempValue = tempValue - 273.15;
      if (tempUnit === "F") tempValue = (tempValue * 9 / 5 + 32).toFixed(1);
      if (tempUnit === "K") tempValue = (tempValue + 273.15).toFixed(1);
      return {
        suhu: `${tempValue}°${tempUnit}`,
        humidity: humidity,
        wind: wind.replace(/km\/h/, "kmh").replace(/mph/, "mph"),
        condition: condition,
        location: location
      };
    } catch (error) {
      throw new Error(error.response ? error.response.status : error.message);
    }
  }
};
export default async function handler(req, res) {
  const {
    query,
    language = "id",
    tempUnit = "C"
  } = req.method === "GET" ? req.query : req.body;
  if (!query) return res.status(400).json({
    error: "Query is required"
  });
  try {
    const weatherData = await google.weather(query, language, tempUnit);
    return res.status(200).json(weatherData);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}