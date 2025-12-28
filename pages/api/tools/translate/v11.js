import axios from "axios";
class TranslationService {
  constructor() {
    this.env = {
      processMode: "production",
      apiBaseUrl: "https://deeptranslate.ai/trans",
      homeUrl: "https://deeptranslate.ai"
    };
    this.defaultProvider = "OpenAI";
    this.fallbackProvider = "bing";
    this.services = new Map();
    this.initializeServices();
  }
  initializeServices() {
    this.services.set("bing", this.createBingTranslator());
    this.services.set("openai", this.createOpenAITranslator());
  }
  async translate({
    provider = this.defaultProvider,
    text,
    from = "auto",
    to = "id",
    ...rest
  }) {
    const texts = Array.isArray(text) ? text : [text];
    const service = this.services.get(provider.toLowerCase());
    if (!service) {
      throw new Error(`Penyedia '${provider}' tidak tersedia.`);
    }
    try {
      const options = {
        sourceLanguage: from,
        targetLanguage: to,
        ...rest
      };
      return await service.translate(texts, options);
    } catch (error) {
      console.warn(`Terjemahan dengan ${provider} gagal: ${error.message}`);
      if (this.fallbackProvider && this.fallbackProvider !== provider) {
        console.log(`Mencoba penyedia fallback: ${this.fallbackProvider}`);
        const fallbackService = this.services.get(this.fallbackProvider.toLowerCase());
        if (fallbackService) {
          const fallbackOptions = {
            sourceLanguage: from,
            targetLanguage: to,
            ...rest
          };
          return await fallbackService.translate(texts, fallbackOptions);
        }
      }
      throw error;
    }
  }
  BingAuthManager() {
    let authToken = null;
    let lastAuthTime = null;
    let pendingAuth = null;
    return {
      getAuthToken: async () => {
        const isTokenExpired = () => !lastAuthTime || Date.now() - lastAuthTime > 30 * 60 * 1e3;
        if (authToken && !isTokenExpired()) {
          return authToken;
        }
        if (pendingAuth) {
          return pendingAuth;
        }
        pendingAuth = new Promise(async (resolve, reject) => {
          try {
            const response = await axios.get("https://edge.microsoft.com/translate/auth", {
              timeout: 1e4
            });
            if (response.data?.length > 1) {
              authToken = response.data;
              lastAuthTime = Date.now();
              resolve(authToken);
            } else {
              reject(new Error("Gagal mendapatkan token otentikasi Bing."));
            }
          } catch (error) {
            reject(new Error(`Otentikasi Bing gagal: ${error.message}`));
          } finally {
            pendingAuth = null;
          }
        });
        return pendingAuth;
      }
    };
  }
  createBingTranslator() {
    const authManager = this.BingAuthManager();
    const normalizeLanguageCode = code => {
      const mapping = {
        auto: "auto-detect",
        "zh-CN": "zh-Hans",
        "zh-TW": "zh-Hant",
        tl: "fil",
        hmn: "mww",
        ckb: "kmr",
        mn: "mn-Cyrl",
        no: "nb",
        sr: "sr-Cyrl"
      };
      return mapping[code] ?? code;
    };
    return {
      translate: async (texts, {
        sourceLanguage,
        targetLanguage
      }) => {
        const token = await authManager.getAuthToken();
        const requestBody = texts.map(text => ({
          Text: text
        }));
        const params = {
          "api-version": "3.0",
          to: normalizeLanguageCode(targetLanguage),
          includeSentenceLength: true
        };
        if (sourceLanguage !== "auto") {
          params.from = normalizeLanguageCode(sourceLanguage);
        }
        try {
          const response = await axios.post("https://api-edge.cognitive.microsofttranslator.com/translate", requestBody, {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json"
            },
            params: params
          });
          const raw = response.data;
          const result = raw?.map(item => item?.translations?.[0]?.text ?? "") ?? [];
          return {
            result: result,
            raw: raw
          };
        } catch (error) {
          throw new Error(`API Bing Translate error: ${error.message}`);
        }
      }
    };
  }
  createOpenAITranslator() {
    return {
      translate: async (texts, {
        sourceLanguage,
        targetLanguage,
        translatorCode = "1",
        promptBuilderCode = 0
      }) => {
        const requestBody = {
          translateUrl: this.env.homeUrl,
          targetLanguage: targetLanguage === "ja" ? "Japanese" : targetLanguage,
          translatorCode: translatorCode,
          promptBuilderCode: promptBuilderCode,
          texts: texts.map((text, index) => ({
            id: index.toString(),
            content: text
          }))
        };
        if (sourceLanguage !== "auto") {
          requestBody.sourceLanguage = sourceLanguage;
        }
        try {
          const response = await axios.post(`${this.env.apiBaseUrl}/portal/translate/textTranslate`, requestBody, {
            headers: {
              "Content-Type": "application/json",
              Sign: "PC6/JXgymOhlSbt9gEMq03LgdduKB0++YN8iH5CWnyU="
            }
          });
          const raw = response.data;
          const result = raw?.data?.texts?.map(t => t?.translation ?? "") ?? [];
          return {
            result: result,
            raw: raw
          };
        } catch (error) {
          throw new Error(`API OpenAI Translate error: ${error.message}`);
        }
      }
    };
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.text) {
    return res.status(400).json({
      error: "Parameter 'text' diperlukan"
    });
  }
  const api = new TranslationService();
  try {
    const data = await api.translate(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}