import axios from "axios";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
import * as cheerio from "cheerio";
class GroupScraper {
  constructor() {
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar
    }));
    this.headers = {
      accept: "text/html, */*; q=0.01",
      "accept-language": "id-ID,id;q=0.9",
      "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
      origin: "https://groupsor.link",
      referer: "https://groupsor.link/group/search",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      "x-requested-with": "XMLHttpRequest"
    };
  }
  async search({
    query,
    page = 0,
    limit = 5
  }) {
    const url = `https://groupsor.link/group/searchmore/${encodeURIComponent(query)}`;
    try {
      const response = await this.client.post(url, `group_no=${page}`, {
        headers: this.headers
      });
      const rawList = this.parseGroupList(response.data);
      const total = rawList.length;
      const limitedRawList = [];
      let count = 0;
      for (const item of rawList) {
        if (count < limit) {
          limitedRawList.push(item);
          count++;
        } else {
          break;
        }
      }
      const detailedList = await Promise.all(limitedRawList.map(item => this.info(item.link)));
      const processedList = limitedRawList.map((item, index) => {
        const details = detailedList[index] || {};
        return {
          nama_grup: details.group_name || item.title || null,
          link_invite: item.invite || null,
          deskripsi: details.detail || null,
          tanggal_dibuat: details.creation_date || details.date || null,
          kategori: details.category || item.category || null,
          gambar: details.avatar || item.image || null
        };
      }).filter(item => item.nama_grup && item.link_invite);
      return {
        total: total,
        limit: limit,
        list: processedList
      };
    } catch (error) {
      console.error("Error:", error.response?.data || error.message);
      throw error;
    }
  }
  genLink(oldLink) {
    return `https://chat.whatsapp.com/invite/${oldLink.split("/").pop()}`;
  }
  parseGroupList(html) {
    const $ = cheerio.load(html);
    const results = [];
    $(".maindiv#results > div").each((_, element) => {
      const inviteLinkElement = $(element).find('a[target="_blank"][href*="/group/invite/"]');
      const link = inviteLinkElement.attr("href");
      const title = inviteLinkElement.find(".gtitle").text().trim();
      const image = inviteLinkElement.find("img.image").attr("src");
      const category = $(element).find(".post-basic-info span:first-child a").text().trim() || null;
      results.push({
        link: link,
        invite: this.genLink(link),
        title: title,
        image: image,
        category: category
      });
    });
    return results;
  }
  async info(url) {
    try {
      const {
        html
      } = await this.getLink(url);
      const $ = cheerio.load(html);
      const contactInfo = $("div.contact-info");
      const info = {};
      if (contactInfo.length) {
        info.avatar = contactInfo.find(".proimg").attr("src") || null;
        info.group_name = contactInfo.find('b[style*="font-size: 22px"]').text().trim() || null;
        info.creation_date = contactInfo.find('img[src*="date.png"]').next("span.cate").text().trim() || null;
        info.category = contactInfo.find('a.cate[href*="/category/"]').text().trim() || null;
        info.detail = contactInfo.find("pre.predesc").text().trim() || null;
      }
      info.date = $('div[style="height: 30px;text-align: center"] .cate').text().trim() || null;
      return info;
    } catch (error) {
      console.error("Info Error:", error.response?.data || error.message);
      return {};
    }
  }
  async getLink(joinLink) {
    try {
      const response = await this.client.get(joinLink, {
        headers: this.headers
      });
      return {
        html: response.data
      };
    } catch (error) {
      console.error("Link Error:", error.response?.data || error.message);
      return {};
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.query) {
    return res.status(400).json({
      error: "Query are required"
    });
  }
  try {
    const api = new GroupScraper();
    const response = await api.search(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}