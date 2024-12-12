import fetch from "node-fetch";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed. Use GET." });
    return;
  }

  const {
    key = "dc80a8a4-0b98-4d54-b3e4-b7c797bc2527",
    basemodel = "SD",
    model,
    prompt,
    negative_prompt = "",
    style_preset = "None",
    steps = "20",
    cfg_scale = "7",
    seed = "-1",
    sampler = "DPM++ 2M Karras",
    width = "512",
    height = "512",
  } = req.query;

  if (!key || !basemodel || !model || !prompt) {
    res.status(400).json({ error: "Missing required parameters." });
    return;
  }

  const requestBody = {
    model,
    prompt,
    negative_prompt,
    style_preset,
    steps: parseInt(steps),
    cfg_scale: parseFloat(cfg_scale),
    seed: parseInt(seed),
    sampler,
    width: parseInt(width),
    height: parseInt(height),
  };

  const generationURL = `https://api.prodia.com/v1/${basemodel.toLowerCase()}/generate`;
  const jobURL = "https://api.prodia.com/v1/job/";

  try {
    const generationResponse = await fetch(generationURL, {
      method: "POST",
      headers: {
        "X-Prodia-Key": key,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!generationResponse.ok) {
      res.status(generationResponse.status).json({ error: generationResponse.statusText });
      return;
    }

    const { job } = await generationResponse.json();

    let imageURL = "";
    while (true) {
      const jobResponse = await fetch(`${jobURL}${job}`, {
        method: "GET",
        headers: {
          "X-Prodia-Key": key,
          Accept: "application/json",
        },
      });

      const jobData = await jobResponse.json();

      if (jobData.status === "succeeded") {
        imageURL = jobData.imageUrl;
        break;
      }

      if (jobData.status === "failed") {
        res.status(500).json({ error: "Image generation failed." });
        return;
      }

      await new Promise((r) => setTimeout(r, 750));
    }

    res.status(200).json({ imageUrl: imageURL });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
