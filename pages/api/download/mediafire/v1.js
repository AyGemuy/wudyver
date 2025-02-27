import axios from "axios";
export default async function handler(req, res) {
  const {
    url
  } = req.method === "GET" ? req.query : req.body;
  if (!url) {
    return res.status(400).json({
      error: "URL is required"
    });
  }
  try {
    const {
      data
    } = await axios.get(`https://wudysoft-down.hf.space/mediafire?url=${url}`);
    const {
      fileName,
      downloadLink,
      fileSize,
      meta
    } = data;
    const {
      app_id,
      type,
      site_name,
      locale,
      title,
      image,
      card,
      site
    } = meta;
    const formattedResponse = {
      fileName: fileName || "N/A",
      downloadLink: downloadLink || "N/A",
      fileSize: fileSize || "N/A",
      meta: {
        appId: app_id || "N/A",
        type: type || "N/A",
        siteName: site_name || "N/A",
        locale: locale || "N/A",
        url: url || "N/A",
        title: title || "N/A",
        image: image || "N/A",
        card: card || "N/A",
        site: site || "N/A"
      }
    };
    return res.status(200).json(formattedResponse);
  } catch (error) {
    return res.status(500).json({
      error: "Failed to fetch MediaFire data"
    });
  }
}