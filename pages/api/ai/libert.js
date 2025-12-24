import axios from "axios";
import SpoofHead from "@/lib/spoof-head";
const promptFormats = {
  hermes: {
    userPrepend: "<|im_start|>",
    userAppend: "\n",
    logStart: "",
    lineSeparator: "\n",
    stopSequence: "<|im_end|>",
    additionalStopSequences: ["<|endoftext|>", "<|", "</|", "</assistant", "</user", "<im_end|>"]
  },
  phi3: {
    userPrepend: "<|",
    userAppend: "|>",
    logStart: "",
    lineSeparator: "\n",
    stopSequence: "<|end|>",
    additionalStopSequences: ["<|endoftext|>", "<|", "</|"]
  },
  deepseek: {
    userPrepend: "<|",
    userAppend: "|>",
    logStart: "<|begin_of_sentence|>",
    lineSeparator: "",
    stopSequence: "<|end_of_sentence|>",
    additionalStopSequences: ["<|endoftext|>", "<|", "</|"]
  },
  nemotron: {
    userPrepend: "<|start_header_id|>",
    userAppend: "<|end_header_id|>",
    logStart: "",
    lineSeparator: "\n",
    stopSequence: "<|eot_id|>",
    additionalStopSequences: ["<|eot_id|>", "<|endoftext|>", "<|"]
  }
};
const defaultParams = {
  maxTokens: 8192,
  maxPredict: 512,
  maxTries: 60,
  temperature: .7,
  minP: .05,
  topP: .9,
  topK: 40,
  promptFormat: promptFormats.hermes,
  withCredentials: true
};
class ChatAPI {
  constructor() {
    this.client = axios.create({
      headers: {
        accept: "application/json, text/plain, */*",
        "accept-language": "id-ID,id;q=0.9",
        "cache-control": "no-cache",
        "content-type": "application/json",
        origin: "https://chat.libertai.io",
        pragma: "no-cache",
        priority: "u=1, i",
        referer: "https://chat.libertai.io/",
        "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "cross-site",
        "sec-fetch-storage-access": "none",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
        ...SpoofHead()
      },
      withCredentials: true,
      timeout: 6e4
    });
    this.defaultSystemPrompt = "You're an assistant running on a decentralized LLM based on open-source models. You operate on a libertai.io, an inference platform on top of the aleph.im decentralized cloud. You are very smart and knowledgeable. You will give helpful, detailed, and polite answers to users' questions. Your answers are formatted using markdown. You will now interact with user. You have access to Hermes 3 (Llama 3.1 8B, fast) in order to operate.";
    this.models = [{
      id: "c237ead6-165e-4725-af4f-a1b50b770e1e",
      name: "Hermes 3 (Llama 3.1 8B, fast)",
      ...defaultParams,
      apiUrl: "https://curated.aleph.cloud/vm/84df52ac4466d121ef3bb409bb14f315de7be4ce600e8948d71df6485aa5bcc3/completion",
      promptFormat: promptFormats.hermes,
      maxPredict: 1024,
      premium: false
    }, {
      id: "7bcffd59-461e-41a8-8428-80bcb44a77cd",
      name: "Mistral Nemo (Instruct)",
      ...defaultParams,
      apiUrl: "https://curated.aleph.cloud/vm/2c4ad0bf343fb12924936cbc801732d95ce90f84cd895aa8bee82c0a062815c2/completion",
      promptFormat: promptFormats.hermes,
      maxPredict: 1024,
      premium: false
    }, {
      id: "a8ba5cfe-bd86-4f81-97fa-8f68300488b7",
      name: "Thought (14B, distilled R1)",
      ...defaultParams,
      apiUrl: "https://curated.aleph.cloud/vm/a8b6d895cfe757d4bc5db9ba30675b5031fe3189a99a14f13d5210c473220caf/completion",
      maxTokens: 32768,
      maxPredict: 2048,
      minP: .1,
      topP: .95,
      temperature: .8,
      promptFormat: promptFormats.deepseek,
      premium: false
    }, {
      id: "b253aacf-cbbc-4e46-8187-74bfd5398d78",
      name: "Phi-3-mini (3.8B, long context)",
      ...defaultParams,
      apiUrl: "https://curated.aleph.cloud/vm/ad482633bac1f1fae071fb3908c49ebe8d30e3dbeb047051a8ee1b206f2ef830/completion",
      promptFormat: promptFormats.phi3,
      maxTokens: 131072,
      maxPredict: 2048,
      premium: false
    }, {
      id: "173ad7b5-4aa9-4ccd-8fdd-f8122499c2cb",
      name: "Nemotron (70B, genius, slow)",
      ...defaultParams,
      apiUrl: "https://curated.aleph.cloud/vm/055e1267fb63f5961e8aee890cfc3f61387deee79f37ce51a44b21feee57d40b/completion",
      maxTokens: 16384,
      maxPredict: 2048,
      minP: .1,
      topP: .95,
      temperature: .8,
      promptFormat: promptFormats.nemotron,
      premium: true
    }, {
      id: "c55a8d42-9f2f-4821-aa60-ee9ff8055e50",
      name: "DeepSeek Coder V2 (6.7B, developer)",
      ...defaultParams,
      apiUrl: "https://curated.aleph.cloud/vm/b950fef19b109ef3770c89eb08a03b54016556c171b9a32475c085554b594c94/completion",
      maxTokens: 16384,
      maxPredict: 2048,
      promptFormat: promptFormats.deepseek,
      premium: false
    }, {
      id: "baecea75-d71a-42e6-9b3f-cb37956683e1",
      name: "DeepSeek V3 (671B, genius MoE)",
      ...defaultParams,
      apiUrl: "https://curated.aleph.cloud/vm/9aa80dc7f00c515a5f56b70e65fdab4c367e35f341c3b4220419adb6ca86a33f/completion",
      maxTokens: 16384,
      maxPredict: 2048,
      promptFormat: promptFormats.deepseek,
      premium: false
    }, {
      id: "b2bc2ef7-f0bc-416b-bac2-a07c581440d5",
      name: "DeepSeek R1 671B",
      ...defaultParams,
      apiUrl: "https://curated.aleph.cloud/vm/6de52d201e6a8247a4c54d6b4f1fb7a01a1814c57b7344898b2d3257b5c46810/completion",
      maxTokens: 16384,
      maxPredict: 2048,
      promptFormat: promptFormats.deepseek,
      premium: false
    }, {
      id: "d0afaa7f-fa9c-4f5f-9840-e4ff035bcf83",
      name: "QWQ (32B, reasoning, dev)",
      ...defaultParams,
      apiUrl: "https://code-res.model.libertai.io/completion",
      maxTokens: 16384,
      maxPredict: 2048,
      promptFormat: promptFormats.hermes,
      premium: false
    }];
  }
  async chat({
    prompt,
    model = 0,
    systemPrompt,
    history = [],
    maxPredict = null,
    ...rest
  }) {
    const modelInfo = this.getModelInfo(model);
    const apiUrl = modelInfo.apiUrl;
    const promptFormat = modelInfo.promptFormat;
    const finalSystemPrompt = systemPrompt || this.defaultSystemPrompt;
    const formattedPrompt = this.#formatPrompt(finalSystemPrompt, prompt, history, promptFormat);
    const promptLength = formattedPrompt.length;
    const calculatedMaxPredict = Math.min(modelInfo.maxTokens - promptLength - 100, maxPredict || modelInfo.maxPredict || 512);
    const requestData = {
      prompt: formattedPrompt,
      stream: false,
      temperature: modelInfo.temperature || .7,
      n_predict: Math.max(calculatedMaxPredict, 100),
      top_p: modelInfo.topP || .9,
      top_k: modelInfo.topK || 40,
      min_p: modelInfo.minP || .05,
      typical_p: 1,
      tfs_z: 1,
      id_slot: 1,
      slot_id: 1,
      cache_prompt: true,
      stop: [promptFormat.stopSequence, ...promptFormat.additionalStopSequences],
      repeat_penalty: 1.1,
      repeat_last_n: 64,
      ...rest
    };
    try {
      const response = await this.client.post(apiUrl, requestData, {
        timeout: 12e4
      });
      if (!response.data || typeof response.data.content !== "string") {
        throw new Error("Invalid response format from API");
      }
      return response.data;
    } catch (error) {
      console.error("Error in chat request:", error);
      if (error.code === "ECONNABORTED" || error.response?.status >= 500) {
        console.log("Retrying request...");
        return this.chat({
          prompt: prompt,
          model: model,
          systemPrompt: systemPrompt,
          history: history,
          maxPredict: maxPredict,
          ...rest
        });
      }
      throw new Error(`Failed to get response from ${modelInfo.name}: ${error.message}`);
    }
  }
  #formatPrompt(systemPrompt, userPrompt, history = [], promptFormat) {
    let formattedPrompt = "";
    if (promptFormat.logStart) {
      formattedPrompt += promptFormat.logStart;
    }
    formattedPrompt += `${promptFormat.userPrepend}system${promptFormat.userAppend}${systemPrompt}${promptFormat.stopSequence}${promptFormat.lineSeparator}`;
    let historyLength = 0;
    const maxHistoryTokens = 2048;
    for (const message of history) {
      const role = message.role === "user" ? "user" : "assistant";
      const messageContent = `${promptFormat.userPrepend}${role}${promptFormat.userAppend}${message.content}${promptFormat.stopSequence}${promptFormat.lineSeparator}`;
      if (historyLength + messageContent.length > maxHistoryTokens) {
        break;
      }
      formattedPrompt += messageContent;
      historyLength += messageContent.length;
    }
    formattedPrompt += `${promptFormat.userPrepend}user${promptFormat.userAppend}${userPrompt}${promptFormat.stopSequence}${promptFormat.lineSeparator}`;
    formattedPrompt += `${promptFormat.userPrepend}assistant${promptFormat.userAppend}`;
    return formattedPrompt;
  }
  getModels() {
    return this.models.map((model, index) => ({
      id: model.id,
      index: index,
      name: model.name,
      apiUrl: model.apiUrl,
      maxTokens: model.maxTokens,
      maxPredict: model.maxPredict,
      premium: model.premium
    }));
  }
  getModelInfo(modelIdentifier) {
    let model;
    if (typeof modelIdentifier === "number") {
      if (modelIdentifier < 0 || modelIdentifier >= this.models.length) {
        throw new Error(`Model index ${modelIdentifier} is out of range.`);
      }
      model = this.models[modelIdentifier];
    } else {
      model = this.models.find(m => m.id === modelIdentifier);
      if (!model) {
        throw new Error(`Model with ID ${modelIdentifier} not found.`);
      }
    }
    return {
      id: model.id,
      name: model.name,
      apiUrl: model.apiUrl,
      maxTokens: model.maxTokens,
      maxPredict: model.maxPredict,
      temperature: model.temperature,
      topP: model.topP,
      topK: model.topK,
      minP: model.minP,
      promptFormat: model.promptFormat,
      withCredentials: model.withCredentials,
      premium: model.premium
    };
  }
  setDefaultSystemPrompt(prompt) {
    this.defaultSystemPrompt = prompt;
  }
  getModelByName(modelName) {
    const model = this.models.find(m => m.name === modelName);
    if (!model) {
      throw new Error(`Model with name ${modelName} not found.`);
    }
    return this.getModelInfo(model.id);
  }
  getModelByIndex(index) {
    return this.getModelInfo(index);
  }
  estimateTokenCount(text) {
    return Math.ceil(text.length / 4);
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
    const chatAPI = new ChatAPI();
    const response = await chatAPI.chat(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}