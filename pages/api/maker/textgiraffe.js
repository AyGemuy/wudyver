import * as cheerio from "cheerio";
import fetch from "node-fetch";
class LogoGenerator {
  constructor() {
    this.baseUrl = "https://www.textgiraffe.com";
  }
  async create(text, style = 1, page = 0) {
    try {
      const url = page === 0 ? `${this.baseUrl}/Name-Generator/?text=${text}` : `${this.baseUrl}/Name-Generator/Page${page}/?text=${text}`;
      const response = await fetch(url);
      const data = await response.text();
      const $ = cheerio.load(data);
      const logos = $(".logo_preview").map((_, el) => ({
        link: `${this.baseUrl}${$(el).find("a").attr("href")}`,
        title: $(el).find("img").attr("alt"),
        imageUrl: $(el).find("img").attr("src"),
        slug: $(el).find("a").attr("href").split("/")[2]
      })).get();
      const totalPages = Math.max(...$(".paging a").map((_, el) => parseInt($(el).text())).get().filter(n => !isNaN(n)));
      const selectedLogo = logos[style - 1] || logos[0];
      const logoUrl = `https://www.textgiraffe.com/logos/${selectedLogo.slug}/?text=${text}&submit=Download`;
      const logoResponse = await fetch(logoUrl);
      const logoData = await logoResponse.text();
      const $$ = cheerio.load(logoData);
      const logoTitle = $$('div[style="padding:20px;line-height:24px;"] h1').text().trim();
      const links = $$("ul.list10 li a").map((_, el) => $$($$(el)).attr("href")).get();
      return {
        totalPages: totalPages,
        styles: logos.map((_, idx) => idx + 1),
        logo: {
          title: selectedLogo.title,
          imageUrl: selectedLogo.imageUrl,
          logoTitle: logoTitle,
          links: links
        }
      };
    } catch (error) {
      console.error("Error:", error);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const {
    text,
    style = 1,
    page = 1
  } = req.method === "GET" ? req.query : req.body;
  try {
    const logoGen = new LogoGenerator();
    const result = await logoGen.create(text, Number(style), Number(page));
    return res.status(200).json({
      result: result
    });
  } catch (error) {
    return res.status(500).json({
      error: "Something went wrong",
      details: error.message
    });
  }
}