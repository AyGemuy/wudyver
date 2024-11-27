import fetch from "node-fetch";
import * as cheerio from "cheerio";
class TTSave {
  async down(videoUrl) {
    try {
      const response = await fetch("https://ttsave.app/download", {
        method: "POST",
        headers: {
          Accept: "application/json, text/plain, */*",
          "Content-Type": "application/json",
          "User-Agent":
            "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36",
          Referer: "https://ttsave.app/id",
        },
        body: JSON.stringify({
          query: videoUrl,
          language_id: "2",
        }),
      });
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      const html = await response.text();
      const $ = cheerio.load(html);
      return {
        id: $("#unique-id").val(),
        name: $("h2.font-extrabold.text-xl").text(),
        avatar: $("a img").attr("src"),
        username: $("a.font-extrabold.text-blue-400").text(),
        bio: $("p.text-gray-600").text(),
        stats: {
          views: $("svg.text-gray-500 + span").first().text(),
          likes: $("svg.text-red-500 + span").text(),
          comments: $("svg.text-green-500 + span").text(),
          shares: $("svg.text-yellow-500 + span").text(),
          saves: $("svg.text-blue-500 + span").text(),
        },
        sound: $("svg.text-gray-600 + span").text(),
        downloadLinks: {
          ...Object.fromEntries(
            $("a")
              .get()
              .map((a) => [a.attribs.type, $(a).attr("href")])
              .filter(([type, href]) => type && href && href.trim() !== ""),
          ),
        },
      };
    } catch (error) {
      console.error("Error in TTSave down:", error);
      throw error;
    }
  }
}
const ttsave = new TTSave();

const ttSave = async (videoUrl) => {
  try {
    return await ttsave.down(videoUrl);
  } catch (error) {
    console.error("Error during download:", error);
    throw error;
  }
};

export default async function handler(req, res) {
  const { url } = req.query;

  if (!url) return res.status(400).json({ message: "No url provided" });

  const result = await ttSave(url);
  return res.status(200).json(typeof result === "object" ? result : result);
}
