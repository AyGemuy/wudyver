import fetch from "node-fetch";
import * as cheerio from "cheerio";

export default async function handler(req, res) {
try {
    const response = await fetch("https://www.liburnasional.com/");
    const html = await response.text();
    const $ = cheerio.load(html);
    const nextLibur = $("div.row.row-alert > div")
      .text()
      .split("Hari libur")[1]
      .trim();
    const libnas_content = $("tbody > tr > td > span > div")
      .map((index, element) => {
        const summary = $(element).find("span > strong > a").text();
        const days = $(element)
          .find("div.libnas-calendar-holiday-weekday")
          .text();
        const dateMonth = $(element)
          .find("time.libnas-calendar-holiday-datemonth")
          .text();
        return {
          summary: summary,
          days: days,
          dateMonth: dateMonth,
        };
      })
      .get();
    const result = {
      nextLibur: nextLibur,
      libnas_content: libnas_content,
    };
    return res.status(200).json(typeof result === "object" ? result : result);
  } catch (error) {
    return res.status(400).json({
      nextLibur: null,
      libnas_content: null,
    });
  }
}
