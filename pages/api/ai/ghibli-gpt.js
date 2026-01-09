import fetch from "node-fetch";
const GEMINI_API_KEY = ["global-xXbQMjv2j0omw2123PDmPQu2", "global-xZbQMjv2j0omw2EznPDmPQuw"];
const API_BASE_URL = "https://generate-api-test.ghibli-gpt.net/v1beta/models/";
const MODEL_NAME = "gemini-2.0-flash-exp-image-generation";
const GENERATE_ENDPOINT = `${API_BASE_URL}${MODEL_NAME}:generateContent`;
const BASE_GHIBLI_PROMPT = `Create a Studio Ghibli style image with these key characteristics:
- Overall Style: Hand-drawn animation look with clean, crisp black outlines; soft, painterly aesthetic; warm and nostalgic feeling; whimsical and charming atmosphere
- Color Palette: Muted and natural tones; warm earthy colors (browns, greens, creams, soft yellows); slightly desaturated reds and blues; harmonious limited color palette
- Shading: Cel-shading style with distinct shadow boundaries rather than smooth gradients; soft and natural lighting; subtle highlights to define form
- Facial Features: Large, expressive eyes; simplified but expressive facial features; warm and friendly expressions
- Backgrounds: Stylized but detailed backgrounds; textured details for clothing, hair, and surfaces; sometimes slightly blurred backgrounds to create depth
The image should capture the essence of Studio Ghibli films with their warm aesthetics, attention to subtle details, emotional weight, and balance between fantasy and realism.`;
const FINAL_INSTRUCTIONS = `\n\nCRITICAL INSTRUCTIONS: 
1. The transformed image MUST be recognizable as the same scene/subject as the input image
2. Maintain the exact same composition, subjects, and key elements as the original
3. Only modify artistic style, colors, textures, and atmospheric elements
4. Do NOT change the content, layout, or add/remove major elements
5. People/characters in the image should remain in the same positions and poses
6. The transformation should feel like the original photo was redrawn in Ghibli style
7. Don't add or reduce people number in the image.

AVOID THESE STYLES: 
1. Photorealistic rendering - the result should NOT look like a photograph
2. 3D rendering or CG look - maintain the 2D hand-drawn animation appearance
3. Realistic shading - use cel-shading instead of smooth/realistic lighting
4. Gradient-heavy shading - prefer flat color areas with distinct shadow boundaries
5. Hyper-detailed textures - keep textures subtle and painterly
6. Overly vibrant or saturated colors - maintain the muted, natural Ghibli palette
7. Overly stylized anime features - avoid exaggerated proportions not present in Ghibli films
8. Digital painting effects - maintain the traditional animation cell look

Output a final image URL only, no descriptive text.`;

function log(message) {
  console.log(`[Gemini] ${message}`);
}

function getFilmSpecificPrompt(filmName) {
  const styles = {
    "Spirited Away": "Emphasize fluid character motion, lush, slightly dark environments, and an atmospheric glow typical of Spirited Away.",
    "My Neighbor Totoro": "Focus on bright, pastoral settings, soft lines, and a sense of childlike wonder typical of My Neighbor Totoro."
  };
  return styles[filmName] ?? null;
}

function buildGhibliPrompt(userPrompt, filmReference) {
  const customKeywords = ["Transform this image into", "Transform the image into", "Transform the original image", "Apply a Pixar-like", "3D collectible doll", "3D rendered", "Pixar", "Lego", "Disney", "pixel art", "pixel fantasy", "Polaroid"];
  const isCustomStyle = customKeywords.some(k => userPrompt.includes(k));
  let prompt = "";
  if (isCustomStyle) {
    log(`Custom style detected: "${userPrompt}"`);
    prompt = `TRANSFORMATION TASK: ${userPrompt}\n\nThis is an image transformation task, NOT image generation. The output image MUST maintain the same composition, layout, subjects, and key elements as the input image.`;
    const filmStyle = filmReference && getFilmSpecificPrompt(filmReference);
    if (filmStyle) prompt += `\n\nSpecifically reference the visual style of the film '${filmReference}' with these characteristics: ${filmStyle}`;
    prompt += "\n\nCRITICAL INSTRUCTIONS: \n1. The transformed image MUST be recognizable as the same scene/subject as the input image\n2. Maintain the exact same composition, subjects, and key elements as the original\n3. Only modify artistic style, colors, textures, and atmospheric elements\n4. Do NOT change the content, layout, or add/remove major elements\n5. People/characters in the image should remain in the same positions and poses\n\nOutput a final image URL only, no descriptive text.";
  } else {
    log(`Using default Ghibli style for: "${userPrompt}"`);
    prompt = `TRANSFORMATION TASK: Transform the provided input image into authentic Studio Ghibli animation style. This is an image transformation task, NOT image generation. The output image MUST maintain the same composition, layout, subjects, and key elements as the input image. People/characters must be transformed to Ghibli style with large expressive eyes and simplified facial features.\n\n${BASE_GHIBLI_PROMPT}\n\nSTYLE IMPLEMENTATION DETAILS:\n2. Character Design: People should have large, expressive eyes with simplified but emotive facial features. Maintain warm, friendly expressions.\n3. Color Palette: Use muted, natural tones (browns, greens, creams, soft yellows) with slightly desaturated reds and blues. Create a warm, harmonious limited color scheme.\n4. Shading Technique: Apply cel-shading with distinct shadow boundaries rather than smooth gradients. Add subtle highlights to define form.\n5. Textures: Include subtle textures for clothing, hair, and surfaces that enhance the hand-drawn feel without being overly detailed.\n7. Lighting: Implement soft, natural lighting with a warm overall tone. Avoid harsh lighting or dramatic shadows.\n\nFor this specific image transformation: ${userPrompt}`;
    const filmStyle = filmReference && getFilmSpecificPrompt(filmReference);
    if (filmStyle) prompt += `\n\nSpecifically reference the visual style of the film '${filmReference}' with these characteristics: ${filmStyle}`;
    prompt += FINAL_INSTRUCTIONS;
  }
  log(`Final prompt length: ${prompt.length}`);
  return prompt;
}

