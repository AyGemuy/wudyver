import axios from "axios";
class BrainrotFactory {
  constructor() {
    this.baseHeaders = {
      accept: "*/*",
      "accept-language": "id-ID",
      "content-type": "application/json",
      origin: "https://overchat.ai",
      referer: "https://overchat.ai/",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
  }
  async req(url, payload, label) {
    try {
      console.log(`[LOG] ⏳ Requesting ${label}...`);
      const {
        data
      } = await axios.post(url, payload, {
        headers: this.baseHeaders
      });
      console.log(`[LOG] ✅ ${label} success.`);
      return data;
    } catch (err) {
      console.log(`[ERR] ❌ ${label} failed: ${err?.message || "Unknown error"}`);
      return null;
    }
  }
  async txt(idea) {
    const url = "https://ephemeral-manatee-a776b8.netlify.app/.netlify/functions/proxy";
    const promptText = `Generate a new Italian brainrot character based on this user idea: "${idea}"\n\nReply with a JSON object in this exact format:\n\n{\n  "name": "Character Name",\n  "story": "Short backstory (1-2 sentences)",\n  "characteristics": ["Characteristic 1", "Characteristic 2", "Characteristic 3"]\n}\n\nCharacter name requirements:\n- Create a pseudo-Italian name that uses Italian-sounding suffixes like "-ini", "-ino", "-ello", "-elli", "-etta", "-otto," "brrr"\n- Often rhymes or has alliterative patterns (e.g., "Tralalero Tralala", "Bombombini Gusini, Trippi Troppi")\n- Reflects the hybrid nature of the character\n- Can be 4-10 words long\n\nDesign specifications:\n- Create a hybrid creature that combines the user's idea with Italian brainrot elements\n- Base animal: Choose any animal (mammal, bird, reptile, fish, insect, etc.)\n- Fusion object: Select from categories like food items, everyday objects, vehicles, weapons, or something surreal\n\nShort story requirements:\n- Write a brief backstory (1-2 sentences) that explains the character's origin or special abilities\n- References their hybrid nature\n- May include relationships to other Italian brainrot characters\n- Can include absurd superpowers related to their hybrid components\n- Sounds like internet folklore/fan fiction\n\nCharacteristics should be 3-5 items describing powers, abilities, or notable features.`;
    return await this.req(url, {
      tool: "brainrot_character_generator",
      provider: "openai",
      model: "gpt-4",
      prompt: promptText,
      temperature: .9,
      maxTokens: 500,
      apiKeyEnvVar: "TOOL_BRAINROT_CHAR_GENERATOR_API_KEY"
    }, "Text-Data");
  }
  async pic(idea) {
    const url = "https://overchat-ai-fal-proxy.netlify.app/.netlify/functions/fal-proxy";
    return await this.req(url, {
      prompt: `Surreal hybrid character design, highly detailed and realistic CGI style. Photorealistic textures of fur, feathers, metal, wood, fruit, or everyday objects fused with animals or humans. Strange and humorous combinations: ${idea}. Cinematic lighting, smooth pastel gradient background, concept art, whimsical yet realistic. Italian brainrot style`,
      model: "fal-ai/flux/dev",
      imageSize: "square_hd",
      numInferenceSteps: 28,
      guidanceScale: 3.5,
      numImages: 1,
      outputFormat: "jpeg"
    }, "Image-Gen");
  }
  async generate({
    idea = "bombardilo",
    ...rest
  }) {
    console.log(`[START] Processing idea: "${idea}"`);
    const startTime = Date.now();
    const rawResults = {
      txt: null,
      pic: null
    };
    const tasks = ["text_generation", "image_generation"];
    for (const task of tasks) {
      if (task === "text_generation") {
        rawResults.txt = await this.txt(idea);
      } else if (task === "image_generation") {
        rawResults.pic = await this.pic(idea);
      }
    }
    const {
      txt,
      pic
    } = rawResults;
    let charInfo = {};
    try {
      charInfo = txt?.response ? JSON.parse(txt.response) : {};
    } catch (e) {
      console.log(`[WARN] Parse error: ${e.message}`);
    }
    const finalResult = {
      success: txt?.success && pic?.success ? true : false,
      meta: {
        query: idea,
        ...rest,
        process_time: `${Date.now() - startTime}ms`
      },
      data: {
        name: charInfo?.name || "Unnamed Abomination",
        lore: charInfo?.story || "No backstory available.",
        traits: charInfo?.characteristics || ["Unknown"],
        visual: pic?.imageUrl || pic?.images?.[0]?.url || "https://via.placeholder.com/1024?text=No+Image"
      },
      raw_model: {
        txt: txt?.model || "gpt-unknown",
        img: pic?.model || "flux-unknown"
      }
    };
    console.log(`[DONE] Result generated.\n`);
    return finalResult;
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.idea) {
    return res.status(400).json({
      error: "Parameter 'idea' diperlukan"
    });
  }
  const api = new BrainrotFactory();
  try {
    const data = await api.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}