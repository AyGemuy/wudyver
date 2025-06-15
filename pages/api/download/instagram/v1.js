import axios from "axios";
import qs from "querystring";
class InstagramScraper {
  constructor() {
    this.axiosInstance = axios.create({
      baseURL: "https://www.instagram.com/api/graphql",
      headers: {
        Accept: "*/*",
        "Accept-Language": "en-US,en;q=0.5",
        "Content-Type": "application/x-www-form-urlencoded",
        "X-FB-Friendly-Name": "PolarisPostActionLoadPostQueryQuery",
        "X-CSRFToken": "RVDUooU5MYsBbS1CNN3CzVAuEP8oHB52",
        "X-IG-App-ID": "1217981644879628",
        "X-FB-LSD": "AVqbxe3J_YA",
        "X-ASBD-ID": "129477",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-origin",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36"
      }
    });
  }
  getInstagramPostId(url) {
    const match = url.match(/(?:https?:\/\/)?(?:www\.)?instagram\.com\/(?:p|tv|stories|reel)\/([^/?#&]+).*/);
    return match ? match[1] : null;
  }
  encodeGraphqlRequestData(shortcode) {
    return qs.stringify({
      av: "0",
      __d: "www",
      __user: "0",
      __a: "1",
      __req: "3",
      __hs: "19624.HYP:instagram_web_pkg.2.1..0.0",
      dpr: "3",
      __ccg: "UNKNOWN",
      __rev: "1008824440",
      __s: "xf44ne:zhh75g:xr51e7",
      __hsi: "7282217488877343271",
      __dyn: "7xeUmwlEnwn8K2WnFw9-2i5U4e0yoW3q32360CEbo1nEhw2nVE4W0om78b87C0yE5ufz81s8hwGwQwoEcE7O2l0Fwqo31w9a9x-0z8-U2zxe2GewGwso88cobEaU2eUlwhEe87q7-0iK2S3qazo7u1xwIw8O321LwTwKG1pg661pwr86C1mwraCg",
      __csr: "gZ3yFmJkillQvV6ybimnG8AmhqujGbLADgjyEOWz49z9XDlAXBJpC7Wy-vQTSvUGWGh5u8KibG44dBiigrgjDxGjU0150Q0848azk48N09C02IR0go4SaR70r8owyg9pU0V23hwiA0LQczA48S0f-x-27o05NG0fkw",
      __comet_req: "7",
      lsd: "AVqbxe3J_YA",
      jazoest: "2957",
      __spin_r: "1008824440",
      __spin_b: "trunk",
      __spin_t: "1695523385",
      fb_api_caller_class: "RelayModern",
      fb_api_req_friendly_name: "PolarisPostActionLoadPostQueryQuery",
      variables: JSON.stringify({
        shortcode: shortcode
      }),
      server_timestamps: "true",
      doc_id: "10015901848480474"
    });
  }
  async getPostGraphqlData(postId) {
    try {
      const response = await this.axiosInstance.post("", this.encodeGraphqlRequestData(postId));
      return response.data;
    } catch (error) {
      throw new Error("Gagal mengambil data dari Instagram");
    }
  }
  extractPostInfo(mediaData) {
    if (!mediaData) throw new Error("Data media tidak tersedia");
    const getUrlFromData = data => {
      if (data.edge_sidecar_to_children) {
        return data.edge_sidecar_to_children.edges.map(edge => edge.node.video_url || edge.node.display_url);
      }
      return data.video_url ? [data.video_url] : [data.display_url];
    };
    return {
      url: getUrlFromData(mediaData),
      metadata: {
        caption: mediaData.edge_media_to_caption?.edges[0]?.node.text || "",
        username: mediaData.owner?.username || "unknown",
        like: mediaData.edge_media_preview_like?.count || 0,
        comment: mediaData.edge_media_to_comment?.count || 0,
        isVideo: mediaData.is_video || false
      }
    };
  }
  async fetchData(url) {
    const postId = this.getInstagramPostId(url);
    if (!postId) throw new Error("URL Instagram tidak valid");
    const data = await this.getPostGraphqlData(postId);
    return this.extractPostInfo(data.data?.xdt_shortcode_media);
  }
}
export default async function handler(req, res) {
  try {
    const {
      url
    } = req.method === "GET" ? req.query : req.body;
    if (!url) {
      return res.status(400).json({
        error: "Invalid Instagram URL"
      });
    }
    const instagram = new InstagramScraper();
    const result = await instagram.fetchData(url);
    return res.status(200).json({
      result: result
    });
  } catch (error) {
    res.status(500).json({
      msg: error.message
    });
  }
}