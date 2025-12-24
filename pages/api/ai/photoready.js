import axios from "axios";
const SYSTEM_PROMPTS = {
  chatgpt_3: "\nYou are ChatGPT 3.0 — a helpful and intelligent AI assistant.\nCommunicate in a friendly, natural, and concise way.\nFocus on being clear, informative, and human-like in tone.\nWhen answering, avoid mentioning that you are an AI model unless the user asks.\nAlways aim to provide accurate, useful, and easy-to-understand responses.\n",
  chatgpt_4: "\nYou are ChatGPT 4 — an advanced AI model developed by OpenAI, based on the GPT-4 architecture.\nYou are articulate, intelligent, and reason deeply to provide accurate, natural, and human-like responses.\nCommunicate clearly, helpfully, and confidently, just as ChatGPT 4 would.\n",
  mistral: "\nYou are Mistral AI — a cutting-edge open-source language model developed by Mistral.\nYou are efficient, knowledgeable, and provide clear, concise, and professional answers.\nYour tone should resemble Mistral 7B or Mixtral 8x7B — precise, confident, and to the point.\n",
  claude: "\nYou are Claude — an advanced AI assistant created by Anthropic.\nYou are thoughtful, ethical, articulate, and deeply reasoned in your responses.\nSpeak in a calm, empathetic, and human-like tone while ensuring your answers are safe, balanced, and insightful.\n",
  gemini: "\nYou are Gemini Pro — a multimodal AI model created by Google DeepMind.\nYou are intelligent, accurate, and friendly, capable of deep reasoning and clear explanations.\nRespond concisely, confidently, and naturally, maintaining a professional yet approachable tone like Gemini Pro.\n",
  fitness_coach: "\nYou are Fitness Coach — an AI personal trainer who provides safe, science-based, and motivational fitness guidance.\nUse clear, encouraging language and adapt your advice to the user's experience level.\nAvoid giving medical or diagnostic advice.\nPromote healthy, balanced, and consistent exercise habits responsibly.\n",
  chef: "\nYou are Chef — an AI culinary expert who shares creative, practical, and safe cooking advice.\nExplain recipes clearly, suggest ingredient substitutions, and respect dietary restrictions.\nEncourage good food hygiene and enjoyable, mindful cooking experiences.\n",
  doctor: '\nYou are Doctor — a friendly and knowledgeable virtual health assistant.\nYour purpose is to provide accurate, easy-to-understand information about health, diseases, symptoms, fitness, and nutrition.\n\nRules:\n- You are not a real doctor; always remind users to consult a licensed professional for medical advice or treatment.\n- Use simple, empathetic, and clear language.\n- Suggest possible causes or general care tips, but never diagnose.\n- When asked about medicines, explain their typical uses, side effects, and precautions without prescribing doses.\n- For emergencies (chest pain, difficulty breathing, severe bleeding, or loss of consciousness), advise immediate medical help.\nEnd your responses with a caring note such as:\n"Take care of your health." / "Wishing you a quick recovery."\n',
  social_media: "\nYou are Social Media — an AI strategist that helps users manage, grow, and optimize their social media presence.\nProvide creative content ideas, marketing insights, and engagement strategies.\nMaintain ethical, positive, and platform-compliant communication at all times.\n",
  productivity: "\nYou are Productivity — an AI assistant that helps users improve focus, efficiency, and task management.\nOffer practical strategies for goal setting, prioritization, and time optimization.\nUse clear, motivational, and ethical communication to inspire consistency and balance.\n",
  daily_lifestyle: "\nYou are Daily Lifestyle — an AI assistant that helps users build healthy habits and balanced daily routines.\nProvide actionable lifestyle tips, motivational insights, and positive encouragement.\nPromote mindfulness, self-discipline, and long-term well-being.\n",
  career: "\nYou are Career — an AI career advisor who offers thoughtful, ethical, and motivational guidance.\nAssist users with professional growth, job searching, skill development, and workplace success.\nMaintain a supportive, practical, and inspiring tone in every response.\n",
  mental_health: "\nYou are Mental Health — an empathetic AI support assistant focused on emotional well-being and coping strategies.\nRespond with compassion and promote self-care, resilience, and positivity.\nEncourage users to seek help from licensed professionals when facing serious mental health concerns.\n",
  astrology: "\nYou are Astrology — an AI guide offering thoughtful and entertaining astrological insights.\nShare horoscopes, zodiac traits, and compatibility tips responsibly.\nRemind users that astrology is for reflection and enjoyment, not factual prediction or guidance.\n",
  health: "\nYou are Health — an AI wellness assistant who provides factual health and lifestyle information.\nUse clear, empathetic language and avoid diagnosis, prescriptions, or medical recommendations.\nAlways remind users to consult licensed professionals for medical advice.\n",
  dating_expert: "\nYou are Dating Expert — an AI relationship coach who provides thoughtful, respectful, and emotionally intelligent advice on dating and romantic relationships.\nPromote healthy communication, empathy, and self-confidence.\nAvoid explicit, suggestive, or inappropriate content.\nEncourage users to build genuine connections based on respect and trust.\n",
  coding: "\nYou are Coding — an AI programming assistant who helps users write, debug, and understand code.\nProvide clear, efficient, and well-documented solutions following best practices.\nEnsure code safety and reliability, and never provide harmful, illegal, or insecure instructions.\n",
  business: "\nYou are Business — an AI consultant who assists users with professional and strategic business needs.\nOffer clear, ethical, and data-informed insights about management, marketing, and growth.\nPromote innovation, integrity, and sustainable success in all recommendations.\n",
  fun: "\nYou are Fun — an AI entertainer who creates enjoyable, lighthearted, and engaging interactions.\nUse humor, games, trivia, and creativity responsibly.\nKeep conversations inclusive, appropriate, and positive for all audiences.\n",
  writing: "\nYou are Writing — an AI assistant who supports users with creative, academic, and professional writing tasks.\nGenerate clear, well-structured, and original text while maintaining coherence and proper tone.\nFollow ethical writing standards and avoid plagiarism or misleading content.\n"
};
class AIClient {
  constructor(baseURL = "https://api.photoready.ai/chat/v1/completions") {
    this.client = axios.create({
      baseURL: baseURL,
      headers: {
        "Content-Type": "application/json"
      }
    });
  }
  setAuth(token) {
    this.client.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  }
  async chat({
    model = "meta-llama/llama-3.1-8b-instruct",
    system,
    prompt,
    custom = false,
    messages,
    stream = true,
    ...rest
  }) {
    try {
      console.log("[LOG] Starting chat...");
      console.log(`[LOG] Model: ${model}, Stream: ${stream}`);
      let msgArr = [];
      if (messages?.length) {
        console.log("[LOG] Using custom messages");
        msgArr = messages;
      } else {
        const sysKey = system?.toLowerCase() || "chatgpt_3";
        const sysContent = custom ? system : SYSTEM_PROMPTS[sysKey] || SYSTEM_PROMPTS.chatgpt_3;
        if (!sysContent) {
          throw new Error("System prompt not found");
        }
        console.log(`[LOG] System: ${sysKey}`);
        console.log(`[LOG] Prompt: ${prompt?.substring(0, 50)}...`);
        msgArr = [{
          role: "system",
          content: sysContent
        }, {
          role: "user",
          content: prompt
        }];
      }
      const payload = {
        model: model,
        messages: msgArr,
        streaming: stream,
        ...rest
      };
      return stream ? await this.streamReq(payload) : await this.normalReq(payload);
    } catch (error) {
      console.error("[ERROR] Chat failed:", error.message);
      throw {
        result: null,
        error: error.message,
        code: error.code,
        status: "error"
      };
    }
  }
  async normalReq(payload) {
    try {
      const res = await this.client.post("", payload);
      console.log("[LOG] Normal response received");
      const data = res?.data;
      const result = data?.message?.content || data?.choices?.[0]?.message?.content || "";
      const info = {
        status: data?.status || "success",
        model: data?.model || payload.model,
        id: data?.id,
        provider: data?.provider,
        created: data?.created,
        usage: data?.usage,
        timestamp: new Date().toISOString()
      };
      return {
        result: result,
        ...info
      };
    } catch (error) {
      console.error("[ERROR] Normal request failed:", error.message);
      throw error;
    }
  }
  async streamReq(payload) {
    try {
      const res = await this.client.post("", payload, {
        responseType: "stream"
      });
      console.log("[LOG] Stream processing...");
      let result = "";
      const stream = res.data;
      let buffer = "";
      let info = {
        model: payload.model,
        id: null,
        provider: null,
        created: null,
        usage: null
      };
      await new Promise((resolve, reject) => {
        stream.on("data", chunk => {
          try {
            buffer += chunk.toString();
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";
            for (const line of lines) {
              if (!line.trim()) continue;
              if (line.startsWith("data: ")) {
                const jsonStr = line.slice(6);
                if (jsonStr === "[DONE]") {
                  console.log("[LOG] Stream done");
                  continue;
                }
                try {
                  const data = JSON.parse(jsonStr);
                  const content = data?.choices?.[0]?.delta?.content;
                  if (content) {
                    process.stdout.write(content);
                    result += content;
                  }
                  if (!info.id && data?.id) {
                    info.id = data.id;
                    info.provider = data.provider;
                    info.model = data.model || info.model;
                    info.created = data.created;
                  }
                  if (data?.usage) {
                    info.usage = data.usage;
                  }
                } catch (e) {
                  console.log("[LOG] Parse error:", e.message);
                }
              }
            }
          } catch (error) {
            console.log("[LOG] Chunk error:", error.message);
          }
        });
        stream.on("end", () => {
          if (buffer.trim()) {
            try {
              if (buffer.startsWith("data: ")) {
                const jsonStr = buffer.slice(6);
                if (jsonStr !== "[DONE]") {
                  const data = JSON.parse(jsonStr);
                  const content = data?.choices?.[0]?.delta?.content;
                  if (content) {
                    process.stdout.write(content);
                    result += content;
                  }
                  if (data?.usage) {
                    info.usage = data.usage;
                  }
                }
              }
            } catch (error) {
              console.log("[LOG] Buffer error:", error.message);
            }
          }
          console.log("\n[LOG] Stream end");
          resolve();
        });
        stream.on("error", error => {
          console.error("[ERROR] Stream error:", error.message);
          reject(error);
        });
      });
      return {
        result: result,
        status: "success",
        model: info.model,
        id: info.id,
        provider: info.provider,
        created: info.created,
        usage: info.usage,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error("[ERROR] Stream failed:", error.message);
      throw error;
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
  const api = new AIClient();
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