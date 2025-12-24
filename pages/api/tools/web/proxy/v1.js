import axios from "axios";
class AxiosClient {
  constructor() {
    this.baseUrls = {
      1: "https://thingproxy.freeboard.io/fetch/",
      2: "https://api.codetabs.com/v1/proxy/?quest=",
      3: "https://api.allorigins.win/get?url=",
      4: "https://imageprompt.org/api/image/proxy?url=",
      5: "https://files.xianqiao.wang/",
      6: "https://api.fsh.plus/html?url=",
      7: "https://akinator.jack04309487.workers.dev/",
      8: "https://cors.caliph.my.id/",
      9: "https://proxy.it-mohmmed.workers.dev/?url=",
      10: "https://proxy.khacmanh-info.workers.dev/?url=",
      11: "https://proxy.khacdat-info.workers.dev/?url=",
      12: "https://proxy.nkm1703.workers.dev/?url=",
      13: "https://proxy.uneti-it.workers.dev/?url=",
      14: "https://proxy.teamvn1235.workers.dev/?url=",
      15: "https://proxy.zeronightpro.workers.dev/?url=",
      16: "https://proxy.manhrit.workers.dev/?url=",
      17: "https://proxy.cskh-n8n.workers.dev/?url=",
      18: "https://proxy.manhnguyenict.workers.dev/?url=",
      19: "https://proxy.nguyenmanhict.workers.dev/?url=",
      20: "https://proxy.cskh-zm.workers.dev/?url=",
      21: "https://proxy.tgb6jphrx7.workers.dev/?url=",
      22: "https://proxy.manhict.workers.dev/?url=",
      23: "https://bypass.manhgdev.workers.dev/?url=",
      24: "https://cors.vaportrade.net/",
      25: "https://cors.luckydesigner.workers.dev/?",
      26: "https://cors.eu.org/",
      27: "https://cors.niceeli.workers.dev/?",
      28: "https://cors.bbear.workers.dev/?",
      29: "https://rv.lil-hacker.workers.dev/proxy?url="
    };
  }
  addHost(key, url) {
    this.baseUrls[key] = url;
  }
  removeHost(key) {
    delete this.baseUrls[key];
  }
  getHosts() {
    return this.baseUrls;
  }
  async fetchData(queryHost = 26, url) {
    const baseUrl = this.baseUrls[queryHost] || this.baseUrls[1];
    if (!baseUrl) throw new Error("Invalid host query");
    try {
      const response = await axios.get(`${baseUrl}${url}`);
      return response.data;
    } catch (error) {
      throw new Error("Failed to fetch data");
    }
  }
}
export default async function handler(req, res) {
  const {
    url,
    host
  } = req.query;
  if (!url) {
    return res.status(400).json({
      error: "URL is required"
    });
  }
  const client = new AxiosClient();
  try {
    const result = await client.fetchData(host || 23, url);
    res.setHeader("Content-Type", "text/html");
    return res.status(200).send(result);
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}