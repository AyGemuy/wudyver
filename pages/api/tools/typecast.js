import fetch from "node-fetch";
class Typecast {
  constructor() {
    this.tokenUrl = Buffer.from("aHR0cHM6Ly9zZWN1cmV0b2tlbi5nb29nbGVhcGlzLmNvbS92MS90b2tlbj9rZXk9QUl6YVN5QkpOM1pZZHpUbWp5UUotOVRkcGlrYnNaRFQ5SlVBWUZr", "base64").toString("utf-8");
    this.StyleLabel = "normal-1";
    this.headers = {
      "X-Client-Version": "Chrome/JsCore/10.11.1/FirebaseCore-web",
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36",
      Referer: "https://typecast.ai/text-to-speech"
    };
  }
  async refreshToken() {
    try {
      const response = await fetch(this.tokenUrl, {
        method: "POST",
        headers: this.headers,
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: Buffer.from("QU1mLXZCd2xrTXBqMWpQTzNFdF95QTZnNUt4YmxfVTJXeVZqSkdtUmRtbFh0Vko0OXZUcXhRZUgwWmxETGxSSl91TlNKYVJ5d1VLQ0ljYUdlN0JuTkgwb0pETlpYNmVuS2VGWnFTaFBxZWpmdUhBaHF5R2dPUzRWMk02REUwNGRLQmJtUmdmQnZXdWJZU0U3RGdjOHVWR0lQaEJwR2xrRWF0dlFNXzlWMkM2SU04bE5OQ3lLWEFwSEFzX04xQms1SzQyVkU0Z0o1WDJFTE5PampPNjRHRWxlQlBvTXlrVWlNNlNnSGdIcVNmNEV4Z2k4Vmpzbmd4d05WNl9Id19lVkV3MWExVC1YYjItT0hkZl9LNXFEbUxwTnRJY05OVkZOdk1ZWUt3aHdiTlk1bGJoZ05MT19WOHMtcHVITlZxTExScncyNm1tb05lSzU=", "base64").toString("utf-8")
        })
      });
      const data = await response.json();
      return data.id_token;
    } catch (error) {
      console.error("Error refreshing token:", error);
    }
  }
  async create(text, actor_id = this.ActorId, style_label = this.StyleLabel, type = "high", max_seconds = 60, naturalness = .8, speed_x = 1, tempo = 1, pitch = 0) {
    const postUrl = "https://typecast.ai/api/speak/batch/post";
    const getUrl = "https://typecast.ai/api/speak/batch/get";
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${await this.refreshToken()}`,
      "User-Agent": "Mozilla/5.0"
    };
    const bodyPost = JSON.stringify([{
      actor_id: actor_id,
      text: text,
      scriptId: "g1zXLDP-or4MpcrQqxi8z",
      style_label: style_label,
      style_label_version: "v3",
      lang: "auto",
      force_length: "0",
      max_seconds: max_seconds,
      naturalness: naturalness,
      speed_x: speed_x,
      tempo: tempo,
      pitch: pitch,
      mode: "one-vocoder",
      retake: true
    }]);
    try {
      const postResponse = await fetch(postUrl, {
        method: "POST",
        headers: headers,
        body: bodyPost
      });
      const {
        result: {
          speak_urls
        }
      } = await postResponse.json();
      const speakUrl = speak_urls[0];
      let status = "processing",
        getData;
      while (status !== "done") {
        await new Promise(r => setTimeout(r, 3e3));
        const getResponse = await fetch(getUrl, {
          method: "POST",
          headers: headers,
          body: JSON.stringify([speakUrl])
        });
        getData = await getResponse.json();
        status = getData.result[0]?.status || "processing";
      }
      const audioUrl = getData.result[0]?.audio?.[type]?.url;
      const audioResponse = await fetch(`${audioUrl}/cloudfront`, {
        headers: headers
      });
      const audioJson = await audioResponse.json();
      const audioBufferResponse = await fetch(audioJson.result, {
        headers: headers
      });
      return Buffer.from(await audioBufferResponse.arrayBuffer());
    } catch (error) {
      console.error("Error generating audio:", error);
      return error.message;
    }
  }
  async actor(page = 1, limit = 1) {
    try {
      const token = await this.refreshToken();
      const response = await fetch(`https://typecast.ai/api/actor-packages?language=en&has_keyword=1&limit=${limit}&page=${page}`, {
        method: "GET",
        headers: {
          Accept: "application/json, text/plain, */*",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36",
          Referer: "https://typecast.ai/voice-casting"
        }
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error fetching actor data:", error);
    }
  }
}
export default async function handler(req, res) {
  const {
    method
  } = req;
  const {
    text,
    actor_id,
    style_label,
    type,
    max_seconds,
    naturalness,
    speed_x,
    tempo,
    pitch,
    page,
    limit
  } = req.method === "GET" ? req.query : req.body;
  const typecast = new Typecast();
  if (method === "GET") {
    if (text) {
      try {
        const audioBuffer = await typecast.create(text, actor_id, style_label, type, max_seconds, naturalness, speed_x, tempo, pitch);
        res.setHeader("Content-Type", "audio/mp3");
        return res.status(200).send(audioBuffer);
      } catch (error) {
        res.status(500).json({
          message: "Error generating audio",
          error: error
        });
      }
    } else if (page && limit) {
      try {
        const actorData = await typecast.actor(page, limit);
        return res.status(200).json(actorData);
      } catch (error) {
        res.status(500).json({
          message: "Error fetching actor data",
          error: error
        });
      }
    } else {
      res.status(400).json({
        message: "Missing required parameters."
      });
    }
  } else {
    res.status(405).json({
      message: "Method Not Allowed"
    });
  }
}