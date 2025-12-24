import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
class YouTube {
  constructor() {
    this.client = wrapper(axios.create({
      jar: new CookieJar()
    }));
  }
  async search(query = "hello") {
    return new Promise(async (resolve, reject) => {
      await this.client.get("https://www.youtube.com/results", {
        headers: {
          accept: "*/*",
          "accept-encoding": "gzip, deflate, br",
          "accept-language": "en-US,en;q=0.9",
          "sec-ch-ua": '"Google Chrome";v="117", "Not;A=Brand";v="8", "Chromium";v="117"',
          "sec-ch-ua-mobile": "?0",
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36"
        },
        params: {
          search_query: query
        }
      }).then(({
        data: html
      }) => {
        const script = /var ytInitialData = {(.*?)};/.exec(html)?.[1];
        if (!script) return reject(new Error(`Can't find script data (ytInitialData)!`));
        const json = JSON.parse("{" + script + "}");
        const contents = json.contents.twoColumnSearchResultsRenderer.primaryContents.sectionListRenderer.contents[0].itemSectionRenderer.contents;
        const results = contents.map(content => {
          const tag = Object.keys(content)[0];
          if (tag === "videoRenderer") {
            const data = content[tag];
            return {
              id: data.videoId,
              url: `https://www.youtube.com/watch?v=${data.videoId}`,
              title: data.title?.runs[0]?.text,
              author: data.ownerText?.runs[0]?.text,
              description: data.descriptionSnippet ? data.descriptionSnippet.runs.map(run => run.text).join("") : data.detailedMetadataSnippets ? data.detailedMetadataSnippets[0].snippetText.runs.map(run => run.text).join("") : "",
              viewers: data.viewCountText?.simpleText,
              verified: data.ownerBadges && data.ownerBadges.some(badge => badge.metadataBadgeRenderer.tooltip === "Official Artist Channel"),
              duration: data.lengthText?.accessibility?.accessibilityData?.label,
              thumbnail: data.thumbnail?.thumbnails[0]?.url,
              moving_thumbnail: data.richThumbnail ? data.richThumbnail.movingThumbnailRenderer.movingThumbnailDetails.thumbnails[0].url : null,
              avatar: data.channelThumbnailSupportedRenderers?.channelThumbnailWithLinkRenderer?.thumbnail?.thumbnails[0]?.url,
              published: data.publishedTimeText?.simpleText
            };
          }
          return null;
        }).filter(Boolean);
        resolve(results);
      }).catch(reject);
    });
  }
}
export default async function handler(req, res) {
  const {
    query
  } = req.method === "GET" ? req.query : req.body;
  if (!query) {
    return res.status(400).json({
      error: "Paramenter 'query' is required"
    });
  }
  try {
    const ytSearch = new YouTube();
    const result = await ytSearch.search(query);
    return res.status(200).json(result);
  } catch (error) {
    console.error("Error processing request:", error);
    return res.status(500).json({
      error: "Internal Server Error"
    });
  }
}