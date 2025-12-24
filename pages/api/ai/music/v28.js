import {
  EventSource
} from "eventsource";
import axios from "axios";
class AceStep {
  constructor() {
    this.base = "https://ace-step-ace-step.hf.space";
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID",
      "content-type": "application/json",
      origin: "https://ace-step-ace-step.hf.space",
      referer: "https://ace-step-ace-step.hf.space/",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
  }
  hash() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }
  async generate({
    prompt,
    duration,
    ...rest
  }) {
    try {
      const task_id = this.hash();
      console.log(`[generate] task_id: ${task_id}`);
      const payload = {
        data: [duration || 174.28, prompt, rest.lyrics || "", rest.infer_step || 60, rest.guidance_scale || 15, rest.scheduler || "euler", rest.cfg_type || "apg", rest.omega_scale || 10, rest.seed || Math.floor(Math.random() * 1e10).toString(), rest.guidance_interval || .5, rest.guidance_interval_decay || 0, rest.min_guidance_scale || 3, rest.use_erg_tag ?? true, rest.use_erg_lyric ?? true, rest.use_erg_diffusion ?? true, rest.oss_steps || "", rest.guidance_scale_text || 0, rest.guidance_scale_lyric || 0, rest.audio2audio_enable ?? false, rest.ref_audio_strength || .5, rest.ref_audio_input || null, rest.lora || "none"],
        event_data: null,
        fn_index: 11,
        trigger_id: Math.floor(Math.random() * 100),
        session_hash: task_id
      };
      await axios.post(`${this.base}/gradio_api/queue/join?`, payload, {
        headers: this.headers
      });
      console.log(`[generate] queued`);
      return {
        task_id: task_id
      };
    } catch (e) {
      console.error(`[generate] error:`, e?.message || e);
      throw e;
    }
  }
  async status({
    task_id,
    ...rest
  }) {
    return new Promise((resolve, reject) => {
      try {
        const url = `${this.base}/gradio_api/queue/data?session_hash=${task_id}`;
        console.log(`[status] connecting: ${url}`);
        const es = new EventSource(url);
        let result = null;
        es.on("message", e => {
          try {
            const d = JSON.parse(e?.data || "{}");
            console.log(`[status] msg: ${d?.msg}`);
            if (d?.msg === "process_completed") {
              result = d?.output || d;
              console.log(`[status] completed: ${result}`);
              es.close();
              resolve(result);
            } else if (d?.msg === "process_starts") {
              console.log(`[status] processing, eta: ${d?.eta}s`);
            } else if (d?.msg === "estimation") {
              console.log(`[status] queue: ${d?.rank}/${d?.queue_size}, eta: ${d?.rank_eta}s`);
            }
          } catch (err) {
            console.error(`[status] parse error:`, err?.message || err);
          }
        });
        es.on("error", err => {
          console.error(`[status] stream error:`, err?.message || err);
          es.close();
          reject(err);
        });
        setTimeout(() => {
          if (!result) {
            console.log(`[status] timeout`);
            es.close();
            reject(new Error("timeout"));
          }
        }, (rest.timeout || 300) * 1e3);
      } catch (e) {
        console.error(`[status] error:`, e?.message || e);
        reject(e);
      }
    });
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!action) {
    return res.status(400).json({
      error: "Paramenter 'action' wajib diisi."
    });
  }
  const api = new AceStep();
  try {
    let response;
    switch (action) {
      case "generate":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Paramenter 'prompt' wajib diisi untuk action 'generate'."
          });
        }
        response = await api.generate(params);
        break;
      case "status":
        if (!params.task_id) {
          return res.status(400).json({
            error: "Paramenter 'task_id' wajib diisi untuk action 'status'."
          });
        }
        response = await api.status(params);
        break;
      default:
        return res.status(400).json({
          error: `Action tidak valid: ${action}. Action yang didukung: 'generate' dan 'status'.`
        });
    }
    return res.status(200).json(response);
  } catch (error) {
    console.error(`[FATAL ERROR] Kegagalan pada action '${action}':`, error);
    return res.status(500).json({
      error: error.message || "Terjadi kesalahan internal pada server."
    });
  }
}