import axios from "axios";
import * as cheerio from "cheerio";
class Eporner {
  async search(q) {
    try {
      const response = await axios.get(`https://www.eporner.com/search?q=${q}`),
        $ = cheerio.load(response.data);
      return $("#vidresults .mb")
        .map((index, el) => ({
          id: $(el).data("id") || "ID not available",
          quality:
            $(el).find(".mvhdico span").text() || "Quality not available",
          title: $(el).find(".mbtit a").text() || "Title not available",
          duration: $(el).find(".mbtim").text() || "Duration not available",
          rating: $(el).find(".mbrate").text() || "Rating not available",
          views: $(el).find(".mbvie").text() || "Views not available",
          uploader:
            $(el).find(".mb-uploader a").text() || "Uploader not available",
          link:
            new URL(
              $(el).find(".mbtit a").attr("href"),
              "https://www.eporner.com",
            ).href || "Link not available",
          thumbnail:
            $(el).find(".mbimg img").attr("src") || "Thumbnail not available",
        }))
        .get();
    } catch (error) {
      return console.error("Error fetching data:", error), null;
    }
  }
}
const eporner = new Eporner();

const eporners = async (q) => {
  try {
    return await eporner.search(q);
  } catch (error) {
    console.error("Error during search:", error);
    throw error;
  }
};

export default async function handler(req, res) {
  const { query } = req.query;

  if (!query) return res.status(400).json({ message: "No query provided" });

  const result = await eporners(query);
  return res.status(200).json(typeof result === "object" ? result : result);
}
