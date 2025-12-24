import axios from "axios";
import crypto from "crypto";
class HScout {
  constructor() {
    this.bid = "eb7166cf-a2e7-4ad7-a86f-285a649abd85";
    this.did = this.uid();
    this.iid = this.uid();
  }
  uid() {
    return crypto.randomUUID();
  }
  hdr(cid) {
    return {
      accept: "application/json, text/plain, */*",
      "content-type": "application/json",
      "beacon-device-id": this.did,
      "beacon-device-instance-id": this.iid,
      correlationid: cid || this.uid(),
      "helpscout-origin": "Beacon-Embed",
      "helpscout-release": "2.2.292",
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Node.js"
    };
  }
  act(q, url, title, name) {
    const ts = new Date().toISOString();
    return [{
      type: "page-viewed",
      timestamp: ts,
      url: url,
      title: title
    }, {
      type: "beacon-opened",
      timestamp: ts,
      url: url,
      title: title,
      name: name
    }, {
      type: "question-asked",
      timestamp: ts,
      question: q
    }];
  }
  async chat({
    prompt,
    ...rest
  }) {
    const cid = this.uid();
    const targetUrl = rest.url || "https://docs.helpscout.com/";
    const targetTitle = rest.title || "Help Center";
    const supportName = rest.name || "Support";
    console.log(`[PROSES] Inisialisasi chat untuk: "${prompt}"`);
    try {
      const payload = {
        question: prompt,
        activity: this.act(prompt, targetUrl, targetTitle, supportName),
        docsSiteId: rest.docsSiteId,
        promptControlId: rest.promptControlId,
        externalSourceIds: rest.externalSourceIds,
        snippetIds: rest.snippetIds,
        versionId: rest.versionId,
        ...rest
      };
      console.log(`[PROSES] Mengirim request ke Beacon API...`);
      const res = await axios.post(`https://beaconapi.helpscout.net/v1/${this.bid}/ai/ask`, payload, {
        headers: this.hdr(cid)
      });
      console.log(`[SUKSES] Respon diterima dengan status: ${res?.status}`);
      return {
        answer: res?.data?.answer || "No answer provided",
        sources: res?.data?.sources || [],
        sessionId: res?.data?.sessionId || null
      };
    } catch (err) {
      const status = err?.response?.status || "NETWORK_ERROR";
      const msg = err?.response?.data?.message || err?.message || "Unknown Failure";
      console.error(`[ERROR] Gagal pada status: ${status}`);
      console.error(`[ERROR] Pesan: ${msg}`);
      throw err;
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
  const api = new HScout();
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