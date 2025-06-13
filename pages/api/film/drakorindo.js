import axios from "axios";
import * as cheerio from "cheerio";
class DrakorIndo {
  async search(query) {
    let {
      data
    } = await axios.get("https://drakorindo.im/?s=" + encodeURIComponent(query));
    let $ = cheerio.load(data);
    let title = [];
    let image = [];
    let link = [];
    let rilis = [];
    let sinopsis = [];
    let result = [];
    $(".mh-loop-thumb img").each((a, b) => {
      let x = $(b).attr("alt");
      title.push(x);
    });
    $(".mh-loop-thumb img").each((a, b) => {
      let x = $(b).attr("src");
      image.push(x);
    });
    $(".mh-loop-thumb a").each((a, b) => {
      let x = $(b).attr("href");
      link.push(x);
    });
    $("span[class='mh-meta-date updated']").each((a, b) => {
      let x = $(b).text().trim();
      rilis.push(x);
    });
    $(".mh-excerpt p").each((a, b) => {
      let x = $(b).text().trim();
      sinopsis.push(x);
    });
    for (let i = 0; i < link.length; i++) {
      result.push({
        title: title[i],
        image: image[i],
        link: link[i],
        rilis: rilis[i],
        sinopsis: sinopsis[i]
      });
    }
    return result;
  }
  async ongoing(page = "1") {
    let {
      data
    } = await axios.get("https://drakorindo.im/genre/ongoing/page/" + page + "/");
    let $ = cheerio.load(data);
    let title = [];
    let image = [];
    let link = [];
    let rilis = [];
    let sinopsis = [];
    let result = [];
    $(".mh-loop-thumb img").each((a, b) => {
      let x = $(b).attr("alt");
      title.push(x);
    });
    $(".mh-loop-thumb img").each((a, b) => {
      let x = $(b).attr("src");
      image.push(x);
    });
    $(".mh-loop-thumb a").each((a, b) => {
      let x = $(b).attr("href");
      link.push(x);
    });
    $("span[class='mh-meta-date updated']").each((a, b) => {
      let x = $(b).text().trim();
      rilis.push(x);
    });
    $(".mh-excerpt p").each((a, b) => {
      let x = $(b).text().trim();
      sinopsis.push(x);
    });
    for (let i = 0; i < link.length; i++) {
      result.push({
        title: title[i],
        image: image[i],
        link: link[i],
        rilis: rilis[i],
        sinopsis: sinopsis[i]
      });
    }
    return result;
  }
  async detail(url) {
    try {
      const {
        data
      } = await axios.get(url);
      const $ = cheerio.load(data);
      const title = $("h1.entry-title").text();
      const metaDate = $("span.entry-meta-date.updated a").text();
      const author = $("span.entry-meta-author a.fn").text();
      const categories = $("span.entry-meta-categories a").text();
      const comments = $("span.entry-meta-comments a.mh-comment-scroll").text();
      const synopsis = $('p strong:contains("Sinopsis Running Man")').next().text();
      const details = $('p strong:contains("Detail")').next().html();
      const downloadLinks = [];
      $('p:contains("Episode")').each((i, elem) => {
        const episode = $(elem).find("strong").text().trim();
        const links = [];
        $(elem).find("a").each((i, link) => {
          links.push({
            text: $(link).text(),
            href: $(link).attr("href")
          });
        });
        downloadLinks.push({
          episode: episode,
          links: links
        });
      });
      return {
        title: title,
        metaDate: metaDate,
        author: author,
        categories: categories,
        comments: comments,
        synopsis: synopsis,
        details: details,
        downloadLinks: downloadLinks
      };
    } catch (error) {
      console.error("Error fetching the content:", error);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    query,
    page,
    url
  } = req.method === "GET" ? req.query : req.body;
  const Drakorindo = new DrakorIndo();
  try {
    let result;
    if (action === "search" && query) {
      result = await Drakorindo.search(query);
    } else if (action === "ongoing") {
      result = await Drakorindo.ongoing(page || "1");
    } else if (action === "detail" && url) {
      result = await Drakorindo.detail(url);
    } else {
      return res.status(400).json({
        error: "Invalid action or missing query parameter"
      });
    }
    return res.status(200).json(result);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "An error occurred while fetching data"
    });
  }
}