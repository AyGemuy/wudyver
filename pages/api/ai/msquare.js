import WebSocket from "ws";
class WebSocketClient {
  constructor() {
    this.url = "wss://na-runtime-2.vg-stuff.com/interact";
    this.headers = {
      Upgrade: "websocket",
      Origin: "https://www.msquare.pro",
      "Cache-Control": "no-cache",
      "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
      Pragma: "no-cache",
      Connection: "Upgrade",
      "Sec-WebSocket-Key": "w1tntoQjM3mS0q8r5QUTng==",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      "Sec-WebSocket-Version": "13",
      "Sec-WebSocket-Extensions": "permessage-deflate; client_max_window_bits"
    };
    this.ws = null;
    this.metadataResponse = null;
    this.defaultPayload = {
      agentId: "nvjjvg91xhh99lut",
      convoId: "nvjjvg91xhh99lut_MZhCbXdy2WMfvUg",
      bucket: "(default)",
      prompt: "Halo",
      agentData: {
        scrollAnimation: true,
        ADVANCED_customCSS: "",
        buttonsLayout: "vertical",
        headerImageUrl: "https://pub-78d23252e3324567b5ee23d57acddddd.r2.dev/public/z3iks8bn_.jpeg",
        enableCache: true,
        listenForUrlChanges: false,
        lang: "en",
        lastModified: 1737957076,
        proactiveMessage: "none",
        vg_initPrompt: 'Greet the user with "Hi, I\'m Gemini, your virtual assistant. How can I assist you today?"',
        recordChatHistory: true,
        UIhandoffSubtitle: "We reply within minutes ⚡",
        ownerID: "EvFU4UzXnmdDv3Y8aQuyBsi6b463",
        vapiConfig: {
          enableVapiOnWeb: true,
          PUBLIC_API_KEY: "df7ad28f-e603-48c0-b2a1-7b0eaa24f2e0",
          maxMinutesMonthly: 0,
          promptOnWeb: false
        },
        ts: 1737957076,
        autoStartWidget: true,
        theme: "blue-dark",
        title: "Gemini",
        roundedImageURL: "https://cdn-icons-png.flaticon.com/512/13330/13330989.png",
        vg_systemPrompt: "##Identity: \n - You are an AI chat assistant",
        vg_kbDefaultDimension: 1536,
        voiceConfig: {
          transcriber: {
            modelId: "nova-2",
            provider: "deepgram"
          },
          speechGen: {
            provider: "elevenlabs",
            voiceId: "21m00Tcm4TlvDq8ikWAM"
          }
        },
        withRefresh: true,
        vg_maxTokens: 4608,
        vg_defaultModel: "gpt-4o-mini",
        maxTokensUsage: 0,
        vg_enableUIEngine: true,
        ID: "nvjjvg91xhh99lut",
        chatBgURL: "https://firebasestorage.googleapis.com/v0/b/voiceglow-cdn/o/public%2F5fiqiqvk_.png?alt=media&token=86cc32ad-fb9a-4e06-927a-89d8879d1649",
        ui: {
          voice: {
            question: ""
          },
          bgImageVisible: true
        },
        vg_initMessages: ["Hi, I'm Gemini, your virtual assistant. How can I assist you today?\n\n"],
        userId: "EvFU4UzXnmdDv3Y8aQuyBsi6b463",
        bannerImageUrl: "https://pub-78d23252e3324567b5ee23d57acddddd.r2.dev/public/9kxwvsrx_.jpeg",
        description: "Your Automation Assistant.",
        UIhandoffTitle: "Support Team",
        tabs: [{
          label: "Home",
          key: "home",
          homeSpecific: {
            headerTitle: "Hi, {user.name}!",
            headerHeight: 20,
            headerDescription: "How can we help you today??",
            buttons: [{
              key: "askQuestion",
              label: "Ask a question",
              show: true,
              iceBreakers: ["Track my order", "New arrivals"]
            }, {
              key: "recentConvo",
              label: "Continue recent conversation",
              show: true
            }, {
              key: "liveCall",
              label: "Start a live call",
              show: true
            }, {
              key: "directHandoff",
              label: "Talk to a human agent",
              show: true
            }]
          },
          iframeUrl: "https://calendly.com/moeaymandev/ai-talk?preview_source=et_card",
          iframeHeight: 1e3
        }, {
          label: "Chats",
          key: "convos"
        }, {
          label: "FAQ",
          key: "faq",
          iframeUrl: "https://calendly.com/moeaymandev/ai-talk?preview_source=et_card",
          iframeHeight: 500
        }],
        assignedToolsIds: ["V92DrT4kyV4QrhY", "rreM7ueY92yrKwYd1VnF"],
        syncBrowser: false,
        vg_temperature: .4,
        kbTags: ["company", "products", "services", "faq", ""],
        agentPlatform: "vg",
        topics: ["User assistance request"],
        id: "nvjjvg91xhh99lut",
        branding: "Powered by Msquare Automation Assistant",
        vg_kbTopChunks: 5,
        vapi: {
          endCallMessage: "Thank you for contacting Msquare. Have a great day!",
          clientMessages: ["transcript", "hang", "function-call", "speech-update", "metadata", "transfer-update", "conversation-update"],
          backgroundSound: "office",
          serverMessages: ["end-of-call-report", "conversation-update", "status-update"],
          orgId: "f238ad7b-4e43-4fb9-8f65-24be39fb8387",
          recordingEnabled: true,
          firstMessage: "Hello this is Gemini from Msquare. How are you today?",
          stopSpeakingPlan: {
            numWords: 3
          },
          transcriber: {
            provider: "deepgram",
            language: "en-US",
            model: "nova-2"
          },
          name: "VOICE GLOW",
          backchannelingEnabled: false,
          createdAt: "2024-10-17T03:57:54.103Z",
          id: "237b5577-e80d-469d-ab04-1e0ca5a9e1bf",
          endCallFunctionEnabled: true,
          responseDelaySeconds: .2,
          numWordsToInterruptAssistant: 1,
          serverUrlSecret: "",
          backgroundDenoisingEnabled: true,
          messagePlan: {
            idleMessages: ["Is there anything else you need help with?", "Are you still there?"],
            idleTimeoutSeconds: 5.7
          },
          serverUrl: "",
          isServerUrlSecretSet: true,
          voicemailMessage: "Hey this is Gemini from Msquare. Please call back when you're available.",
          endCallPhrases: ["goodbye", "talk to you soon", "call you later", "I'll call back", "let's talk later", "bye"],
          model: {
            model: "gpt-4o",
            toolIds: ["483457ed-c8af-488d-a534-8b9eaec74bcc", "bb1a9a10-7780-4bf7-8790-d1f7a0cf827f"],
            provider: "openai",
            messages: [{
              role: "system",
              content: "[identity] \nYou are a voice assistant"
            }],
            maxTokens: 250,
            knowledgeBase: {
              topK: 2,
              provider: "canonical",
              fileIds: ["4c02f979-738e-478c-9b0c-384d6c9d6148"]
            }
          },
          useFunctions: true,
          functionPlan: {
            image: "automated-assistant-stamp",
            key: "display-action"
          }
        },
        relatedLinks: [{
          title: "VoiceFlow",
          url: "https://www.voiceflow.com"
        }],
        whatsAppLink: "https://wa.me/6285743773660?text=Hello"
      }
    };
  }
  async connect(payload = this.defaultPayload) {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.url, {
        headers: this.headers
      });
      this.ws.on("open", () => this.sendMessage(payload));
      this.ws.on("message", message => this.handleMessage(message, resolve));
      this.ws.on("error", error => {
        console.error("WebSocket error:", error);
        reject(error);
      });
      this.ws.on("close", () => console.log("WebSocket connection closed"));
    });
  }
  async sendMessage(input) {
    const payload = {
      ...this.defaultPayload,
      ...input
    };
    this.ws.send(JSON.stringify(payload));
  }
  handleMessage(message, resolve) {
    try {
      const response = JSON.parse(message.toString("utf-8"));
      if (response.type === "metadata") {
        this.metadataResponse = response.metadata.turns.pop().messages.pop().item.payload.message;
        console.log("Metadata Response:", response);
        resolve({
          result: this.metadataResponse,
          metadata: response.metadata
        });
        this.disconnect();
      }
    } catch (err) {
      console.error("Error parsing message:", err);
    }
  }
  async disconnect() {
    if (this.ws) this.ws.close();
  }
}
export default async function handler(req, res) {
  const {
    prompt,
    ...params
  } = req.method === "POST" ? req.body : req.query;
  if (!prompt) {
    return res.status(400).json({
      message: "Prompt is required."
    });
  }
  try {
    const wsClient = new WebSocketClient();
    const result = await wsClient.connect({
      prompt: prompt,
      ...params
    });
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      message: error.message
    });
  }
}