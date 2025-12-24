import axios from "axios";
import * as cheerio from "cheerio";
class Ccmixter {
  async search(keyword) {
    try {
      const response = await axios.get(`https://ccmixter.org/api/query?=${keyword}`);
      const $ = cheerio.load(response.data);
      const uploads = [];
      $("#upload_listing .upload").each((index, element) => {
        const upload = {
          title: $(element).find('.upload_info a[property="dc:title"]').text(),
          creator: {
            name: $(element).find('.upload_info a[property="dc:creator"]').text(),
            link: $(element).find('.upload_info a[property="dc:creator"]').attr("href")
          },
          date: $(element).find(".upload_date").text().trim(),
          avatar: $(element).find(".upload_avatar img").attr("src"),
          details_link: $(element).find(".cc_file_link").attr("href")
        };
        uploads.push(upload);
      });
      return uploads;
    } catch (error) {
      return error.message;
    }
  }
  async download(ids) {
    try {
      const response = await axios.get(`https://ccmixter.org/api/query/api?ids=${ids}&f=json&dataview=links_dl`);
      const data = response.data;
      const result = data.map(item => ({
        upload_id: item.upload_id,
        upload_name: item.upload_name,
        file_page_url: item.file_page_url,
        user_name: item.user_name,
        files: item.files.map(file => ({
          file_id: file.file_id,
          file_upload: file.file_upload,
          file_name: file.file_name,
          file_nicname: file.file_nicname,
          file_format_info: file.file_format_info,
          file_extra: file.file_extra,
          file_filesize: file.file_filesize,
          file_order: file.file_order,
          file_is_remote: file.file_is_remote,
          file_num_download: file.file_num_download,
          download_url: file.download_url,
          file_rawsize: file.file_rawsize
        })),
        download_url: item.download_url
      }));
      return result;
    } catch (error) {
      return error.message;
    }
  }
  async getIDS(urls) {
    const regex = /(\d+)$/;
    const match = urls.match(regex);
    return match ? match[0] : null;
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.query;
  if (!action) {
    return res.status(400).json({
      error: "Action parameter is required"
    });
  }
  const ccmixter = new Ccmixter();
  try {
    switch (action) {
      case "search":
        const {
          query
        } = params;
        if (!query) {
          return res.status(400).json({
            error: "Query parameter is required for search"
          });
        }
        const searchResults = await ccmixter.search(query);
        return res.status(200).json(searchResults);
      case "download":
        const {
          ids
        } = params;
        if (!ids) {
          return res.status(400).json({
            error: "IDs parameter is required for download"
          });
        }
        const downloadResults = await ccmixter.download(ids);
        return res.status(200).json(downloadResults);
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}`
        });
    }
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}