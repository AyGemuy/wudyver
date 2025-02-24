import axios from "axios";
import * as cheerio from "cheerio";
async function downloadv1(url) {
  try {
    const response = await axios.post("https://savetik.co/api/ajaxSearch", qs.stringify({
      q: url,
      lang: "vi"
    }), {
      headers: {
        Accept: "*/*",
        "Accept-Encoding": "gzip, deflate, br, zstd",
        "Accept-Language": "vi,en;q=0.9",
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        Cookie: "FCNEC=%5B%5B%22AKsRol8Cm7KZJVT1qv76DomWq2i9YS9_gqrH_1Pd5lZUx6mCYU7N55B7sewdtWwhYU2H7Ch9Qck2F1jxBATuhS_61mFVzc6mUtbSwOtuGx-RqFJBy_4DwhpGKDBx_d9n0o77JEV2RhVjRbX4UGVDzu5ycSEHyFgVhw%3D%3D%22%5D%5D; _gid=GA1.2.239355849.1721362453; _gat_gtag_UA_88358110_1=1; _ga_4ZEZMTBFLJ=GS1.1.1721362453.1.0.1721362453.0.0.0; _ga=GA1.1.1671159918.1721362453; __gads=ID=26da3097086e8079:T=1721361782:RT=1721362453:S=ALNI_MYjRDY_JVe50XpAu_1rbqKQqpG40A; __gpi=UID=00000e9aa3a64eae:T=1721361782:RT=1721362453:S=ALNI_Malvpt443_LedIPzqfPYpuc6mNeOQ; __eoi=ID=c3a5b87e2e314d36:T=1721361782:RT=1721362453:S=AA-AfjbNonNrnf1ktKJtf1XgGOWL",
        Origin: "https://savetik.co",
        Referer: "https://savetik.co/vi/douyin-downloader",
        "Sec-Ch-Ua": '"Google Chrome";v="125", "Chromium";v="125", "Not.A/Brand";v="24"',
        "Sec-Ch-Ua-Mobile": "?0",
        "Sec-Ch-Ua-Platform": '"Windows"',
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-origin",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        "X-Requested-With": "XMLHttpRequest"
      }
    });
    const $ = cheerio.load(response.data.data);
    const results = {
      id: "",
      title: "",
      audio: "",
      attachments: []
    };
    results.title = $("div.tik-video div.thumbnail div.content h3").text().trim();
    results.id = $("#TikTokId").val();
    results.audio = $("a#ConvertToVideo").data("audiourl") || "";
    const photos = [];
    $("div.photo-list ul.download-box li div.download-items__thumb img").each((index, element) => {
      const imageUrl = $(element).attr("src");
      if (imageUrl) {
        photos.push(imageUrl);
      }
    });
    const videoUrls = [];
    $("a.tik-button-dl").each((index, element) => {
      videoUrls.push($(element).attr("href"));
    });
    if (photos.length > 0) {
      photos.forEach(imageUrl => {
        results.attachments.push({
          type: "Photo",
          url: imageUrl
        });
      });
    } else if (videoUrls.length > 1) {
      results.attachments.push({
        type: "Video",
        url: videoUrls[1]
      });
    }
    return results;
  } catch (error) {
    console.error("Error:", error);
  }
}
export default async function handler(req, res) {
  const {
    url
  } = req.method === "GET" ? req.query : req.body;
  if (!url) {
    return res.status(400).json({
      error: "URL tidak ditemukan. Pastikan URL TikTok sudah benar."
    });
  }
  try {
    const result = await downloadv1(url);
    res.status(200).json({
      message: "Download link generated successfully",
      result: result
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to generate download link",
      details: error
    });
  }
}