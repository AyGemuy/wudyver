import axios from "axios";
import {
  randomUUID
} from "crypto";
class FakeYouAPI {
  constructor() {
    this.baseURL = "https://api.fakeyou.com";
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        accept: "application/json",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
        origin: "https://fakeyou.com",
        referer: "https://fakeyou.com/"
      }
    });
  }
  async search({
    query,
    sort = "match_score",
    category = "text_to_speech"
  }) {
    try {
      const res = await this.client.get("/v1/weights/search", {
        params: {
          sort_field: sort,
          search_term: query,
          weight_category: category
        }
      });
      console.log("Search response:", res.data);
      return res.data;
    } catch (error) {
      console.error("Search error:", error?.response?.data || error.message);
      throw error;
    }
  }
  async create({
    model_token = "weight_kecvvgfwe197k75pfvhn7bnxc",
    text,
    maxWait = 6e4,
    interval = 3e3
  }) {
    try {
      const uuid = randomUUID();
      const createRes = await this.client.post("/tts/inference", {
        uuid_idempotency_token: uuid,
        tts_model_token: model_token,
        inference_text: text
      }, {
        headers: {
          "content-type": "application/json"
        }
      });
      console.log("Create response:", createRes.data);
      const job_token = createRes.data.inference_job_token;
      const start = Date.now();
      while (true) {
        const pollRes = await this.client.get(`/v1/model_inference/job_status/${job_token}`);
        console.log("Polling status:", pollRes.data?.state?.status?.status);
        const state = pollRes.data?.state;
        const status = state?.status?.status;
        if (status === "complete_success" && state?.maybe_result?.media_links?.cdn_url) {
          console.log("Polling success:", pollRes.data);
          return pollRes.data;
        }
        if (["dead", "error", "canceled"].includes(status)) {
          throw new Error(`Job failed with status: ${status}`);
        }
        if (Date.now() - start > maxWait) {
          throw new Error("Polling timed out");
        }
        await new Promise(r => setTimeout(r, interval));
      }
    } catch (error) {
      console.error("createAndPoll error:", error?.response?.data || error.message);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!action) {
    return res.status(400).json({
      error: "Missing required field: action",
      required: {
        action: "search | create"
      }
    });
  }
  const fakeyou = new FakeYouAPI();
  try {
    let result;
    switch (action) {
      case "search":
        if (!params.query) {
          return res.status(400).json({
            error: `Missing required field: query (required for ${action})`
          });
        }
        result = await fakeyou[action](params);
        break;
      case "create":
        if (!params.text) {
          return res.status(400).json({
            error: `Missing required field: text (required for ${action})`
          });
        }
        result = await fakeyou[action](params);
        break;
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}. Allowed: search | create`
        });
    }
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: `Processing error: ${error.message}`
    });
  }
}