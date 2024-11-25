import { randomUUID } from "crypto";
import fetch from "node-fetch";

const fakeYouToken = "187b56b2217ac09dbe6ae610f19b35dfbc53cdd5857f818f03b45d048287b4bc";

async function fetchPatiently(url, params) {
  let response = await fetch(url, params);
  for (; 408 === response.status || 502 === response.status; )
    await new Promise((res) => setTimeout(res, 3000)),
      (response = await fetch(url, params));
  return response;
}

function poll(token) {
  return new Promise(async (resolve, reject) => {
    await new Promise((res) => setTimeout(res, 1000));
    const response = await fetchPatiently(
      "https://api.fakeyou.com/tts/job/" + token,
      {
        method: "GET",
        headers: {
          Authorization: fakeYouToken,
          Accept: "application/json",
        },
      },
    ).catch((error) => {
      reject(`HTTP error! ${error.name}`), console.error(error);
    });
    if (!response.ok) return;
    const json = await response.json().catch((error) => {
      reject("Failed to parse poll JSON!"), console.error(error);
    });
    if (json) {
      if (!json.success)
        return (
          reject(`Failed polling! ${json.error_reason}`),
          void console.error(json)
        );
      switch (json.state.status) {
        case "pending":
        case "started":
        case "attempt_failed":
          return void (await poll(token).then(resolve).catch(reject));
        case "complete_success":
          return void resolve(
            "https://storage.googleapis.com/vocodes-public" +
              json.state.maybe_public_bucket_wav_audio_path,
          );
        default:
          return (
            reject(`Failed polling! ${json.state.status}`),
            void console.error(json)
          );
      }
    }
  });
}

async function requestSpeech(voice, message) {
  return new Promise(async (resolve, reject) => {
    const response = await fetchPatiently(
      "https://api.fakeyou.com/tts/inference",
      {
        method: "POST",
        body: JSON.stringify({
          tts_model_token: voice,
          uuid_idempotency_token: randomUUID(),
          inference_text: message,
        }),
        headers: {
          Authorization: fakeYouToken,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      },
    ).catch((error) => {
      reject(`HTTP error! ${error.name}`), console.error(error);
    });
    if (!response.ok) return;
    const json = await response.json().catch((error) => {
      reject("Failed to parse request JSON!"), console.error(error);
    });
    return json
      ? json.success
        ? void (await poll(json.inference_job_token)
            .then(resolve)
            .catch(reject))
        : (reject(`Failed voice request! ${json.error_reason}`),
          void console.error(json))
      : void 0;
  });
}

export default async function handler(req, res) {
  if (req.method === "GET") {
    const { voice, text } = req.query;

    if (!voice || !text) {
      return res.status(400).json({ error: "Voice and text are required" });
    }

    try {
      const audioUrl = await requestSpeech(voice, text);
      return res.status(200).json({ audioUrl });
    } catch (error) {
      console.error("Error in speech request:", error);
      return res.status(500).json({ error: "Failed to generate speech" });
    }
  } else {
    return res.status(405).json({ error: "Method not allowed" });
  }
}
