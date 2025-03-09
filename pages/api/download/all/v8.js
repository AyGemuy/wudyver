import axios from "axios";
import { CookieJar } from "tough-cookie";
import { wrapper } from "axios-cookiejar-support"; // Import axios-cookiejar-support wrapper

class AllDownloader {
  constructor(host = 1) {
    this.BASE_URLS = {
      1: "https://steptodown.com/wp-json/aio-dl/video-data/",
      2: "https://saveclips.net/wp-json/aio-dl/video-data/",
      3: "https://snapfrom.com/wp-json/aio-dl/video-data/",
      4: "https://smediasaver.com/wp-json/aio-dl/video-data/",
      5: "https://vidburner.com/wp-json/aio-dl/video-data/",
      6: "https://mrsdownloader.com/wp-json/aio-dl/video-data/",
      7: "https://snapsave.cc/wp-json/aio-dl/video-data/",
      8: "https://1videodownloader.com/wp-json/aio-dl/video-data/",
      9: "https://capdownloader.com/wp-json/aio-dl/video-data/",
      10: "https://snapdouyin.app/wp-json/mx-downloader/video-data/",
      11: "https://scdler.com/wp-json/aio-dl/video-data/"
    };
    this.totalHosts = Object.keys(this.BASE_URLS).length;
    const validHost = Math.min(Math.max(host, 1), this.totalHosts);
    this.BASE_URL = this.BASE_URLS[validHost];
    
    // Create a new CookieJar instance to store cookies
    this.jar = new CookieJar();

    // Create an axios instance wrapped with cookie jar support
    this.axiosInstance = wrapper(
      axios.create({
        jar: this.jar, // Use the cookie jar
        withCredentials: true, // Ensure credentials are sent along with requests
        headers: {
          "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
        }
      })
    );
  }

  async download(url) {
    try {
      const response = await this.axiosInstance.post(this.BASE_URL, {
        url: url
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching video data:", error.response ? error.response.data : error.message);
      throw error;
    }
  }
}

export default async function handler(req, res) {
  const { url, host } = req.method === "GET" ? req.query : req.body;
  
  if (!url) {
    return res.status(400).json({
      error: "URL parameter is required"
    });
  }
  
  const hostInt = host ? parseInt(host) : 1;
  const downloader = new AllDownloader(hostInt);
  
  if (hostInt < 1 || hostInt > downloader.totalHosts) {
    return res.status(400).json({
      error: `Host must be between 1 of ${downloader.totalHosts}.`
    });
  }

  try {
    const result = await downloader.download(url);
    return res.status(200).json({
      result: result
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: error.message
    });
  }
}
