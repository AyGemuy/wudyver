import fetch from "node-fetch";
import crypto from "crypto";
class MetaAI {
  constructor() {
    this.name = "MetaAI";
    this.models = [{
      model: "llama",
      stream: true
    }];
    this.url = "https://graph.meta.ai/graphql?locale=user";
    this.cookiesUrl = "https://www.meta.ai/";
    this.tokenUrl = "https://www.meta.ai/api/graphql";
    this.accessToken = null;
    this.lsd = null;
    this.cookies = null;
    this.DEFAULT_HEADERS = {
      accept: "*/*",
      "accept-encoding": "gzip, deflate",
      "accept-language": "en-US",
      referer: "",
      "sec-ch-ua": '"Google Chrome";v="123", "Not:A-Brand";v="8", "Chromium";v="123"',
      "sec-ch-ua-arch": '"x86"',
      "sec-ch-ua-bitness": '"64"',
      "sec-ch-ua-full-version": '"123.0.6312.122"',
      "sec-ch-ua-full-version-list": '"Google Chrome";v="123.0.6312.122", "Not:A-Brand";v="8.0.0.0", "Chromium";v="123.0.6312.122"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-model": '""',
      "sec-ch-ua-platform": '"Windows"',
      "sec-ch-ua-platform-version": '"15.0.0"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36"
    };
  }
  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
  format_chat_to_prompt(chat, {
    model = null,
    assistant = true
  } = {}) {
    model = model?.toLowerCase() || "";
    let prompt = "";
    if (model.includes("meta-llama-3")) {
      prompt += "<|begin_of_text|>";
      for (let i = 0; i < chat.length; i++) {
        prompt += `<|start_header_id|>${chat[i].role}<|end_header_id|>`;
        prompt += `\n${chat[i].content}<|eot_id|>`;
      }
      if (assistant) prompt += "<|start_header_id|>assistant<|end_header_id|>";
    } else if (model.includes("mixtral")) {
      for (let i = 0; i < chat.length; i++) {
        if (chat[i].role === "user") {
          prompt += `<s> [INST] ${chat[i].content} [/INST]`;
        } else if (chat[i].role === "assistant") {
          prompt += ` ${chat[i].content}</s>`;
        }
      }
    } else {
      for (let i = 0; i < chat.length; i++) {
        prompt += this.capitalize(chat[i].role) + ": " + chat[i].content + "\n";
      }
      if (assistant) prompt += "Assistant:";
    }
    return prompt;
  }
  genUUID() {
    return crypto.randomUUID();
  }
  genOfflineId() {
    const randomValue = Math.floor(Math.random() * (1 << 22));
    const timestamp = Date.now();
    return (timestamp << 22 | randomValue).toString();
  }
  extractVal(text, key = null, startStr = null, endStr = '",') {
    if (!startStr) {
      startStr = `${key}":{"value":"`;
    }
    let start = text.indexOf(startStr);
    if (start >= 0) {
      start += startStr.length;
      const end = text.indexOf(endStr, start);
      if (end >= 0) {
        return text.substring(start, end);
      }
    }
    return null;
  }
  formatCk(cookies) {
    return Object.entries(cookies).map(([key, value]) => `${key}=${value}`).join("; ");
  }
  async updateCk() {
    try {
      console.log("[MetaAI] Updating cookies...");
      const response = await fetch(this.cookiesUrl, {
        method: "GET",
        headers: this.DEFAULT_HEADERS
      });
      const text = await response.text();
      this.cookies = {
        _js_datr: this.extractVal(text, "_js_datr"),
        abra_csrf: this.extractVal(text, "abra_csrf"),
        datr: this.extractVal(text, "datr")
      };
      this.lsd = this.extractVal(text, null, '"LSD",[],{"token":"', '"}');
      console.log("[MetaAI] Cookies updated successfully.");
    } catch (error) {
      console.error("[MetaAI] Error updating cookies:", error.message);
      throw error;
    }
  }
  async updateToken(birthday = "1999-01-01") {
    try {
      console.log("[MetaAI] Updating access token...");
      const payload = {
        lsd: this.lsd,
        fb_api_caller_class: "RelayModern",
        fb_api_req_friendly_name: "useAbraAcceptTOSForTempUserMutation",
        variables: JSON.stringify({
          dob: birthday,
          icebreaker_type: "TEXT",
          __relay_internal__pv__WebPixelRatiorelayprovider: 1
        }),
        doc_id: "7604648749596940"
      };
      const headers = {
        ...this.DEFAULT_HEADERS,
        "x-fb-friendly-name": "useAbraAcceptTOSForTempUserMutation",
        "x-fb-lsd": this.lsd,
        "x-asbd-id": "129477",
        "alt-used": "www.meta.ai",
        "sec-fetch-site": "same-origin",
        cookie: this.formatCk(this.cookies)
      };
      const response = await fetch(this.tokenUrl, {
        method: "POST",
        headers: headers,
        body: new URLSearchParams(payload)
      });
      const responseJson = await response.json();
      this.accessToken = responseJson.data.xab_abra_accept_terms_of_service.new_temp_user_auth.access_token;
      console.log("[MetaAI] Access token updated successfully.");
    } catch (error) {
      console.error("[MetaAI] Error updating access token:", error.message);
      throw error;
    }
  }
  async fetchSrc(fetchId) {
    try {
      console.log(`[MetaAI] Fetching sources for fetchId: ${fetchId}...`);
      const headers = {
        ...this.DEFAULT_HEADERS,
        authority: "graph.meta.ai",
        "x-fb-friendly-name": "AbraSearchPluginDialogQuery"
      };
      const payload = {
        access_token: this.accessToken,
        fb_api_caller_class: "RelayModern",
        fb_api_req_friendly_name: "AbraSearchPluginDialogQuery",
        variables: JSON.stringify({
          abraMessageFetchID: fetchId
        }),
        server_timestamps: "true",
        doc_id: "6946734308765963"
      };
      const response = await fetch(this.url, {
        method: "POST",
        headers: headers,
        body: new URLSearchParams(payload)
      });
      const text = await response.text();
      if (text.includes("<h1>Something Went Wrong</h1>")) {
        throw new Error("Response indicates 'Something Went Wrong'.");
      }
      const responseJson = JSON.parse(text);
      const message = responseJson.data?.message;
      if (message?.searchResults) {
        console.log("[MetaAI] Sources fetched successfully.");
        return "\n\n" + JSON.stringify(message.searchResults);
      }
      return null;
    } catch (error) {
      console.error("[MetaAI] Error fetching sources:", error.message);
      return null;
    }
  }
  async prompt(message) {
    try {
      if (!this.cookies) {
        console.log("[MetaAI] Cookies not found, attempting to update...");
        await this.updateCk();
      }
      if (!this.accessToken) {
        console.log("[MetaAI] Access token not found, attempting to update...");
        await this.updateToken();
      }
      console.log("[MetaAI] Sending message to Meta AI API...");
      await this.sleep(500);
      const headers = {
        ...this.DEFAULT_HEADERS,
        "content-type": "application/x-www-form-urlencoded",
        cookie: this.formatCk(this.cookies),
        origin: "https://www.meta.ai",
        referer: "https://www.meta.ai/",
        "x-asbd-id": "129477",
        "x-fb-friendly-name": "useAbraSendMessageMutation"
      };
      const payload = {
        access_token: this.accessToken,
        fb_api_caller_class: "RelayModern",
        fb_api_req_friendly_name: "useAbraSendMessageMutation",
        variables: JSON.stringify({
          message: {
            sensitive_string_value: message
          },
          externalConversationId: this.genUUID(),
          offlineThreadingId: this.genOfflineId(),
          suggestedPromptIndex: null,
          flashVideoRecapInput: {
            images: []
          },
          flashPreviewInput: null,
          promptPrefix: null,
          entrypoint: "ABRA__CHAT__TEXT",
          icebreaker_type: "TEXT",
          __relay_internal__pv__AbraDebugDevOnlyrelayprovider: false,
          __relay_internal__pv__WebPixelRatiorelayprovider: 1
        }),
        server_timestamps: "true",
        doc_id: "7783822248314888"
      };
      const response = await fetch(this.url, {
        method: "POST",
        headers: headers,
        body: new URLSearchParams(payload)
      });
      let fullResponse = "";
      let lastSnippetLen = 0;
      let fetchId = null;
      let prevLine = "";
      const decoder = new TextDecoder();
      if (!response.body) {
        throw new Error("Response body is not a readable stream.");
      }
      console.log("[MetaAI] Receiving stream chunks from API...");
      for await (const chunk of response.body) {
        let line = decoder.decode(chunk, {
          stream: true
        });
        prevLine += line;
        let jsonStartIndex = prevLine.indexOf("{");
        while (jsonStartIndex !== -1) {
          let jsonEndIndex = -1;
          let braceCount = 0;
          for (let i = jsonStartIndex; i < prevLine.length; i++) {
            if (prevLine[i] === "{") braceCount++;
            else if (prevLine[i] === "}") braceCount--;
            if (braceCount === 0 && prevLine[i] === "}") {
              jsonEndIndex = i;
              break;
            }
          }
          if (jsonEndIndex !== -1) {
            const jsonStr = prevLine.substring(jsonStartIndex, jsonEndIndex + 1);
            try {
              const parsedLine = JSON.parse(jsonStr);
              const botResponseMessage = parsedLine?.data?.node?.bot_response_message || {};
              const streamingState = botResponseMessage.streaming_state;
              fetchId = botResponseMessage.fetch_id || fetchId;
              if (streamingState === "STREAMING" || streamingState === "OVERALL_DONE") {
                const snippet = botResponseMessage.snippet;
                if (snippet && snippet.length > lastSnippetLen) {
                  fullResponse = snippet;
                  lastSnippetLen = snippet.length;
                }
              }
            } catch (e) {}
            prevLine = prevLine.substring(jsonEndIndex + 1);
            jsonStartIndex = prevLine.indexOf("{");
          } else {
            break;
          }
        }
      }
      console.log("[MetaAI] Stream reception complete.");
      if (fetchId) {
        console.log("[MetaAI] Fetch ID found, attempting to fetch sources.");
        const sources = await this.fetchSrc(fetchId);
        if (sources) {
          console.log("[MetaAI] Sources successfully added to final response.");
          fullResponse += sources;
        }
      }
      if (fullResponse.length === 0) {
        throw new Error("No response received from Meta AI.");
      }
      let formattedResult = {
        result: fullResponse
      };
      if (prevLine.trim().length > 0) {
        try {
          const remainingJson = JSON.parse(prevLine);
          formattedResult = {
            ...formattedResult,
            ...remainingJson
          };
        } catch (e) {}
      }
      console.log("[MetaAI] Prompt process completed.");
      return formattedResult;
    } catch (error) {
      console.error("[MetaAI] Error during prompt execution:", error.message);
      throw error;
    }
  }
  async chat(options = {}) {
    const {
      prompt,
      messages = [],
      max_retries = 2,
      model = "llama"
    } = options;
    try {
      console.log("--- Starting chat process ---");
      let finalPrompt = "";
      if (prompt) {
        finalPrompt = prompt;
        console.log("[Chat] Using direct prompt for conversation.");
      } else if (messages.length > 0) {
        finalPrompt = this.format_chat_to_prompt(messages, {
          model: model
        });
        console.log("[Chat] Formatting chat history into prompt for conversation.");
      } else {
        throw new Error("Either 'prompt' or 'messages' must be provided.");
      }
      const response = await this.prompt(finalPrompt);
      console.log("--- Chat process completed successfully ---");
      return response;
    } catch (error) {
      console.warn(`[Chat] Error: ${error.message}. Retries left: ${max_retries}.`);
      if (max_retries > 0) {
        console.log("[Chat] Retrying conversation...");
        await this.sleep(1e3);
        return await this.chat({
          prompt: prompt,
          messages: messages,
          max_retries: max_retries - 1,
          model: model
        });
      } else {
        console.error("[Chat] Max retries exceeded. Aborting conversation.");
        throw error;
      }
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
    const ai = new MetaAI();
    const response = await ai.chat(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}