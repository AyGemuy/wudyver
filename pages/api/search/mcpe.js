import axios from "axios";
import * as cheerio from "cheerio";
const mcpedlList = async (page = 1) => {
  try {
    const {
      data
    } = await axios.get(`https://mcpedl.org/downloading/page/${page}`);
    const $ = cheerio.load(data);
    const result = [];
    $("article.tease.tease-post > section.entry-header-category").each(function() {
      const $$ = $(this);
      result.push({
        thumbnail: $$.find("a.post-thumbnail > picture > img").attr("data-src"),
        title: $$.find("h2.entry-title").text().trim(),
        id: $$.find("h2.entry-title > a").attr("href").split("/").at(-2)
      });
    });
    return result;
  } catch (error) {
    if (error?.response?.status === 404) {
      return {
        error: true,
        message: "Page Not Found"
      };
    }
    throw error;
  }
};
const mcpedlDownload = async id => {
  try {
    const response = await axios.get(`https://mcpedl.org/${id}`);
    const $ = cheerio.load(response.data);
    const downloadLink = $("#download-link > table > tbody > tr > td > a").attr("href");
    if (!downloadLink) throw new Error("Download link not found");
    const downloadId = downloadLink.split("/").at(-1);
    const downloadResponse = await axios.get(`https://mcpedl.org/dw_file.php?id=${downloadId}`);
    const _$ = cheerio.load(downloadResponse.data);
    const actualDownloadLink = _$("a").attr("href");
    if (!actualDownloadLink) throw new Error("Actual download link not found");
    const version = $("#download-link > table > tbody > tr > td:nth-child(1)").text().trim();
    const size = $(".entry-footer > .entry-footer-wrapper > .entry-footer-column > .entry-footer-content > span:last-child").text().trim();
    return {
      url: actualDownloadLink,
      version: version,
      size: size
    };
  } catch (error) {
    console.error("Error fetching data:", error);
    throw error;
  }
};
export default async function handler(req, res) {
  const {
    action,
    page,
    id
  } = req.method === "GET" ? req.query : req.body;
  try {
    if (!action) {
      return res.status(400).json({
        error: "Action parameter is required"
      });
    }
    switch (action) {
      case "list": {
        const pageNum = parseInt(page, 10) || 1;
        const list = await mcpedlList(pageNum);
        return res.status(200).json(list);
      }
      case "download": {
        if (!id) {
          return res.status(400).json({
            error: "ID parameter is required for download"
          });
        }
        const download = await mcpedlDownload(id);
        return res.status(200).json(download);
      }
      default:
        return res.status(400).json({
          error: "Invalid action"
        });
    }
  } catch (error) {
    return res.status(500).json({
      error: "Internal server error",
      details: error.message
    });
  }
}