import fetch from "node-fetch";
import * as cheerio from "cheerio";
async function JagoKata(q) {
  try {
    const response = await fetch("https://jagokata.com/kata-bijak/cari.html", {
      method: "POST",
      body: new URLSearchParams({
        citaat: q,
        zoekbutton: "Zoeken"
      }),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      }
    });
    const data = await response.text();
    const $ = cheerio.load(data);
    return $("#main #content #content-container #images-container ul li, #main #content #content-container #citatenrijen li").map((_, el) => ({
      quote: $(el).find(".quotebody .fbquote").text().trim(),
      link: `https://jagokata.com${$(el).find("a").attr("href")}`,
      img: $(el).find(".quotebody img").attr("data-src"),
      author: $(el).find(".citatenlijst-auteur > a, .auteurfbnaam").text().trim(),
      description: $(el).find(".citatenlijst-auteur > .auteur-beschrijving").text().trim(),
      lifespan: $(el).find(".citatenlijst-auteur > .auteur-gebsterf").text().trim(),
      votes: $(el).find(".votes-content > .votes-positive").text().trim(),
      category: $("#main").find("h1.kamus").text().trim(),
      tags: $(el).attr("id")
    })).get();
  } catch (error) {
    throw new Error("Error fetching data from JagoKata: " + error.message);
  }
}
export default async function handler(req, res) {
  const {
    query
  } = req;
  const q = query.q;
  if (!q) {
    return res.status(400).json({
      error: 'Parameter "q" diperlukan'
    });
  }
  try {
    const quotes = await JagoKata(q);
    return res.status(200).json({
      quotes: quotes
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}