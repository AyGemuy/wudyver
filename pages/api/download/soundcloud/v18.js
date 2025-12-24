import axios from "axios";
class ScDl {
  constructor() {
    this.headers = {
      "accept-encoding": "gzip, deflate, br, zstd",
      "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1"
    };
  }
  log(msg) {
    console.log(`[scdl] ${msg}`);
  }
  fmtErr(err) {
    const MAX = 200;
    let msg = err?.response?.data || err?.message || String(err);
    if (typeof msg === "object") {
      try {
        msg = JSON.stringify(msg, null, 2);
      } catch {}
    }
    return msg.length > MAX ? `${msg.substring(0, MAX)}... (trimmed)` : msg || "(empty error)";
  }
  toMobile(urlStr) {
    const u = new URL(urlStr);
    u.host = u.host.startsWith("m.") ? u.host : `m.${u.host}`;
    return u.toString();
  }
  async getMeta(url) {
    this.log("Getting track metadata...");
    try {
      const {
        data
      } = await axios.get(url, {
        headers: this.headers
      });
      const match = data.match(/__NEXT_DATA__" type="application\/json">(.+?)<\/script\>\</)?.[1];
      if (!match) throw new Error("Metadata parsing failed");
      return JSON.parse(match);
    } catch (e) {
      throw new Error(`getMeta: ${this.fmtErr(e)}`);
    }
  }
  async getProg(json) {
    this.log("Getting progressive URL...");
    try {
      const entities = json?.props?.pageProps?.initialStoreState?.entities?.tracks || {};
      const trackData = Object.values(entities)[0]?.data;
      if (!trackData) throw new Error("Track data not found");
      const pUrl = trackData.media?.transcodings?.find(a => a.format?.protocol === "progressive")?.url;
      if (!pUrl) throw new Error("Progressive URL not found");
      const params = new URLSearchParams({
        client_id: json?.runtimeConfig?.clientId,
        track_authorization: trackData.track_authorization,
        stage: ""
      });
      const {
        data
      } = await axios.get(`${pUrl}?${params}`, {
        headers: this.headers
      });
      return {
        title: trackData.title || "Unknown Title",
        user: json.head?.find(p => p?.[1]?.name === "twitter:audio:artist_name")?.[1]?.content || "Unknown Artist",
        like: trackData.likes_count || 0,
        comment: trackData.comment_count || 0,
        imageUrl: trackData.artwork_url?.replace("large", "t1080x1080") || "",
        audioUrl: data?.url,
        ...trackData
      };
    } catch (e) {
      throw new Error(`getProg: ${this.fmtErr(e)}`);
    }
  }
  async download({
    url,
    ...rest
  }) {
    try {
      if (!url) throw new Error("URL is required");
      const mobileUrl = this.toMobile(url);
      const meta = await this.getMeta(mobileUrl);
      const result = await this.getProg(meta);
      this.log("Success");
      return result;
    } catch (e) {
      this.log(this.fmtErr(e));
      return null;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "Parameter 'url' diperlukan"
    });
  }
  const api = new ScDl();
  try {
    const data = await api.download(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}