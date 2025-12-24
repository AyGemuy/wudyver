import axios from "axios";
import apiConfig from "@/configs/apiConfig";
import SpoofHead from "@/lib/spoof-head";
class VideogenAPI {
  constructor(baseURL = "https://api.videogen.io") {
    this.api = axios.create({
      baseURL: baseURL,
      headers: {
        accept: "*/*",
        "accept-language": "id-ID,id;q=0.9",
        "content-type": "application/json",
        origin: "https://app.videogen.io",
        priority: "u=1, i",
        referer: "https://app.videogen.io/",
        "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-site",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
        ...SpoofHead()
      }
    });
    this.supabase = axios.create({
      baseURL: "https://luobljrujjqjayuuoadj.supabase.co",
      headers: {
        accept: "*/*",
        "accept-language": "id-ID,id;q=0.9",
        apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx1b2JsanJ1ampxamF5dXVvYWRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM1NDE0MjUsImV4cCI6MjA1OTExNzQyNX0.9qRyIxeIgPbbwDqpb9zwEe8VvXW7mvbUSGOEhfFnXz0",
        authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx1b2JsanJ1ampxamF5dXVvYWRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM1NDE0MjUsImV4cCI6MjA1OTExNzQyNX0.9qRyIxeIgPbbwDqpb9zwEe8VvXW7mvbUSGOEhfFnXz0",
        "content-type": "application/json;charset=UTF-8",
        origin: "https://app.videogen.io",
        referer: "https://app.videogen.io/",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "cross-site",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
        "x-client-info": "supabase-js-web/2.49.4",
        "x-supabase-api-version": "2024-01-01"
      }
    });
  }
  async genTempEmail() {
    try {
      console.log("API Step: Generating temporary email...");
      const res = await axios.get(`https://${apiConfig.DOMAIN_URL}/api/mails/v9?action=create`);
      return res.data.email;
    } catch (e) {
      console.error("API Error: genTempEmail failed:", e.message);
      throw e;
    }
  }
  async getMsgs(email) {
    let attempts = 0;
    const maxAttempts = 60;
    const delay = 3e3;
    while (attempts < maxAttempts) {
      try {
        console.log(`API Step: Fetching messages (attempt ${attempts + 1}/${maxAttempts})...`);
        const res = await axios.get(`https://${apiConfig.DOMAIN_URL}/api/mails/v9?action=message&email=${email}`);
        if (res.data.data && res.data.data.length > 0) return res.data.data;
      } catch (e) {
        console.error(`API Error: getMsgs attempt ${attempts + 1} failed:`, e.message);
      }
      await new Promise(r => setTimeout(r, delay));
      attempts++;
    }
    throw new Error("No messages received after multiple attempts.");
  }
  getOtp(textContent) {
    try {
      const match = textContent.match(/(\d{6})/);
      if (match && match[1]) return match[1];
      throw new Error("OTP not found in email content. Expected a 6-digit number.");
    } catch (e) {
      console.error("Processing Error: getOtp failed:", e.message);
      throw e;
    }
  }
  async reqOtp(email) {
    try {
      console.log("API Step: Requesting OTP via Supabase...");
      const data = {
        email: email,
        data: {},
        create_user: true,
        gotrue_meta_security: {},
        code_challenge: null,
        code_challenge_method: null
      };
      const res = await this.supabase.post("/auth/v1/otp", data);
      if (res.status !== 200) throw new Error(`OTP request failed with status: ${res.status}`);
      return res.data;
    } catch (e) {
      console.error("API Error: reqOtp failed:", e.message);
      throw e;
    }
  }
  async verifyOtp(email, token) {
    try {
      console.log("API Step: Verifying OTP via Supabase...");
      const data = {
        email: email,
        token: token,
        type: "email",
        gotrue_meta_security: {}
      };
      const res = await this.supabase.post("/auth/v1/verify", data);
      if (res.status !== 200) throw new Error(`OTP verification failed with status: ${res.status}`);
      return res.data;
    } catch (e) {
      console.error("API Error: verifyOtp failed:", e.message);
      throw e;
    }
  }
  async refreshAuthToken(refreshToken) {
    try {
      console.log("API Step: Refreshing auth token via Supabase...");
      const data = {
        refresh_token: refreshToken
      };
      const res = await this.supabase.post("/auth/v1/token?grant_type=refresh_token", data);
      if (res.status !== 200) throw new Error(`Token refresh failed with status: ${res.status}`);
      return res.data;
    } catch (e) {
      console.error("API Error: refreshAuthToken failed:", e.message);
      throw e;
    }
  }
  async generateVideo(accessToken, videoGenerationRequest) {
    try {
      console.log("API Step: Generating video...");
      const res = await this.api.post("/generate/generate-video", {
        videoGenerationRequest: videoGenerationRequest
      }, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });
      if (res.status !== 200) throw new Error(`Video generation request failed with status: ${res.status}`);
      return res.data;
    } catch (e) {
      console.error("API Error: generateVideo failed:", e.message);
      throw e;
    }
  }
  async generate({
    prompt,
    ...rest
  }) {
    let email = null;
    let otp = null;
    let userSession = null;
    const baseVideoRequestData = {
      generationScope: {
        type: "PROJECT",
        projectId: "725b3c6e-982f-4680-b662-38e6aeae01ed"
      },
      generatableVideo: {
        title: "Tanpa Judul",
        theme: {
          captionTextStyle: {
            font: {
              fontSize: 48,
              fontWeight: 400,
              fontName: "Verdana"
            },
            textColor: {
              red: 255,
              green: 255,
              blue: 255
            },
            textJustification: "CENTER",
            verticalAlignment: "BOTTOM",
            strokeColor: null,
            strokeWeight: 0,
            backgroundStyle: {
              type: "WRAPPED",
              backgroundColor: {
                red: 0,
                green: 0,
                blue: 0
              },
              borderRadiusProportion: .25,
              opacityProportion: .5
            },
            isHidden: false,
            spokenTextColor: null,
            spokenTextStrokeColor: null,
            persistSpokenTextColor: false
          },
          titleTextStyle: {
            font: {
              fontSize: 144,
              fontWeight: 700,
              fontName: "Verdana"
            },
            textColor: {
              red: 255,
              green: 255,
              blue: 255
            },
            textJustification: "CENTER",
            verticalAlignment: "BOTTOM",
            strokeColor: null,
            strokeWeight: 0,
            backgroundStyle: null,
            isHidden: false,
            spokenTextColor: null,
            spokenTextStrokeColor: null,
            persistSpokenTextColor: false
          },
          subtitleTextStyle: {
            font: {
              fontSize: 72,
              fontWeight: 400,
              fontName: "Verdana"
            },
            textColor: {
              red: 240,
              green: 240,
              blue: 240
            },
            textJustification: "CENTER",
            verticalAlignment: "TOP",
            strokeColor: null,
            strokeWeight: 0,
            backgroundStyle: null,
            isHidden: false,
            spokenTextColor: null,
            spokenTextStrokeColor: null,
            persistSpokenTextColor: false
          },
          scrimColor: {
            red: 0,
            green: 0,
            blue: 0,
            alpha: .5
          }
        },
        aspectRatio: {
          width: 16,
          height: 9
        },
        sections: [{
          type: "TEXT",
          sectionId: "/<v5+7`k&",
          text: prompt,
          title: "",
          subtitle: "",
          ttsVoice: {
            providerName: "ELEVEN_LABS",
            languageCode: "id-ID",
            voiceId: "WXmGNP5rvPWuO0RYTqfP"
          },
          ttsVolume: 1,
          elevenLabsTtsOptions: {
            modelId: "eleven_turbo_v2_5",
            stability: .5,
            similarityBoost: .75
          },
          generatedChunks: [],
          lastVoiceGenerationInput: null,
          backgroundAssetReferences: [{
            refId: "A2qX&zp(`",
            locator: null,
            duration: 3,
            containAndBlur: false,
            animation: {
              type: "NONE"
            },
            offsetProportion: null,
            offsetSeconds: 0,
            volume: 0
          }],
          overlayType: "CAPTIONS",
          outputLanguageCode: null
        }],
        pronunciationReplacements: [],
        inputStorageFileLocators: [],
        mediaLibrarySelections: [{
          type: "PEXELS"
        }],
        bRollSceneFrequency: {
          minWordsPerScene: 5,
          maxWordsPerScene: 15
        },
        outputLanguageCode: "id",
        imageGenStyle: "",
        scrapedWebsiteInfos: {},
        generationTemperature: 0
      },
      sectionIdGenerationConfigRecord: {
        "/<v5+7`k&": {
          titleGenerationMode: "IF_UNPROVIDED",
          subtitleGenerationMode: "IF_UNPROVIDED"
        }
      },
      titleGenerationMode: "IF_UNPROVIDED"
    };
    const videoGenerationRequest = {
      ...baseVideoRequestData,
      generatableVideo: {
        ...baseVideoRequestData.generatableVideo,
        ...rest
      }
    };
    try {
      email = await this.genTempEmail();
      await this.reqOtp(email);
      const messages = await this.getMsgs(email);
      otp = this.getOtp(messages[0].text_content);
      userSession = await this.verifyOtp(email, otp);
      const accessToken = userSession.access_token;
      const videoGenRes = await this.generateVideo(accessToken, videoGenerationRequest);
      console.log("Process: Video generation completed successfully!");
      return {
        ...userSession,
        ...videoGenRes
      };
    } catch (error) {
      console.error("Process: An error occurred during automated video generation:", error.message);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Prompt are required"
    });
  }
  try {
    const videogen = new VideogenAPI();
    const response = await videogen.generate(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}