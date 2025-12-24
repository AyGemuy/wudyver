import axios from "axios";
import * as cheerio from "cheerio";
class SynkScraper {
  constructor(source = "npm") {
    this.source = source;
  }
  async search(query) {
    if (!query) {
      throw new Error("Paramenter 'query' tidak boleh kosong.");
    }
    const url = `https://snyk.io/advisor/search?source=${this.source}&q=${query}`;
    try {
      const {
        data
      } = await axios.get(url);
      const $ = cheerio.load(data);
      const results = [];
      $(".search-results .package").each((_, element) => {
        const packageName = $(element).find("h3").text().trim();
        const packageLink = $(element).find("a").attr("href");
        const rawVersionText = $(element).find(".package-history").text().trim();
        const versionMatch = rawVersionText.match(/^(\S+)/);
        const publishInfoMatch = rawVersionText.match(/published.+/);
        const version = versionMatch ? versionMatch[1] : null;
        const publishInfo = publishInfoMatch ? publishInfoMatch[0] : null;
        const avatar = $(element).find("img").attr("src");
        results.push({
          packageName: packageName,
          packageLink: `https://snyk.io${packageLink}`,
          version: version || "Tidak tersedia",
          publishInfo: publishInfo || "Tidak tersedia",
          avatar: avatar || "https://via.placeholder.com/150"
        });
      });
      return results;
    } catch (error) {
      throw new Error(`Gagal melakukan pencarian: ${error.message}`);
    }
  }
  async detail(url) {
    if (!url) {
      throw new Error("Paramenter 'url' tidak boleh kosong.");
    }
    try {
      const {
        data
      } = await axios.get(url);
      const $ = cheerio.load(data);
      const latestVersion = $('.item:contains("Latest version published")').text().trim();
      const license = $('.item:contains("License")').text().trim();
      const npmLink = $('a[href^="https://www.npmjs.com/package/"]').attr("href");
      const installCommand = $(".vue--copy-to-clipboard__input").val();
      const stats = {
        age: $('.stats-item:contains("Age") dd span').text().trim(),
        dependencies: $('.stats-item:contains("Dependencies") dd span').text().trim(),
        versions: $('.stats-item:contains("Versions") dd span').text().trim(),
        installSize: $('.stats-item:contains("Install Size") dd span').text().trim(),
        distTags: $('.stats-item:contains("Dist-tags") dd span').text().trim(),
        numberOfFiles: $('.stats-item:contains("# of Files") dd span').text().trim(),
        maintainers: $('.stats-item:contains("Maintainers") dd span').text().trim(),
        tsTypings: $('.stats-item:contains("TS Typings") dd span').text().trim(),
        packageHealthScore: $(".health .number span").text().trim(),
        securityStatus: $("#security .vue--pill__body").first().text().trim()
      };
      const githubStats = {
        githubStars: $('.stats-item:contains("GitHub Stars") dd span').text().trim(),
        forks: $('.stats-item:contains("Forks") dd span').text().trim(),
        openIssues: $('.stats-item:contains("Open Issues") dd span').text().trim(),
        openPRs: $('.stats-item:contains("Open PR") dd span').text().trim(),
        lastRelease: $('.stats-item:contains("Last Release") dd span').text().trim()
      };
      const allVersionsLink = $(".all-versions").attr("href");
      const versionData = [];
      $(".vue--security-severity-table tr").each((_, element) => {
        const version = $(element).find("td a").first().text().trim();
        const vulnerabilities = $(element).find("td").eq(4).find(".vue--severity__count span").text().trim();
        const licenseRisk = $(element).find("td").eq(5).find(".vue--severity__count span").text().trim();
        const severityCounts = $(element).find("td").eq(4).find("ul.vue--severity li");
        const severityData = {
          critical: 0,
          high: 0,
          medium: 0,
          low: 0
        };
        severityCounts.each((_, li) => {
          const severityLabel = $(li).find("abbr").attr("title");
          const count = $(li).find(".vue--severity__count span").text().trim();
          if (severityLabel.includes("Critical")) severityData.critical = count;
          else if (severityLabel.includes("High")) severityData.high = count;
          else if (severityLabel.includes("Medium")) severityData.medium = count;
          else if (severityLabel.includes("Low")) severityData.low = count;
        });
        if (version) versionData.push({
          version: version,
          vulnerabilities: vulnerabilities,
          licenseRisk: licenseRisk,
          severityData: severityData
        });
      });
      const result = {
        latestVersion: latestVersion,
        license: license,
        npmLink: npmLink,
        installCommand: installCommand,
        stats: stats,
        githubStats: githubStats,
        allVersionsLink: allVersionsLink,
        versionData: versionData
      };
      return result;
    } catch (error) {
      throw new Error(`Gagal mengambil detail: ${error.message}`);
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    query,
    url,
    source
  } = req.query;
  const scraper = new SynkScraper(source || "npm");
  try {
    if (action === "search") {
      if (!query) return res.status(400).json({
        error: "Paramenter 'query' diperlukan untuk pencarian."
      });
      const results = await scraper.search(query);
      return res.status(200).json(results);
    }
    if (action === "detail") {
      if (!url) return res.status(400).json({
        error: "Paramenter 'url' diperlukan untuk detail."
      });
      const details = await scraper.detail(url);
      return res.status(200).json(details);
    }
    res.status(400).json({
      error: "Aksi tidak valid. Gunakan 'search' atau 'detail'."
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}