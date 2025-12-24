import axios from "axios";
class MediaDownloader {
  constructor() {
    this.providers = {
      instagram: {
        patterns: [/^(https?:\/\/)?(www\.)?(instagram\.com|instagr\.am)\/(p|reel|tv)\/[a-zA-Z0-9_-]+\/?/i, /^(https?:\/\/)?(www\.)?(instagram\.com|instagr\.am)\/[a-zA-Z0-9_-]+\/?/i],
        apis: ["https://ig-new-api.vercel.app/api/v1/download_media/?instagram_url=", "https://igapi.sktoolkit.com/download/?url="]
      },
      threads: {
        patterns: [/^(https?:\/\/)?(www\.)?threads\.net\/@?[a-zA-Z0-9_.-]+\/post\/\S+/i, /^(https?:\/\/)?(www\.)?threads\.net\/\S+/i],
        apis: ["https://api.threadsphotodownloader.com/v2/media?url="]
      },
      terabox: {
        patterns: [/^(https?:\/\/)?(www\.)?(terabox\.com|1024terabox\.com|teraboxapp\.com)\/s\/\S+/i, /^(https?:\/\/)?(www\.)?(terabox\.com|1024terabox\.com|teraboxapp\.com)\/\S+/i],
        apis: ["https://terabox-api-/api/proxy?terabox_url="]
      },
      youtube: {
        patterns: [/^(https?:\/\/)?(www\.|m\.)?(youtube\.com|youtu\.be|youtube\.co\.id)\/(watch\?v=|embed\/|v\/|)([\w-]{11})(.*)?/i, /^(https?:\/\/)?(www\.|m\.)?(youtube\.com|youtu\.be|youtube\.co\.id)\/\S+/i],
        apis: ["https://yt-api-ecru-three.vercel.app/api/download?url="]
      },
      tiktok: {
        patterns: [/^(https?:\/\/)?(www\.|vt\.|m\.)?tiktok\.com\/@?[a-zA-Z0-9_.]+\/video\/\d+/i, /^(https?:\/\/)?(www\.|vt\.|m\.)?tiktok\.com\/\S+/i],
        apis: ["https://tiktok-api-gamma.vercel.app/api/proxy?url="]
      },
      pinterest: {
        patterns: [/^(https?:\/\/)?(www\.|id\.)?pinterest\.com\/pin\/\d+\/?/i, /^(https?:\/\/)?(www\.|id\.)?pinterest\.com\/[a-zA-Z0-9_.-]+\/pin\/\d+\/?/i, /^(https?:\/\/)?pin\.it\/\S+/i, /^(https?:\/\/)?(www\.|id\.)?pinterest\.com\/\S+/i],
        apis: ["https://pinterest-api3.vercel.app/get_pinterest_data?url="]
      },
      spotify: {
        patterns: [/^(https?:\/\/)?(open\.)?spotify\.com\/(track|album|playlist|artist)\/[a-zA-Z0-9]+/i, /^(https?:\/\/)?(www\.)?spotify\.com\/\S+/i],
        apis: ["https://spotifyapi.nepdevsnepcoder.workers.dev/?songname="]
      },
      reddit: {
        patterns: [/^(https?:\/\/)?(www\.)?reddit\.com\/r\/[a-zA-Z0-9_]+\/comments\/\S+/i, /^(https?:\/\/)?redd\.it\/\S+/i, /^(https?:\/\/)?(www\.)?reddit\.com\/\S+/i],
        apis: ["https://redditapi.sktoolkit.com/download?url="]
      }
    };
  }
  detectProvider(url) {
    for (const [provider, config] of Object.entries(this.providers)) {
      for (const pattern of config.patterns) {
        if (pattern.test(url)) {
          return provider;
        }
      }
    }
    return null;
  }
  async download({
    url,
    query = "",
    provider = null
  }) {
    try {
      let targetProvider = null;
      if (provider) {
        const lowerCaseProvider = provider.toLowerCase();
        if (this.providers[lowerCaseProvider]) {
          targetProvider = lowerCaseProvider;
        } else {
          throw new Error(`Unsupported provider name: ${provider}`);
        }
      } else if (url) {
        targetProvider = this.detectProvider(url);
        if (!targetProvider) {
          throw new Error("Unsupported URL provider and no explicit provider name given.");
        }
      } else if (query) {
        targetProvider = "spotify";
      } else {
        throw new Error("URL, query (for Spotify), or provider is required.");
      }
      if (targetProvider === "spotify" && query) {
        const spotifyApi = this.providers.spotify.apis[0];
        const response = await axios.get(`${spotifyApi}${encodeURIComponent(query)}`, {
          timeout: 3e4,
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            Accept: "application/json, text/plain, */*",
            "Accept-Language": "en-US,en;q=0.9",
            Referer: "https://google.com"
          }
        });
        if (response.status === 200 && response.data) {
          return response.data;
        }
      }
      if (!url && targetProvider !== "spotify") {
        throw new Error(`URL is required for ${targetProvider} downloads.`);
      }
      const apis = this.providers[targetProvider].apis;
      let lastError = null;
      for (const api of apis) {
        try {
          let requestUrl = `${api}${encodeURIComponent(url)}`;
          const response = await axios.get(requestUrl, {
            timeout: 3e4,
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
              Accept: "application/json, text/plain, */*",
              "Accept-Language": "en-US,en;q=0.9",
              Referer: "https://google.com"
            }
          });
          if (response.status === 200 && response.data) {
            return response.data;
          }
        } catch (error) {
          lastError = error;
          continue;
        }
      }
      throw new Error(`All APIs failed for ${targetProvider}. Last error: ${lastError?.message || "Unknown error"}`);
    } catch (error) {
      return {
        error: error.message,
        provider: provider || this.detectProvider(url) || "unknown"
      };
    }
  }
  async downloadWithRetry({
    url,
    query = "",
    provider = null,
    maxRetries = 3
  }) {
    let attempt = 0;
    while (attempt < maxRetries) {
      try {
        const result = await this.download({
          url: url,
          query: query,
          provider: provider
        });
        if (result) {
          return result;
        }
        attempt++;
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 2e3 * attempt));
        }
      } catch (error) {
        attempt++;
        if (attempt >= maxRetries) {
          return {
            error: `Failed after ${maxRetries} attempts: ${error.message}`
          };
        }
        await new Promise(resolve => setTimeout(resolve, 2e3 * attempt));
      }
    }
  }
  getSupportedProviders() {
    return Object.keys(this.providers);
  }
  getProviderPatterns() {
    const patterns = {};
    for (const [provider, config] of Object.entries(this.providers)) {
      patterns[provider] = config.patterns.map(p => p.source);
    }
    return patterns;
  }
}
export default async function handler(req, res) {
  try {
    const params = req.method === "GET" ? req.query : req.body;
    if (!params.url) {
      return res.status(400).json({
        error: 'Paramenter "url" wajib diisi.'
      });
    }
    const downloader = new MediaDownloader();
    const result = await downloader.downloadWithRetry(params);
    return res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}