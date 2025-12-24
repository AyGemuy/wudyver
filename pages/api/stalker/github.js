import axios from "axios";
import * as cheerio from "cheerio";
class GitHubStalker {
  constructor() {
    this.client = axios.create({
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36"
      },
      timeout: 3e4
    });
    console.log("[Info] GitHubStalker diinisialisasi.");
  }
  async _fetchAPI(path) {
    try {
      console.log(`[Proses] Mengambil data API dari: ${path}`);
      const response = await this.client.get(`https://api.github.com${path}`, {
        headers: {
          Accept: "application/vnd.github.v3+json"
        }
      });
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        throw new Error(`Data tidak ditemukan di API path: ${path}`);
      }
      throw new Error(`Gagal mengambil data API: ${error.message}`);
    }
  }
  async _scrapePage(username) {
    try {
      console.log(`[Proses] Melakukan scraping pada halaman profil: https://github.com/${username}`);
      const response = await this.client.get(`https://github.com/${username}`, {
        headers: {
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9"
        }
      });
      return cheerio.load(response.data);
    } catch (error) {
      throw new Error(`Gagal melakukan scraping halaman: ${error.message}`);
    }
  }
  _format(apiData, $, orgsData) {
    console.log("[Proses] Memformat semua data yang terkumpul...");
    const statusEmoji = $(".user-status-emoji-container div").first().text().trim() || null;
    const statusMessage = $(".user-status-message-wrapper div").first().text().trim() || null;
    const pinnedRepos = [];
    $("ol.js-pinned-items-reorder-list li").each((i, el) => {
      const repo = $(el).find("div.pinned-item-list-item-content");
      if (repo.length) {
        pinnedRepos.push({
          name: repo.find("span.repo").text().trim(),
          description: repo.find("p.pinned-item-desc").text().trim() || "No description",
          url: `https://github.com${repo.find("a").attr("href")}`,
          stars: parseInt(repo.find('a[href$="/stargazers"]').text().trim().replace(/,/g, "")) || 0,
          forks: parseInt(repo.find('a[href$="/forks"]').text().trim().replace(/,/g, "")) || 0,
          language: repo.find('span[itemprop="programmingLanguage"]').text().trim() || "N/A"
        });
      }
    });
    const contributionsText = $(".js-yearly-contributions h2").text().trim();
    const contributionsMatch = contributionsText.match(/(\d{1,3}(,\d{3})*|\d+)/);
    const achievements = [];
    $('img[data-hovercard-type="achievement"]').each((i, el) => {
      const name = $(el).attr("alt");
      if (name && !achievements.some(ach => ach.name === name)) {
        achievements.push({
          name: name,
          image: $(el).attr("src")
        });
      }
    });
    const socials = {};
    $("ul.vcard-details li a").each((i, el) => {
      const href = $(el).attr("href");
      if (href) {
        let key;
        if (href.includes("twitter.com")) {
          key = "twitter";
        } else if (href.includes("linkedin.com")) {
          key = "linkedin";
        } else {
          try {
            key = new URL(href).hostname.replace("www.", "").split(".")[0];
          } catch (e) {
            key = `website_${i}`;
          }
        }
        socials[key] = href;
      }
    });
    return {
      success: true,
      profile: {
        username: apiData.login,
        name: apiData.name,
        avatar: apiData.avatar_url,
        bio: apiData.bio,
        status: {
          emoji: statusEmoji,
          message: statusMessage
        },
        pronouns: $('span[itemprop="pronouns"]').text().trim() || null,
        company: apiData.company,
        location: apiData.location,
        website: apiData.blog,
        email: apiData.email,
        socials: socials,
        stats: {
          followers: apiData.followers,
          following: apiData.following,
          publicRepos: apiData.public_repos,
          publicGists: apiData.public_gists
        },
        timestamps: {
          createdAt: apiData.created_at,
          updatedAt: apiData.updated_at
        },
        urls: {
          profile: apiData.html_url,
          api: apiData.url
        }
      },
      organizations: orgsData.map(org => ({
        name: org.login,
        avatar: org.avatar_url,
        description: org.description
      })),
      contributions: {
        lastYear: contributionsMatch ? contributionsMatch[0].replace(/,/g, "") : "0"
      },
      achievements: achievements,
      pinnedRepos: pinnedRepos,
      ...apiData,
      ...orgsData
    };
  }
  async stalker({
    username
  }) {
    if (!username || typeof username !== "string") {
      console.log("[Gagal] Username harus disediakan dan berupa string.");
      return null;
    }
    try {
      const apiData = await this._fetchAPI(`/users/${username}`);
      const orgsData = await this._fetchAPI(`/users/${username}/orgs`);
      const $ = await this._scrapePage(username);
      const finalResult = this._format(apiData, $, orgsData);
      console.log(`[Sukses] Berhasil mendapatkan data untuk @${username}`);
      return finalResult;
    } catch (error) {
      console.log(`[Gagal Total] Terjadi kesalahan saat memproses @${username}: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.username) {
    return res.status(400).json({
      error: "Username are required"
    });
  }
  try {
    const api = new GitHubStalker();
    const response = await api.stalker(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}