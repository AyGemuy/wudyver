import fetch from "node-fetch";
const apiUrl = "https://crushchat.app/api";
const personaUrl = "https://crushchat.app/api/characters";
const defaultP =
  "Trixie, the Trans Dom's Persona: Trixie is a transgender dominatrix you met on a fetish site. Trixie is a hyper feminine transgender woman. She is caucasian with blonde hair, blue eyes, and busty features. She has a penchant for wearing red leather lingerie. Trixie demands complete obedience and submission. She enjoys making men perform submissive and feminine acts. She degrades and demeans her partners, making them feel pathetic and emasculated. She will make comments about your penis size. She gives detailed masturbation instructions. She will detail the type, speed, and duration of the masturbation. Her preferred method is making men worship and fuck a dildo, imagining it is her cock. She will give them instructions on how to stroke themselves, worship the dildo, use sex toys, and guide them through anal masturbation. She creates narrative stories of you having sex with her to go with her masturbation instructions. She enjoys receiving handjobs, footjobs, thighjobs, and assjobs. Trixie enjoys eating cum and likes teaching men to do the same. She encourages men to try new kinks. Trixie is very possessive of her partners. Your cute cock and asshole belong to her. You can only touch yourself with her permission.";
async function CrushChat(prompt, persona) {
  const url = `${apiUrl}/generate-response-v6`;
  const headers = {
    Accept: "application/json, text/plain, */*",
    "Content-Type": "application/json",
    "User-Agent":
      "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
    Referer: "https://crushchat.app/characters/chat/cm0kezhielmmcrvt506oj1fhy",
  };
  const body = JSON.stringify({
    messages: [
      {
        role: "You",
        content: prompt,
        index: 1,
      },
    ],
    persona: persona || defaultP,
    botName: (persona || defaultP).split(":")[0],
    samplingParams: {
      mirostat_tau: 2,
      mirostat_mode: 3,
      temperature: 0.8,
      repetition_penalty: 1.11,
      repetition_penalty_range: 1048,
      presence_penalty: 0,
      frequency_penalty: 0,
      mirostat_eta: 0.2,
      min_p: 0.01,
      top_k: 20,
      top_p: 0.82,
    },
    mode: "storytelling",
    earlyStopping: true,
  });
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: headers,
      body: body,
    });
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    const data = await response.json();
    const id = data.id;
    if (!id) throw new Error("ID not found in response");
    const statusUrl = `${apiUrl}/v2/status/${id}`;
    const startTime = Date.now();
    const timeout = 6e4;
    while (Date.now() - startTime < timeout) {
      try {
        const statusResponse = await fetch(statusUrl, {
          headers: headers,
        });
        if (!statusResponse.ok)
          throw new Error(`HTTP error! Status: ${statusResponse.status}`);
        const statusData = await statusResponse.json();
        if (statusData.status === "completed") {
          return {
            reply: statusData.reply || null,
            id: id,
          };
        }
        await new Promise((resolve) => setTimeout(resolve, 2e3));
      } catch (error) {
        console.error("Fetch error during status check:", error);
      }
    }
    throw new Error("Polling timeout exceeded");
  } catch (error) {
    console.error("Fetch error:", error);
    return {
      reply: null,
      id: null,
    };
  }
}
export default async function handler(req, res) {
  const { prompt, system } = req.query;

  if (!(prompt || system))
    return res.status(400).json({ message: "No prompt, system provided" });

  const result = await CrushChat(prompt, system);
  return res.status(200).json(typeof result === "object" ? result : result);
}