function createRequestBody(promptText, imageBase64 = null) {
  const parts = [{
    text: promptText
  }];
  if (imageBase64) {
    parts.push({
      inlineData: {
        mime_type: "image/jpeg",
        data: imageBase64
      }
    });
  }
  return {
    contents: [{
      parts: parts
    }],
    generationConfig: {
      responseModalities: ["Text", "Image"],
      temperature: .35,
      topP: .88,
      topK: 40
    }
  };
}
async function resolveImageInput(input) {
  if (!input) return null;
  if (input instanceof Buffer) {
    log("Input type: Buffer");
    return input.toString("base64");
  }
  if (typeof input === "string" && input.startsWith("data:image")) {
    log("Input type: Data URI");
    const [, b64] = input.split(",");
    return b64 ?? null;
  }
  if (typeof input === "string" && /^https?:\/\//i.test(input)) {
    log(`Fetching image from URL: ${input}`);
    try {
      const res = await fetch(input);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const arrayBuffer = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      return buffer.toString("base64");
    } catch (err) {
      log(`Failed to download image: ${err.message}`);
      throw err;
    }
  }
  if (typeof input === "string") {
    log("Input type: Base64 string");
    return input;
  }
  return null;
}

function extractImageResult(responseData) {
  const errorMsg = responseData?.error?.message;
  if (errorMsg) {
    log(`API Error: ${errorMsg}`);
    if (/safety|content moderation/i.test(errorMsg)) {
      return {
        success: false,
        message: "Prompt contains restricted content."
      };
    }
    return {
      success: false,
      message: errorMsg,
      retryable: false
    };
  }
  const parts = responseData?.candidates?.[0]?.content?.parts ?? [];
  for (const part of parts) {
    if (part.inlineData?.url) {
      log(`Result: Image URL → ${part.inlineData.url}`);
      return {
        success: true,
        url: part.inlineData.url
      };
    }
    if (part.inlineData?.data) {
      log(`Result: Base64 image (length: ${part.inlineData.data.length})`);
      return {
        success: true,
        base64: part.inlineData.data
      };
    }
    if (part.text) {
      const txt = part.text.trim();
      if (/^https?:\/\//i.test(txt)) {
        const url = txt.split(/\s+/)[0];
        log(`Result: URL from text → ${url}`);
        return {
          success: true,
          url: url
        };
      }
    }
  }
  return {
    success: false,
    message: "No image found in response.",
    retryable: true
  };
}
async function requestWithFallback(finalPrompt, imageBase64, usedKeys = new Set()) {
  for (let i = 0; i < GEMINI_API_KEY.length; i++) {
    const apiKey = GEMINI_API_KEY[i];
    if (usedKeys.has(apiKey)) continue;
    log(`Trying API key ${i + 1}/${GEMINI_API_KEY.length}: ${apiKey.slice(0, 15)}...`);
    try {
      const response = await fetch(GENERATE_ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(createRequestBody(finalPrompt, imageBase64)),
        timeout: 6e4
      });
      const data = await response.json();
      if (!response.ok) {
        const errMsg = data?.error?.message || `HTTP ${response.status}`;
        log(`HTTP Error ${response.status}: ${errMsg}`);
        const isAuthError = response.status === 401 || response.status === 403;
        const isQuotaError = response.status === 429 || /quota|limit/i.test(errMsg);
        const isInvalidKey = /invalid.*key|unauthorized/i.test(errMsg);
        if (isAuthError || isInvalidKey || isQuotaError) {
          usedKeys.add(apiKey);
          log(`Key ${i + 1} invalid/expired/quota exceeded. Skipping.`);
          continue;
        }
        const result = extractImageResult(data);
        if (result.success) return {
          ...result,
          usedKey: apiKey
        };
        if (!result.retryable) return result;
        continue;
      }
      const result = extractImageResult(data);
      if (result.success) {
        log(`Success with key ${i + 1}`);
        return {
          ...result,
          usedKey: apiKey
        };
      }
      if (!result.retryable) {
        return result;
      }
    } catch (error) {
      log(`Network error with key ${i + 1}: ${error.message}`);
      usedKeys.add(apiKey);
    }
  }
  return {
    success: false,
    message: "All API keys failed or exhausted."
  };
}
class GeminiGhibli {
  async generate({
    prompt,
    imageUrl,
    film = null,
    ...rest
  }) {
    try {
      log("Generation started");
      const hasImage = !!imageUrl;
      const mode = hasImage ? "image-to-image" : "text-to-image";
      log(`Mode: ${mode}`);
      const finalPrompt = buildGhibliPrompt(prompt ?? "", film);
      const imageBase64 = hasImage ? await resolveImageInput(imageUrl) : null;
      const result = await requestWithFallback(finalPrompt, imageBase64);
      log("Generation completed");
      return result;
    } catch (error) {
      log(`Runtime error: ${error.message}`);
      return {
        success: false,
        message: error.message
      };
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
  const api = new GeminiGhibli();
  try {
    const data = await api.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}