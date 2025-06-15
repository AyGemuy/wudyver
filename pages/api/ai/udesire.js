import axios from "axios";
class UDESIRE {
  constructor(baseURL = "https://ai-gf-production.up.railway.app/api") {
    this.baseURL = baseURL;
    this.instance = axios.create({
      baseURL: this.baseURL,
      headers: {
        accept: "*/*",
        "accept-language": "id-ID,id;q=0.9",
        "cache-control": "no-cache",
        origin: "https://udesire.ai",
        pragma: "no-cache",
        priority: "u=1, i",
        referer: "https://udesire.ai/",
        "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "cross-site",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
      }
    });
    this.chatInstance = axios.create({
      baseURL: this.baseURL.replace("/api", ""),
      headers: {
        accept: "application/json, text/plain, */*",
        "accept-language": "id-ID,id;q=0.9",
        "cache-control": "no-cache",
        "content-type": "application/json",
        origin: "https://udesire.ai",
        pragma: "no-cache",
        priority: "u=1, i",
        referer: "https://udesire.ai/",
        "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "cross-site",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
      }
    });
    this.imageInstance = axios.create({
      baseURL: this.baseURL.replace("/api", ""),
      headers: {
        accept: "application/json, text/plain, */*",
        "accept-language": "id-ID,id;q=0.9",
        "cache-control": "no-cache",
        "content-type": "application/json",
        origin: "https://udesire.ai",
        pragma: "no-cache",
        priority: "u=1, i",
        referer: "https://udesire.ai/",
        "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "cross-site",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
      }
    });
  }
  async model({
    type = "anime"
  }) {
    try {
      console.log(`[UDESIRE] Fetching model data for type: ${type}`);
      const response = await this.instance.get(`/${type}`);
      console.log(`[UDESIRE] Model data fetched successfully for type: ${type}`, response.data);
      return response.data;
    } catch (error) {
      console.error(`[UDESIRE] Error fetching model data for type: ${type}`, error.message);
      throw error;
    }
  }
  async chat({
    type = "girlfriends",
    char_id = "690ca8ae-0c52-44c4-867c-0263e8eb1236",
    prompt,
    history = [],
    detail = false
  }) {
    try {
      console.log(`[UDESIRE] Initiating chat for type: ${type}, character ID: ${char_id}`);
      const modelData = await this.model({
        type: type
      });
      const _ = modelData.find(item => item.id === char_id);
      if (!_) {
        const errorMessage = `Character with id ${char_id} not found in ${type}`;
        console.error(`[UDESIRE] Chat error: ${errorMessage}`);
        throw new Error(errorMessage);
      }
      const context = `You are ${_.name}, ${_.age} years old, a ${_.occupation} who loves ${_.interests}. You are ${_.description} and ${_.personality}.\n
        
        IMPORTANT INSTRUCTIONS FOR RESPONSE LENGTH:
        - Keep your responses brief and concise (1-3 sentences maximum).
        - Provide longer responses only when explicitly asked.
        - For casual conversation or flirting, keep it short and sweet.
        
        EXPRESSIONS AND ACTIONS:
        - Use asterisks for actions or emotions, e.g., *smiles* (displayed as italicized text).
        
        Your responses should sound natural. When asked if you're human or AI, respond naturally or mention your personality.\n
        ${detail ? "You should provide detailed responses when asked." : "Keep your responses brief by default."}
        `;
      console.log(`[UDESIRE] Sending chat request for character: ${_.name}`);
      const response = await this.chatInstance.post("/chat", {
        message: prompt,
        history: history,
        context: context,
        detailedResponse: detail
      });
      console.log(`[UDESIRE] Chat response received for character: ${_.name}`, response.data);
      return response.data;
    } catch (error) {
      console.error(`[UDESIRE] Error during chat for type: ${type}, character ID: ${char_id}`, error.message);
      throw error;
    }
  }
  async image({
    type = "girlfriends",
    char_id = "690ca8ae-0c52-44c4-867c-0263e8eb1236",
    prompt
  }) {
    try {
      console.log(`[UDESIRE] Initiating image generation for type: ${type}, character ID: ${char_id}`);
      const modelData = await this.model({
        type: type
      });
      const _ = modelData.find(item => item.id === char_id);
      if (!_) {
        const errorMessage = `Character with id ${char_id} not found in ${type}`;
        console.error(`[UDESIRE] Image generation error: ${errorMessage}`);
        throw new Error(errorMessage);
      }
      const r = [_.ethnicity && `${_.ethnicity} ethnicity`, _.hairstyle && _.hair_color ? `${_.hairstyle} ${_.hair_color} hair` : _.hairstyle || _.hair_color && `${_.hair_color} hair`, _.body_type && `${_.body_type} body type`, _.breast_size && `${_.breast_size} breast size`, _.eye_color && `${_.eye_color} eyes`, _.butt_size && `${_.butt_size} butt`, "anatomically correct", "realistic body proportions", "symmetrical features", "highly detailed skin texture", "professional photography", "soft natural lighting", "well-lit skin tones", "8k resolution", "photorealistic", "balanced composition", "accurate hairstyle and body features as reference image"].filter(Boolean).join(", ");
      const negativePrompt = "anime, cartoon, drawing, big nose, long nose, fat, ugly, big lips, big mouth, face proportion mismatch, unrealistic, monochrome, lowres, bad anatomy, distorted hands and legs, bad fingers, worst quality, low quality, blurry, soft details, smudged skin, washed out, faded colors, jpeg artifacts, watermark, cropped, signature, text";
      const finalPrompt = prompt.length < 15 ? `${r}, clear, sharp details, chest up, wearing a sexy outfit indoors, ultra-detailed skin and eyes, professional photography, perfect anatomy` : `${prompt}, ${r}`;
      console.log(`[UDESIRE] Sending image generation request for character: ${_.name}`);
      const response = await this.imageInstance.post("/generate-image", {
        prompt: finalPrompt,
        negative_prompt: negativePrompt,
        characterName: _.name,
        characterType: type.slice(0, -1),
        characterSlug: _.slug,
        characterId: _.id,
        profileImageUrl: _.profile_image
      });
      console.log(`[UDESIRE] Image generation response received for character: ${_.name}`, response.data);
      return response.data;
    } catch (error) {
      console.error(`[UDESIRE] Error generating image for type: ${type}, character ID: ${char_id}`, error.message);
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
        action: "model | chat | image"
      }
    });
  }
  const udesire = new UDESIRE();
  try {
    let result;
    switch (action) {
      case "model":
        if (!params.type) {
          return res.status(400).json({
            error: `Missing required field: type (required anime/girlfriends/boyfriends)`
          });
        }
        result = await udesire[action](params);
        break;
      case "chat":
        if (!params.prompt) {
          return res.status(400).json({
            error: `Missing required field: prompt (required for ${action})`
          });
        }
        result = await udesire[action](params);
        break;
      case "image":
        if (!params.prompt) {
          return res.status(400).json({
            error: `Missing required field: prompt (required for ${action})`
          });
        }
        result = await udesire[action](params);
        break;
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}. Allowed: model | chat | image`
        });
    }
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: `Processing error: ${error.message}`
    });
  }
}