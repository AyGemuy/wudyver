import axios from "axios";
import {
  randomUUID
} from "crypto";
class CiciAI {
  constructor() {
    this.botId = "7241547611541340167";
    this.senderId = "7584067883349640200";
    this.conversationId = "485805516280081";
    this.aid = "489823";
  }
  rnd() {
    return Math.floor(Math.random() * 1e17) + 1;
  }
  hex() {
    return Math.floor(Math.random() * 1e17).toString(16);
  }
  str() {
    return Math.random().toString(36).slice(2, 9);
  }
  parse(raw) {
    try {
      console.log("Parsing response...");
      const result = [];
      const sources = [];
      const dataRgx = /data:\s*(\{[^}]+\})/g;
      const originRgx = /"origin_content"\s*:\s*"([^"]+)"/g;
      let m;
      while (m = dataRgx.exec(raw)) {
        try {
          const json = JSON.parse(m[1]);
          const body = json?.downlink_body?.fetch_chunk_message_downlink_body;
          const content = body?.content ? JSON.parse(body.content) : null;
          const tags = content?.text_tags || [];
          tags.forEach(tag => {
            const info = JSON.parse(tag?.tag_info || "{}");
            if (info?.url && info?.title) {
              sources.push({
                url: info.url,
                title: info.title
              });
            }
          });
        } catch {}
      }
      while (m = originRgx.exec(raw)) {
        result.push(m[1]);
      }
      return {
        chat: result.join("") || "No response",
        sources: sources.length ? sources : []
      };
    } catch (error) {
      console.error("Parse error:", error?.message);
      return {
        chat: "",
        sources: []
      };
    }
  }
  async chat({
    prompt,
    nickname = "Alex Chen",
    voiceId = "92",
    ...rest
  }) {
    try {
      if (!prompt) throw new Error("Prompt required");
      console.log("Sending request...");
      const random = this.rnd();
      const cdid = "2" + this.hex().padStart(23, "0");
      const uid = this.rnd();
      const iid = this.rnd();
      const deviceId = this.rnd();
      const timestamp = Math.floor(Date.now() / 1e3);
      const {
        data
      } = await axios.post("https://api-normal-i18n.ciciai.com/im/sse/send/message", {
        channel: 3,
        cmd: 100,
        sequence_id: randomUUID(),
        uplink_body: {
          send_message_body: {
            ack_only: false,
            applet_payload: {},
            bot_id: this.botId,
            bot_type: 1,
            client_controller_param: {
              answer_with_suggest: true,
              local_language_code: rest?.lang || "en",
              local_nickname: nickname,
              local_voice_id: voiceId
            },
            content: JSON.stringify({
              im_cmd: -1,
              text: prompt
            }),
            content_type: 1,
            conversation_id: this.conversationId,
            conversation_type: 3,
            create_time: timestamp,
            ext: {
              create_time_ms: Date.now().toString(),
              record_status: "1",
              wiki: "1",
              search_engine_type: "1",
              media_search_type: "0",
              answer_with_suggest: "1",
              system_language: rest?.lang || "en",
              enter_method_trace: "",
              previous_page_trace: "",
              is_audio: "false",
              voice_mix_input: "0",
              tts: "1",
              ugc_plugin_auth_infos: "[]",
              is_app_background: "0",
              is_douyin_installed: "0",
              is_luna_installed: "0",
              media_player_business_scene: "",
              need_deep_think: "0",
              need_net_search: "0",
              send_message_scene: "keyboard"
            },
            client_fallback_param: {
              last_section_id: "",
              last_message_index: -1
            },
            local_message_id: this.hex(),
            sender_id: this.senderId,
            status: 0,
            unique_key: this.hex()
          }
        },
        version: "1"
      }, {
        params: {
          flow_im_arch: "v2",
          device_platform: "android",
          os: "android",
          ssmix: "a",
          _rticket: random,
          cdid: cdid,
          channel: "googleplay",
          aid: this.aid,
          app_name: "nova_ai",
          version_code: this.rnd() % 1e6,
          version_name: this.str(),
          manifest_version_code: this.rnd() % 1e6,
          update_version_code: this.rnd() % 1e6,
          resolution: `${this.rnd() % 2e3 + 720}x${this.rnd() % 3e3 + 1280}`,
          dpi: this.rnd() % 500 + 200,
          device_type: `SM-${this.str().toUpperCase()}`,
          device_brand: "samsung",
          language: rest?.lang || "en",
          os_api: this.rnd() % 20 + 28,
          os_version: `${this.rnd() % 5 + 10}.0`,
          ac: "wifi",
          uid: uid,
          carrier_region: rest?.region || "ID",
          sys_region: rest?.sysRegion || "US",
          tz_name: rest?.timezone || "Asia/Jakarta",
          is_new_user: "1",
          region: rest?.sysRegion || "US",
          lang: rest?.lang || "en",
          pkg_type: "release_version",
          iid: iid,
          device_id: deviceId,
          flow_sdk_version: this.rnd() % 1e6,
          "use-olympus-account": "1"
        },
        headers: {
          "Accept-Encoding": "gzip",
          Connection: "Keep-Alive",
          "Content-Type": "application/json; encoding=utf-8",
          Host: "api-normal-i18n.ciciai.com",
          "passport-sdk-version": "505174",
          req_biz_id: "Message",
          "sdk-version": "2",
          "User-Agent": `com.larus.wolf/${this.rnd() % 9e6 + 8e6} (Linux; U; Android 12; en_US; SM-${this.str().toUpperCase()}; Build/SP1A.210812.016;tt-ok/3.12.13.18)`,
          "x-tt-store-region": (rest?.region || "id").toLowerCase(),
          "x-tt-store-region-src": "uid",
          "X-Tt-Token": rest?.token || "0329aceacb51f4b2d468e8709307dcc44604a72f48ba71143b3403209f8f98cf37f4111f4fe8bac693d57dd0580c0e13a32d8d230813a3064feaf53b9d8fd9e5ae0256d50c4b29427687873645bd92d3b842a-1.0.0"
        }
      });
      console.log("Processing response...");
      return this.parse(data);
    } catch (error) {
      console.error("Request error:", error?.message);
      throw new Error(error?.response?.data?.message || error?.message || "Request failed");
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Parameter 'prompt' diperlukan"
    });
  }
  const api = new CiciAI();
  try {
    const data = await api.chat(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}