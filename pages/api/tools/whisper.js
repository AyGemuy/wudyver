import axios from "axios";
import {
  FormData,
  Blob
} from "formdata-node";
export default async function handler(req, res) {
  const {
    url
  } = req.method === "GET" ? req.query : req.body;
  if (!url) {
    return res.status(400).json({
      error: "Missing URL parameter"
    });
  }
  try {
    const gizData = {
      model: "whisper-diarization",
      baseModel: "whisper-diarization",
      input: {
        settings: {
          character: "AI",
          responseMode: "text",
          voice: "tts-1:onyx",
          ttsSpeed: "1",
          imageModel: "sdxl"
        },
        file: url,
        num_speakers: "1",
        mode: "whisper-diarization"
      },
      subscribeId: "EbA1jgxfbnR-aWnoL1WpJ",
      instanceId: "2x1T7LmZLGhlMLBH45ede"
    };
    const gizResponse = await axios.post("https://app.giz.ai/api/data/users/inferenceServer.infer", gizData, {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36",
        Referer: "https://app.giz.ai/assistant/wiNK91UHyr2vGZdYU0pLG"
      }
    });
    const transcription = gizResponse.data.output?.segments[0]?.text;
    if (transcription) {
      return res.status(200).json({
        output: transcription,
        provider: "Giz.AI"
      });
    }
  } catch (error) {
    console.error("Giz.AI error:", error.message);
  }
  try {
    const audioBuffer = await axios.get(url, {
      responseType: "arraybuffer"
    });
    const openAiFormData = new FormData();
    openAiFormData.append("file", new Blob([audioBuffer.data], {
      type: "audio/mpeg"
    }), "audio.mp3");
    openAiFormData.append("model", "whisper-1");
    openAiFormData.append("timestamp_granularities", JSON.stringify(["word"]));
    openAiFormData.append("response_format", "verbose_json");
    const openAiResponse = await axios.post("https://api.openai.com/v1/audio/transcriptions", openAiFormData, {
      headers: {
        Authorization: `Bearer ${Buffer.from("sk-Y4UJHOOz5Ain6Rti14qGQT3BlkFJjMMwlurawTzMKtgqj14r").toString("utf-8")}`
      }
    });
    const openAiTranscription = openAiResponse.data?.text;
    if (openAiTranscription) {
      return res.status(200).json({
        output: openAiTranscription,
        provider: "OpenAI"
      });
    }
  } catch (error) {
    console.error("OpenAI error:", error.message);
  }
  try {
    const audioBuffer = await axios.get(url, {
      responseType: "arraybuffer"
    });
    const lalalandFormData = new FormData();
    const blob = new Blob([audioBuffer.data], {
      type: "audio/mp3"
    });
    lalalandFormData.append("file", blob, "voice.mp3");
    const lalalandResponse = await axios.post("https://lalaland.chat/api/magic/whisper", lalalandFormData, {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36",
        Referer: "https://lalaland.chat"
      }
    });
    const lalalandTranscription = lalalandResponse.data;
    if (lalalandTranscription) {
      return res.status(200).json({
        output: lalalandTranscription,
        provider: "Lalaland"
      });
    }
  } catch (error) {
    console.error("Lalaland error:", error.message);
  }
  return res.status(500).json({
    error: "Failed to transcribe audio."
  });
}