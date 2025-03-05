import axios from "axios";
class AxiosClient {
  constructor() {
    this.baseUrls = {
      1: "https://thingproxy.freeboard.io/fetch/",
      2: "https://api.codetabs.com/v1/proxy/?quest=",
      3: "https://api.allorigins.win/get?url=",
      4: "https://imageprompt.org/api/image/proxy?url=",
      5: "https://files.xianqiao.wang/",
      6: "https://api.fsh.plus/html?url="
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
  async fetchData(queryHost = 1, url) {
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
    const result = await client.fetchData(host || 1, url);
    res.setHeader("Content-Type", "text/html");
    return res.status(200).send(result);
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}