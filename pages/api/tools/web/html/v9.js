import axios from "axios";
class Web2Zip {
  constructor() {
    this.url = "https://web2zip.com/get.php";
    this.baseUrl = "https://web2zip.com/";
    this.headers = {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      Accept: "*/*",
      "X-Requested-With": "XMLHttpRequest",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Mobile Safari/537.36",
      Referer: "https://web2zip.com/"
    };
  }
  generateTemplate(length = 10) {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    return Array.from({
      length: length
    }, () => characters[Math.floor(Math.random() * characters.length)]).join("");
  }
  async getZip(url, file = "index") {
    const template = this.generateTemplate();
    const data = new URLSearchParams({
      url: url,
      file: file,
      template: template
    });
    try {
      const response = await axios.post(this.url, data, {
        headers: this.headers
      });
      const result = response.data.startsWith("templates/") ? this.baseUrl + response.data : response.data;
      return result.startsWith(this.baseUrl) ? (await axios.get(result)).data : result;
    } catch (error) {
      console.error("Error fetching data:", error);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const {
    url,
    file
  } = req.method === "GET" ? req.query : req.body;
  if (!url) {
    return res.status(400).send("URL is required");
  }
  try {
    const web = new Web2Zip();
    const result = await web.getZip(url, file);
    res.setHeader("Content-Type", "text/html");
    return res.status(200).send(result);
  } catch (error) {
    res.status(500).send(error.message);
  }
}