import apiConfig from "@/configs/apiConfig";
import axios from "axios";
import * as cheerio from "cheerio";
class SoundCloud {
  constructor() {
    this.baseSoundCloudUrl = "https://m.soundcloud.com";
    this.baseHtmlUrl = `https://${apiConfig.DOMAIN_URL}/api/tools/web/html/v2?url=`;
  }
  async fetchData(url) {
    try {
      const {
        data
      } = await axios.get(url);
      return data || "";
    } catch (error) {
      console.error("Error fetching data:", error);
      return "";
    }
  }
  async search(query) {
    const url = `${this.baseHtmlUrl}${encodeURIComponent(`${this.baseSoundCloudUrl}/search?q=${query}`)}`;
    const html = await this.fetchData(url);
    if (!html) return [];
    const $ = cheerio.load(html);
    return $(".Cell_Cell__1utfG").map((i, element) => {
      const title = $(element).find(".Cell_CellLink__3yLVS").attr("aria-label") || "No Title";
      return {
        title: title,
        artist: $(element).find(".Information_CellSubtitle__1mXGx").text().trim() || "Unknown Artist",
        link: `${this.baseSoundCloudUrl}${$(element).find("a").attr("href")}`,
        imageSrc: $(element).find("img").attr("src") || ""
      };
    }).get().filter(item => item.title !== "No Title");
  }
  async detail(url) {
    const apiUrl = `${this.baseHtmlUrl}${encodeURIComponent(url)}`;
    const html = await this.fetchData(apiUrl);
    if (!html) return null;
    const $ = cheerio.load(html);
    const metadata = $(".Metadata_CellMetadataCollection__2YcjV .Metadata_CellLabeledMetadata__3s6Tb").map((i, el) => {
      const label = $(el).find(".Metadata_MetadataLabel__3GU8Y").text().trim() || "No Data";
      return {
        label: label
      };
    }).get();
    const engagementData = $(".EntityEngagements_EntityEngagementsDefault__tTv5y .Engagement_EngagementItem__DBRbj").map((i, el) => {
      const label = $(el).attr("aria-label") || "No Label";
      const count = $(el).find(".Engagement_EngagementLabel__2PEJl").text().trim() || "0";
      return {
        label: label,
        count: count
      };
    }).get();
    const scriptTag = $("script#__NEXT_DATA__").html();
    const jsonData = scriptTag ? JSON.parse(scriptTag) : {};
    const trackData = jsonData ? jsonData.props.pageProps.initialStoreState.entities.tracks : {};
    const configData = jsonData ? jsonData.runtimeConfig : {};
    return {
      title: $(".PlayableHeader_TextGroup__vkZ7E h1.PlayableHeader_Title__DndQM").text().trim() || "No Title",
      artist: $(".PlayableHeader_TextGroup__vkZ7E h2.PlayableHeader_Subtitle__3S7Zw a").text().trim() || "Unknown Artist",
      artistLink: `${this.baseSoundCloudUrl}${$(".PlayableHeader_TextGroup__vkZ7E h2.PlayableHeader_Subtitle__3S7Zw a").attr("href")}` || "",
      imageSrc: $(".HeroImage_HeroImageContainer__1tPh- img").attr("src") || "",
      playButton: $(".ControlButton_ControlButton___qsiE").attr("aria-label") === "Play",
      tracks: Object.values(trackData)[0].data,
      config: configData,
      metadata: metadata,
      engagement: engagementData
    };
  }
}
export default async function handler(req, res) {
  const {
    action,
    query,
    url
  } = req.method === "GET" ? req.query : req.body;
  if (!action) return res.status(400).json({
    error: "Action is required"
  });
  try {
    const downloader = new SoundCloud();
    let result;
    switch (action) {
      case "search":
        if (!query) return res.status(400).json({
          error: "Query is required for search"
        });
        result = await downloader.search(query);
        break;
      case "detail":
        if (!url) return res.status(400).json({
          error: "URL is required for detail"
        });
        result = await downloader.detail(url);
        break;
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}`
        });
    }
    return res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}