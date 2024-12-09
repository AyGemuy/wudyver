import fetch from "node-fetch";

const Prodia = (api_key = "dc80a8a4-0b98-4d54-b3e4-b7c797bc2527") => {
  const base = "https://api.prodia.com/v1";
  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-Prodia-Key": api_key,
  };
  const defaultParams = {
    model: "auto",
    steps: 30,
    cfg: 6,
    sampler: "Euler a",
    negative_prompt:
      "(bad_prompt:0.8), multiple persons, multiple views, extra hands, ugly, lowres, bad quality, blurry, disfigured, extra limbs, missing limbs, deep fried, cheap art, missing fingers, out of frame, cropped, bad art, face hidden, text, speech bubble, stretched, bad hands, error, extra digit, fewer digits, worst quality, low quality, normal quality, mutated, mutation, deformed, severed, dismembered, corpse, pubic, poorly drawn, (((deformed hands))), (((more than two hands))), (((deformed body))), ((((mutant))))",
    quantity: 1,
  };

  const sendRequest = async ({ link, method, params = {} }) => {
    try {
      const mergedParams = { ...defaultParams, ...params };
      const url = new URL(`${base}${link}`);
      const options = { method, headers };

      if (method === "GET") {
        Object.entries(mergedParams).forEach(([key, value]) =>
          url.searchParams.append(key, value)
        );
      } else {
        options.body = JSON.stringify(mergedParams);
      }

      const response = await fetch(url.toString(), options);
      if (!response.ok) {
        const errorMessages = {
          400: "Invalid parameters provided.",
          401: "Invalid API key.",
          402: "API key not enabled.",
        };
        throw new Error(errorMessages[response.status] || "Request failed.");
      }
      return await response.json();
    } catch (error) {
      throw new Error(error.message);
    }
  };

  return {
    generateImage: async (params) =>
      await sendRequest({ link: "/sd/generate", method: "POST", params }),
    transform: async (params) =>
      await sendRequest({ link: "/sd/transform", method: "POST", params }),
    inpainting: async (params) =>
      await sendRequest({ link: "/sd/inpaint", method: "POST", params }),
    controlNet: async (params) =>
      await sendRequest({ link: "/sd/controlnet", method: "POST", params }),
    upscale: async (params) =>
      await sendRequest({ link: "/upscale", method: "POST", params }),
    faceSwap: async (params) =>
      await sendRequest({ link: "/faceswap", method: "POST", params }),
    faceRestore: async (params) =>
      await sendRequest({ link: "/facerestore", method: "POST", params }),
    getJob: async (job_id) =>
      await sendRequest({ link: `/job/${job_id}`, method: "GET" }),
    getModels: async () => await sendRequest({ link: "/sd/models", method: "GET" }),
    getSamplers: async () =>
      await sendRequest({ link: "/sd/samplers", method: "GET" }),
  };
};

export default async function handler(req, res) {
  const { method } = req;
  const { action, job_id, key, ...params } =
    method === "GET" ? req.query : req.body;

  const apiKey = key || "dc80a8a4-0b98-4d54-b3e4-b7c797bc2527";
  const prodia = Prodia(apiKey);
  const filteredParams = { ...params };

  delete filteredParams.key;
  delete filteredParams.action;
  delete filteredParams.job_id;

  try {
    const actions = {
      generate: async () => await prodia.generateImage(filteredParams),
      transform: async () => await prodia.transform(filteredParams),
      inpainting: async () => await prodia.inpainting(filteredParams),
      controlnet: async () => await prodia.controlNet(filteredParams),
      upscale: async () => await prodia.upscale(filteredParams),
      faceswap: async () => await prodia.faceSwap(filteredParams),
      facerestore: async () => await prodia.faceRestore(filteredParams),
      getjob: async () => await prodia.getJob(job_id),
      models: async () => await prodia.getModels(),
      samplers: async () => await prodia.getSamplers(),
    };

    if (!actions[action]) {
      return res.status(400).json({ error: "Invalid action parameter." });
    }

    const result = await actions[action]();
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
