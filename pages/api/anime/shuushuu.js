import * as cheerio from "cheerio";
import fetch from "node-fetch";
const shuuShuu = async () => {
  try {
    const response = await fetch("https://e-shuushuu.net/random.php");
    const html = await response.text();
    const $ = cheerio.load(html);
    const imageThreads = $("#content .image_thread").map((_, element) => ({
      title: $(element).find(".title a").text().trim(),
      imageLink: "https://e-shuushuu.net" + $(element).find(".thumb .thumb_image").attr("href"),
      submittedBy: $(element).find('.meta dl dt:contains("Submitted By:") + dd span.reg_user').text().trim(),
      submittedOn: $(element).find('.meta dl dt:contains("Submitted On:") + dd').text().trim(),
      fileSize: $(element).find('.meta dl dt:contains("File size:") + dd').text().trim(),
      dimensions: $(element).find('.meta dl dt:contains("Dimensions:") + dd').text().trim(),
      tags: $(element).find('.meta dl dt:contains("Tags:") + dd span.tag').map((_, tag) => $(tag).text().trim()).get(),
      source: $(element).find('.meta dl dt:contains("Source:") + dd span.tag').text().trim(),
      characters: $(element).find('.meta dl dt:contains("Characters:") + dd span.tag').map((_, character) => $(character).text().trim()).get(),
      oldCharacters: $(element).find('.meta dl dt:contains("Old Characters:") + dd').text().trim().split(",").map(item => item.trim()),
      artist: $(element).find('.meta dl dt:contains("Artist:") + dd span.tag').text().trim()
    })).get();
    return imageThreads.length === 0 ? null : imageThreads[Math.floor(Math.random() * imageThreads.length)];
  } catch (error) {
    throw error;
  }
};
export default async function handler(req, res) {
  try {
    const result = await shuuShuu();
    if (!result) return res.status(404).json({
      error: "No image threads found"
    });
    return res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}