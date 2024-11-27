import fetch from "node-fetch";
class TestTerabox {
  async down(videoUrl) {
    try {
      const response = await fetch("https://testterabox.vercel.app/api", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent":
            "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36",
          Referer: "https://teraboxdownloader.online/",
        },
        body: JSON.stringify({
          url: videoUrl,
        }),
      });
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      const json = await response.json();
      return {
        medias: [
          {
            text: json.file_name,
            url: json.direct_link,
            quality: json.size,
          },
        ],
      };
    } catch (error) {
      console.error("Error in TestTerabox down:", error);
      throw error;
    }
  }
}
const testtera = new TestTerabox();

const testterabox = async (videoUrl) => {
  try {
    return await testtera.down(videoUrl);
  } catch (error) {
    console.error("Error during download:", error);
    throw error;
  }
};

export default async function handler(req, res) {
  const { url } = req.query;

  if (!url) return res.status(400).json({ message: "No url provided" });

  const result = await testterabox(url);
  return res.status(200).json(typeof result === "object" ? result : result);
}
