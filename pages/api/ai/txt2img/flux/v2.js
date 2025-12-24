import axios from "axios";
const endpoints = ["generate_image", "RealtimeFlux", "generate_image_1", "realtime_generation", "realtime_generation_1", "realtime_generation_2", "realtime_generation_3"];
const buildPayload = (endpoint, prompt, width, height) => {
  const basePayloads = {
    generate_image: [prompt, 3, width, height],
    RealtimeFlux: [prompt, 3, width, height, true, 1],
    generate_image_1: [prompt, 3, width, height, true, 1],
    realtime_generation: [true, prompt, 3, width, height, true, 1],
    realtime_generation_1: [true, prompt, 3, width, height, true, 1],
    realtime_generation_2: [true, prompt, 3, width, height, true, 1],
    realtime_generation_3: [true, prompt, 3, width, height, true, 1]
  };
  return basePayloads[endpoint];
};
const fetchResult = async (endpoint, prompt, width, height) => {
  try {
    const url = `https://kingnish-realtime-flux.hf.space/call/${endpoint}`;
    const payload = buildPayload(endpoint, prompt, width, height);
    const {
      data: response
    } = await axios.post(url, {
      data: payload
    }, {
      headers: {
        "Content-Type": "application/json"
      }
    });
    const eventId = response[0] || null;
    if (!eventId) return {
      endpoint: endpoint,
      status: "error",
      message: "Invalid Event ID"
    };
    let status = "pending",
      result = null;
    while (status === "pending") {
      const {
        data: pollResponse
      } = await axios.get(`${url}/${eventId}`);
      status = pollResponse.status || "pending";
      result = pollResponse.data || null;
      if (status === "pending") await new Promise(r => setTimeout(r, 2e3));
    }
    return status === "completed" ? {
      endpoint: endpoint,
      status: status,
      result: result
    } : {
      endpoint: endpoint,
      status: "error",
      message: result || "Unknown Error"
    };
  } catch (error) {
    return {
      endpoint: endpoint,
      status: "error",
      message: error.message || "An unexpected error occurred"
    };
  }
};
export default async function handler(req, res) {
  try {
    const type = parseInt(req.query.type || "0", 10) - 1;
    const prompt = req.query.prompt || "Default Prompt";
    const width = parseInt(req.query.width || "256", 10);
    const height = parseInt(req.query.height || "256", 10);
    if (type < 0 || type >= endpoints.length) return res.status(400).json({
      message: "Invalid type. Must be between 1 and 7."
    });
    const endpoint = endpoints[type];
    const result = await fetchResult(endpoint, prompt, width, height);
    return res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      message: error.message || "An unexpected server error occurred"
    });
  }
}