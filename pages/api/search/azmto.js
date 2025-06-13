import fetch from "node-fetch";
import * as cheerio from "cheerio";
async function searchAzm(query) {
  const url = "https://azm.to/search/" + encodeURIComponent(query);
  try {
    const response = await fetch(url);
    const html = await response.text();
    const $ = cheerio.load(html);
    return $(".col-3.col-tb-4.col-p-6.col-md-2.poster-col").map((index, element) => {
      const $element = $(element);
      return {
        posterLink: "https://azm.to" + $element.find(".poster").attr("href"),
        posterImg: $element.find(".poster__img").attr("data-src"),
        posterTitle: $element.find(".poster__title").text().trim(),
        posterYear: $element.find(".poster__year .badge").text().trim(),
        posterDuration: $element.find(".poster__year .has-icon").text().trim()
      };
    }).get();
  } catch (error) {
    console.error("Error:", error);
    return [];
  }
}
async function detailAzm(query) {
  const url = query;
  try {
    const response = await fetch(url);
    const html = await response.text();
    const $ = cheerio.load(html);
    const details = {};
    details.breadcrumbs = $(".container.row.details .col-12.breadcrumbs.has-icon a").map((_, el) => $(el).text().trim()).get();
    details.posterImg = $(".container.row.details .col-3.hide-on-tab-port.details__poster img").attr("src");
    details.title = $(".container.row.details .col-6.col-md-7.mb-2.col-tl-9.col-tb-12.details__info .details__heading").text().trim();
    details.rating = $(".container.row.details .col-6.col-md-7.mb-2.col-tl-9.col-tb-12.details__info .details__rating span").text().trim();
    details.year = $(".container.row.details .col-6.col-md-7.mb-2.col-tl-9.col-tb-12.details__info .details__metadata span:first-child").text().trim();
    details.duration = $(".container.row.details .col-6.col-md-7.mb-2.col-tl-9.col-tb-12.details__info .details__metadata span:last-child").text().trim();
    details.genres = $(".container.row.details .col-6.col-md-7.mb-2.col-tl-9.col-tb-12.details__info .details__genre a").map((_, el) => $(el).text().trim()).get();
    details.overview = $(".container.row.details .col-6.col-md-7.mb-2.col-tl-9.col-tb-12.details__info .details__overview").text().trim();
    details.serverLinks = $(".container.row.details .col-12.m-children-bottom-1.flex.flex-between.col-12.mt-1.player__server-wrapper .details__genre a").map((_, el) => ({
      link: $(el).attr("value"),
      label: $(el).find("span").text().trim()
    })).get();
    return details;
  } catch (error) {
    console.error("Error:", error);
    return null;
  }
}
export default async function handler(req, res) {
  const {
    method
  } = req;
  if (method === "GET") {
    const {
      action,
      query
    } = req.method === "GET" ? req.query : req.body;
    try {
      if (action === "search") {
        const results = await searchAzm(query);
        return res.status(200).json(results);
      } else if (action === "detail") {
        const details = await detailAzm(query);
        return res.status(200).json(details);
      } else {
        return res.status(400).json({
          message: "Invalid action"
        });
      }
    } catch (error) {
      return res.status(500).json({
        message: error.message
      });
    }
  } else {
    return res.status(405).json({
      message: "Method not allowed"
    });
  }
}