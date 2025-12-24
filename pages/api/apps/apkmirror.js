import axios from "axios";
import * as cheerio from "cheerio";
import apiConfig from "@/configs/apiConfig";
class ApkMirrorAPI {
  constructor() {
    this.proxy = `https://${apiConfig.DOMAIN_URL}/api/tools/web/html/v1?url=`;
  }
  async search({
    query,
    ...custom
  }) {
    try {
      const searchUrl = `https://www.apkmirror.com/?post_type=app_release&searchtype=apk&s=${encodeURIComponent(query)}`;
      const {
        data
      } = await axios.get(`${this.proxy}${encodeURIComponent(searchUrl)}`, custom);
      const $ = cheerio.load(data);
      return $(".appRow").map((_, el) => {
        const $el = $(el);
        const info = $el.next(".infoSlide");
        return {
          image: "https://www.apkmirror.com" + ($el.find(".ellipsisText").attr("src") || ""),
          link: "https://www.apkmirror.com" + ($el.find(".appRowTitle a").attr("href") || ""),
          title: $el.find(".appRowTitle a").text().trim(),
          developer: $el.find(".byDeveloper").text().trim(),
          uploadDate: $el.find(".dateyear_utc").text().trim(),
          version: info.find("p:nth-child(1) .infoSlide-value").text().trim(),
          fileSize: info.find("p:nth-child(3) .infoSlide-value").text().trim(),
          downloads: info.find("p:nth-child(4) .infoSlide-value").text().trim()
        };
      }).get().filter(obj => Object.values(obj).every(v => v));
    } catch (error) {
      console.error(`Error during search for "${query}":`, error.message);
      return [];
    }
  }
  async detail({
    url,
    ...custom
  }) {
    try {
      const {
        data
      } = await axios.get(`${this.proxy}${encodeURIComponent(url)}`, custom);
      const $ = cheerio.load(data);
      const dlBtn = $(".downloadButton").attr("href");
      const dlLink = dlBtn ? "https://www.apkmirror.com" + dlBtn : null;
      if (dlLink?.includes("#downloads")) {
        const ogUrl = $('meta[property="og:url"]').attr("content");
        const {
          data: varData
        } = await axios.get(`${this.proxy}${encodeURIComponent(ogUrl + "#downloads")}`, custom);
        const $v = cheerio.load(varData);
        const variants = [];
        $v(".variants-table .table-row.headerFont").each((i, row) => {
          if (i === 0) return;
          const $row = $v(row);
          const version = $row.find("a.accent_color").text().trim().split("\n")[0]?.trim();
          if (version) {
            variants.push({
              version: version,
              bundle: $row.find(".apkm-badge.success").eq(0).text().trim() || null,
              splits: $row.find(".apkm-badge.success").eq(1).text().trim() || null,
              apkUrl: "https://www.apkmirror.com" + ($row.find("a.accent_color").attr("href") || ""),
              downloadDate: $row.find(".dateyear_utc").data("utcdate"),
              architecture: $row.find(".table-cell.dowrap").eq(0).text().trim(),
              minVersion: $row.find(".table-cell.dowrap").eq(1).text().trim(),
              dpi: $row.find(".table-cell.dowrap").eq(2).text().trim()
            });
          }
        });
        let directLink = null;
        if (variants[0]?.apkUrl) {
          try {
            const {
              data: vData
            } = await axios.get(`${this.proxy}${encodeURIComponent(variants[0].apkUrl)}`, custom);
            const $d = cheerio.load(vData);
            const form = $d("#filedownload");
            const id = form.find('input[name="id"]').attr("value");
            const key = form.find('input[name="key"]').attr("value");
            const force = form.find('input[name="forcebaseapk"]').attr("value");
            directLink = `https://www.apkmirror.com/wp-content/themes/APKMirror/download.php?id=${id}&key=${key}${force ? `&forcebaseapk=${force}` : ""}`;
          } catch (err) {
            console.error("Could not get direct link for variant:", err.message);
          }
        }
        return {
          title: $('meta[property="og:title"]').attr("content"),
          image: $('meta[property="og:image"]').attr("content"),
          link: url,
          linkdl: directLink,
          downloadText: $(".downloadButton").text().trim(),
          author: url.split("/")[4]?.toUpperCase() || null,
          info: $(".infoSlide").text().trim(),
          description: $("#description .notes").text().trim() || $(".notes.wrapText.collapsable.collapsed").text().trim(),
          variants: variants
        };
      } else {
        const specs = {};
        $(".apk-detail-table .appspec-row").each((_, el) => {
          const label = $(el).find("svg").attr("title")?.toLowerCase() || "";
          const value = $(el).find(".appspec-value").text().trim();
          if (label && value) {
            if (label.includes("apk file size")) specs.size = value;
            else if (label.includes("upload details")) specs.tanggal = $(el).find(".datetime_utc").attr("data-utcdate");
            else if (label.includes("app: ")) specs.versionInfo = value;
            else if (label.includes("android version")) {
              specs.minAndroidVersion = value.split("Min: ")[1]?.split("Target:")[0]?.trim();
              specs.targetAndroidVersion = value.split("Target: ")[1]?.trim();
            } else if (label.includes("supported architectures")) {
              const parts = value.split("\n").map(p => p.trim()).filter(p => p);
              specs.architecture = parts[0] || null;
              specs.dpi = parts[1] || null;
            } else if (label.includes("downloads")) {
              specs.downloads = value.replace("Downloads:", "").trim();
            }
          }
        });
        const fullDescElement = $('div[role="tabpanel"][class="tab-pane "]').filter((_, el) => $(el).find('a.doc-anchor[name="description"]').length > 0).find(".notes.wrapText");
        const fullDesc = fullDescElement.length ? cheerio.load(fullDescElement.html()).text().trim() : "";
        return {
          title: $('meta[property="og:title"]').attr("content"),
          image: $('meta[property="og:image"]').attr("content"),
          link: url,
          linkdl: dlLink,
          downloadText: $(".downloadButton").text().trim(),
          author: url.split("/")[4]?.toUpperCase() || null,
          info: $(".appspec-value").first().text().trim(),
          description: fullDesc,
          ...specs
        };
      }
    } catch (error) {
      console.error(`Error fetching detail for URL "${url}":`, error.message);
      return null;
    }
  }
  async download({
    url,
    ...custom
  }) {
    const detail = await this.detail({
      url: url,
      ...custom
    });
    if (!detail?.linkdl) {
      console.warn("No initial download link found for:", url);
      return detail;
    }
    try {
      const {
        data
      } = await axios.get(`${this.proxy}${encodeURIComponent(detail.linkdl)}`, custom);
      const $ = cheerio.load(data);
      const finalUrl = $("#download-link").attr("href");
      if (finalUrl) {
        return {
          ...detail,
          finalDownloadUrl: `https://www.apkmirror.com${finalUrl}`
        };
      } else {
        console.warn("Final download link element not found for:", detail.linkdl);
        return detail;
      }
    } catch (error) {
      console.error(`Error during final download URL retrieval for "${detail.linkdl}":`, error.message);
      return detail;
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    query,
    url,
    limit,
    ...custom
  } = req.method === "GET" ? req.query : req.body;
  const apk = new ApkMirrorAPI();
  if (!action) {
    return res.status(400).json({
      error: 'Paramenter "action" wajib diisi (search, detail, atau download).'
    });
  }
  try {
    let result;
    switch (action) {
      case "search":
        if (!query) {
          return res.status(400).json({
            error: 'Paramenter "query" wajib diisi untuk pencarian.'
          });
        }
        result = await apk.search({
          query: query,
          ...custom
        });
        break;
      case "detail":
        if (!url) {
          return res.status(400).json({
            error: 'Paramenter "url" wajib diisi untuk detail.'
          });
        }
        result = await apk.detail({
          url: url,
          ...custom
        });
        break;
      case "download":
        if (!url) {
          return res.status(400).json({
            error: 'Paramenter "url" wajib diisi untuk unduhan.'
          });
        }
        result = await apk.download({
          url: url,
          ...custom
        });
        break;
      default:
        return res.status(400).json({
          error: 'Action tidak valid. Gunakan "search", "detail", atau "download".'
        });
    }
    return res.status(200).json(result);
  } catch (error) {
    console.error("API handler error:", error);
    return res.status(500).json({
      error: "Terjadi kesalahan internal server.",
      details: error.message
    });
  }
}