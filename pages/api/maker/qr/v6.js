import axios from "axios";
class QRStuffQRCodeGenerator {
  async generateQRCode({
    text = "",
    shorturl = 1,
    google_campaign = 0,
    campaign_source = "",
    campaign_medium = "QR Code",
    campaign_content = "",
    campaign_name = "",
    ecc_level = "H",
    width_pixels = 400,
    dpi = 72,
    file_type = "png",
    finder_shape = "Normal",
    finder_eye_shape = "Normal",
    module_shape = "Normal",
    alignment_outer_shape = "Normal",
    alignment_inner_shape = "Normal",
    module_color = "#000000",
    canvas_color = "#ffffff",
    finder_color = "#000000",
    finder_eye_color = "#000000",
    alignment_outer_color = "#000000",
    alignment_inner_color = "#000000",
    transparent_bg = false,
    gradient_type = "",
    gradient_color = "#5D4696",
    center_element = "logo",
    logo_file_idfs_file = "",
    fill_element = "background",
    background_image_file_idfs_file = "",
    name = "",
    idproject = "",
    note = "",
    type = "TEXT"
  }) {
    const url = "https://www.qrstuff.com/generate.download";
    const params = {
      text: text,
      shorturl: shorturl,
      google_campaign: google_campaign,
      campaign_source: campaign_source,
      campaign_medium: campaign_medium,
      campaign_content: campaign_content,
      campaign_name: campaign_name,
      ecc_level: ecc_level,
      width_pixels: width_pixels,
      dpi: dpi,
      file_type: file_type,
      finder_shape: finder_shape,
      finder_eye_shape: finder_eye_shape,
      module_shape: module_shape,
      alignment_outer_shape: alignment_outer_shape,
      alignment_inner_shape: alignment_inner_shape,
      module_color: module_color,
      canvas_color: canvas_color,
      finder_color: finder_color,
      finder_eye_color: finder_eye_color,
      alignment_outer_color: alignment_outer_color,
      alignment_inner_color: alignment_inner_color,
      transparent_bg: transparent_bg,
      gradient_type: gradient_type,
      gradient_color: gradient_color,
      center_element: center_element,
      logo_file_idfs_file: logo_file_idfs_file,
      fill_element: fill_element,
      background_image_file_idfs_file: background_image_file_idfs_file,
      name: name,
      idproject: idproject,
      note: note,
      type: type
    };
    try {
      const response = await axios.post(url, new URLSearchParams(params).toString(), {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
          Accept: "application/json, text/plain, */*",
          "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
          Referer: "https://www.qrstuff.com/",
          Origin: "https://www.qrstuff.com",
          "Cache-Control": "no-cache",
          Pragma: "no-cache"
        },
        responseType: "arraybuffer"
      });
      return Buffer.from(response.data);
    } catch (error) {
      return {
        error: "Failed to generate QR code"
      };
    }
  }
}
export default async function handler(req, res) {
  const qrStuffQRCodeGenerator = new QRStuffQRCodeGenerator();
  const {
    data: text = "",
    shorturl = 1,
    google_campaign = 0,
    campaign_source = "",
    campaign_medium = "QR Code",
    campaign_content = "",
    campaign_name = "",
    ecc_level = "H",
    width_pixels = 400,
    dpi = 72,
    file_type = "png",
    finder_shape = "Normal",
    finder_eye_shape = "Normal",
    module_shape = "Normal",
    alignment_outer_shape = "Normal",
    alignment_inner_shape = "Normal",
    module_color = "#000000",
    canvas_color = "#ffffff",
    finder_color = "#000000",
    finder_eye_color = "#000000",
    alignment_outer_color = "#000000",
    alignment_inner_color = "#000000",
    transparent_bg = false,
    gradient_type = "",
    gradient_color = "#5D4696",
    center_element = "logo",
    logo_file_idfs_file = "",
    fill_element = "background",
    background_image_file_idfs_file = "",
    name = "",
    idproject = "",
    note = "",
    type = "TEXT"
  } = req.method === "GET" ? req.query : req.body;
  if (!text) {
    return res.status(400).json({
      error: "Data parameter is required"
    });
  }
  try {
    const result = await qrStuffQRCodeGenerator.generateQRCode({
      text: text,
      shorturl: shorturl,
      google_campaign: google_campaign,
      campaign_source: campaign_source,
      campaign_medium: campaign_medium,
      campaign_content: campaign_content,
      campaign_name: campaign_name,
      ecc_level: ecc_level,
      width_pixels: width_pixels,
      dpi: dpi,
      file_type: file_type,
      finder_shape: finder_shape,
      finder_eye_shape: finder_eye_shape,
      module_shape: module_shape,
      alignment_outer_shape: alignment_outer_shape,
      alignment_inner_shape: alignment_inner_shape,
      module_color: module_color,
      canvas_color: canvas_color,
      finder_color: finder_color,
      finder_eye_color: finder_eye_color,
      alignment_outer_color: alignment_outer_color,
      alignment_inner_color: alignment_inner_color,
      transparent_bg: transparent_bg,
      gradient_type: gradient_type,
      gradient_color: gradient_color,
      center_element: center_element,
      logo_file_idfs_file: logo_file_idfs_file,
      fill_element: fill_element,
      background_image_file_idfs_file: background_image_file_idfs_file,
      name: name,
      idproject: idproject,
      note: note,
      type: type
    });
    if (result.error) {
      return res.status(500).json({
        error: result.error
      });
    }
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Content-Disposition", 'inline; filename="qrcode.png"');
    return res.status(200).send(result);
  } catch (error) {
    return res.status(500).json({
      error: "Server error"
    });
  }
}