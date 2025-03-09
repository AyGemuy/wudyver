import nexo from "nexo-aio-downloader";
const supportedPlatforms = {
  twitter: /https?:\/\/(www\.)?(twitter\.com|x\.com)\/.*/,
  instagram: /https?:\/\/(www\.)?instagram\.com\/.*/,
  facebook: /https?:\/\/(www\.)?facebook\.com(\/share\/v\/)?.*/,
  tiktok: /https?:\/\/(www\.)?(tiktok\.com|vt\.tiktok\.com)\/.*/,
  "google-drive": /https?:\/\/(www\.)?drive\.google\.com\/.*/,
  sfile: /https?:\/\/(www\.)?sfile\.mobi\/.*/
};
export default async function handler(req, res) {
  try {
    const {
      url
    } = req.method === "GET" ? req.query : req.body;
    if (!url) {
      return res.status(400).json({
        error: "Please add ?url=media_url_here"
      });
    }
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url;
    }
    let platform = Object.keys(supportedPlatforms).find(key => supportedPlatforms[key].test(url));
    if (!platform) {
      return res.status(400).json({
        error: "Unsupported URL"
      });
    }
    let result;
    switch (platform) {
      case "twitter":
        result = await nexo.twitter(url);
        break;
      case "instagram":
        result = await nexo.instagram(url);
        break;
      case "facebook":
        result = await nexo.facebook(url);
        break;
      case "tiktok":
        result = await nexo.tiktok(url);
        break;
      case "google-drive":
        result = await nexo.googleDrive(url);
        break;
      case "sfile":
        result = await nexo.sfile(url);
        break;
      default:
        return res.status(400).json({
          error: "Unsupported URL"
        });
    }
    res.status(200).json({
      content: result
    });
  } catch (error) {
    console.error("Error downloading media:", error);
    res.status(500).json({
      error: "Failed to download media"
    });
  }
}