import axios from "axios";
import * as cheerio from "cheerio";
class TextToImageGenerator {
  constructor() {
    this.client = axios.create({
      baseURL: "https://www.texttoimage.org",
      headers: {
        accept: "application/json, text/javascript, */*; q=0.01",
        "accept-language": "id-ID,id;q=0.9",
        "cache-control": "no-cache",
        "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
        origin: "https://www.texttoimage.org",
        pragma: "no-cache",
        priority: "u=1, i",
        referer: "https://www.texttoimage.org/",
        "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
        "x-requested-with": "XMLHttpRequest"
      }
    });
  }
  async getImageDetails(detailPageUrl) {
    try {
      const response = await this.client.get(detailPageUrl, {
        headers: {
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
          "sec-fetch-dest": "document",
          "sec-fetch-mode": "navigate",
          "sec-fetch-site": "same-origin",
          "sec-fetch-user": "?1",
          "upgrade-insecure-requests": "1"
        }
      });
      const html = response.data;
      const $ = cheerio.load(html);
      const details = {};
      details.title = "N/A";
      details.description = "N/A";
      details.created_on = "N/A";
      details.image_url = "N/A";
      details.download_url = "N/A";
      details.likes = 0;
      details.share_url = "N/A";
      details.related_images = [];
      const mainImageAnchor = $(".image-container a");
      if (mainImageAnchor.length > 0) {
        details.image_url = this.client.defaults.baseURL + (mainImageAnchor.find("img").eq(0).attr("src") || "");
        details.download_url = this.client.defaults.baseURL + (mainImageAnchor.eq(0).attr("href") || "");
      }
      const promptInfo = $(".prompt-info");
      if (promptInfo.length > 0) {
        details.title = promptInfo.find("h1").eq(0).text().trim() || "N/A";
        details.description = promptInfo.find(".info-box div").eq(0).find("p").eq(0).text().trim() || "N/A";
        details.created_on = promptInfo.find(".info-box div").eq(1).find("p").eq(0).text().trim() || "N/A";
      }
      const likeButton = $(".action-btn.like-btn");
      if (likeButton.length > 0) {
        const likeCountText = likeButton.find(".like-count").eq(0).text().trim();
        details.likes = parseInt(likeCountText) || 0;
      }
      const shareButton = $(".action-btn.share-btn");
      if (shareButton.length > 0) {
        details.share_url = this.client.defaults.baseURL + (shareButton.eq(0).attr("data-url") || "");
      }
      details.related_images = $(".similar-gallery .gallery-item").get().map(_el => {
        const item = $(_el);
        const relatedImageSrc = item.find("img").eq(0).attr("src");
        const relatedImageTitle = item.find(".image-title").eq(0).text().trim();
        const relatedImageLink = item.eq(0).attr("href");
        if (relatedImageSrc && relatedImageTitle && relatedImageLink) {
          return {
            title: relatedImageTitle,
            link: this.client.defaults.baseURL + relatedImageLink,
            image: this.client.defaults.baseURL + relatedImageSrc
          };
        }
        return null;
      }).filter(item => item !== null);
      return {
        status: "success",
        data: details
      };
    } catch (error) {
      console.error(`Error fetching image details from ${detailPageUrl}: ${error.message}`);
      if (error.response) {
        console.error(`Response data: ${JSON.stringify(error.response.data)}`);
        console.error(`Response status: ${error.response.status}`);
      }
      return {
        status: "error",
        message: error.message
      };
    }
  }
  async generate({
    prompt
  }) {
    try {
      const response = await this.client.post("/generate", `prompt=${encodeURIComponent(prompt)}`);
      const generateResult = response.data;
      if (generateResult.success && generateResult.url) {
        const detailPageUrl = generateResult.url;
        console.log(`Image generated. Attempting to fetch details from: ${this.client.defaults.baseURL}${detailPageUrl}`);
        const detailsResult = await this.getImageDetails(detailPageUrl);
        if (detailsResult.status === "success") {
          return {
            status: "success",
            generation_info: generateResult,
            details: detailsResult.data
          };
        } else {
          return {
            status: "error",
            message: `Generated image, but failed to fetch details: ${detailsResult.message}`
          };
        }
      } else {
        return {
          status: "error",
          message: generateResult.message || "Image generation failed without a specific message."
        };
      }
    } catch (error) {
      console.error(`Error during image generation or detail fetch for prompt "${prompt}": ${error.message}`);
      if (error.response) {
        console.error(`Response data: ${JSON.stringify(error.response.data)}`);
        console.error(`Response status: ${error.response.status}`);
      }
      return {
        status: "error",
        message: error.message
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "prompt is required"
    });
  }
  const generator = new TextToImageGenerator();
  try {
    const data = await generator.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      error: "Internal Server Error"
    });
  }
}