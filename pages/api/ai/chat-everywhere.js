import axios from "axios";
import SpoofHead from "@/lib/spoof-head";
class ChatApiClient {
  constructor() {
    this.modelAliases = {
      GPT_3_5: "gpt-3.5-turbo",
      GPT_3_5_AZ: "gpt-35-turbo",
      GPT_3_5_16K: "gpt-3.5-turbo-16k",
      GPT_4: "gpt-4-turbo",
      GPT_4_32K: "gpt-4-32k",
      GPT_4O: "gpt-4o",
      GPT_4O_MINI: "gpt-4o-mini"
    };
    this.modelData = {
      "gpt-3.5-turbo": {
        id: "gpt-3.5-turbo",
        name: "GPT-3.5",
        maxLength: 12e3,
        tokenLimit: 4e3,
        completionTokenLimit: 2500,
        deploymentName: "gpt-35"
      },
      "gpt-35-turbo": {
        id: "gpt-35-turbo",
        name: "GPT-3.5",
        maxLength: 12e3,
        tokenLimit: 4e3,
        completionTokenLimit: 2500,
        deploymentName: "gpt-35"
      },
      "gpt-3.5-turbo-16k": {
        id: "gpt-3.5-turbo-16k",
        name: "GPT-3.5-16K",
        maxLength: 48e3,
        tokenLimit: 16e3,
        completionTokenLimit: 4e3,
        deploymentName: "gpt-35-16k"
      },
      "gpt-4-turbo": {
        id: "gpt-4-turbo",
        name: "GPT-4",
        maxLength: 24e3,
        tokenLimit: 7e3,
        completionTokenLimit: 2e3,
        deploymentName: "gpt-4"
      },
      "gpt-4-32k": {
        id: "gpt-4-32k",
        name: "GPT-4-32K",
        maxLength: 96e3,
        tokenLimit: 32e3,
        completionTokenLimit: 8e3,
        deploymentName: "gpt-4-32k"
      },
      "gpt-4o": {
        id: "gpt-4o",
        name: "GPT-4o",
        maxLength: 128e3,
        tokenLimit: 128e3,
        completionTokenLimit: 4096,
        deploymentName: "gpt-4o"
      },
      "gpt-4o-mini": {
        id: "gpt-4o-mini",
        name: "GPT-4o-mini",
        maxLength: 128e3,
        tokenLimit: 128e3,
        completionTokenLimit: 16384,
        deploymentName: "gpt-4o-mini"
      }
    };
    this.pluginAliases = {
      DEFAULT: "default",
      LANGCHAIN_CHAT: "langchain-chat",
      GPT4: "gpt-4",
      GPT4O: "gpt-4o",
      IMAGE_GEN: "image-gen",
      IMAGE_TO_PROMPT: "image-to-prompt",
      MQTT: "mqtt",
      AI_PAINTER: "ai-painter",
      GEMINI: "gemini"
    };
    this.pluginData = {
      default: {
        id: "default",
        name: "Default",
        requiredKeys: []
      },
      "langchain-chat": {
        id: "langchain-chat",
        name: "Enhance Mode",
        requiredKeys: []
      },
      "gpt-4": {
        id: "gpt-4",
        name: "GPT-4 Plugin",
        requiredKeys: []
      },
      "gpt-4o": {
        id: "gpt-4o",
        name: "GPT-4O Plugin",
        requiredKeys: []
      },
      "image-gen": {
        id: "image-gen",
        name: "Image Generation",
        requiredKeys: []
      },
      "image-to-prompt": {
        id: "image-to-prompt",
        name: "Image to Prompt",
        requiredKeys: []
      },
      mqtt: {
        id: "mqtt",
        name: "MQTT",
        requiredKeys: []
      },
      "ai-painter": {
        id: "ai-painter",
        name: "AI Painter",
        requiredKeys: []
      },
      gemini: {
        id: "gemini",
        name: "Gemini",
        requiredKeys: []
      }
    };
    this.api = axios.create({
      baseURL: "https://chateverywhere.app/api",
      headers: {
        accept: "*/*",
        "accept-language": "id-ID,id;q=0.9",
        authorization: "",
        "cache-control": "no-cache",
        "content-type": "application/json",
        origin: "https://chateverywhere.app",
        pragma: "no-cache",
        priority: "u=1, i",
        referer: "https://chateverywhere.app/",
        responsetype: "stream",
        "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "cross-site",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
        ...SpoofHead()
      }
    });
  }
  _getDefaultSystemPrompt() {
    const basePrompt = `You are an AI language model named Chat Everywhere, designed to answer user questions as accurately and helpfully as possible. Always be aware of the current date and time, and make sure to generate responses in the exact same language as the user's query. Adapt your responses to match the user's input language and context, maintaining an informative and supportive communication style. Additionally, format all responses using Markdown syntax, regardless of the input format.If the input includes text such as [lang=xxx], the response should not include this text.If the input includes math related content, you should use LaTex syntax, and wrap them in $$ symbols. Make sure you also wrap the bracket inside if needed. e.g. $$(a^2 + b^2 = c^2)$$If you were asked to generate a diagram, you should generate a diagram using Mermaid syntax by following the instructions strictly below.
Refer to the instructions below to create diagrams using Mermaid syntax if needed.

---

# Basic Structure

- **Diagram Type**: Start with a keyword like \`graph\`, \`sequenceDiagram\`, etc.
  - Example: \`graph TD\`

- **Nodes**: Define nodes with unique identifiers and labels.
  - Example: \`A[Node A]\`

- **Links**: Connect nodes using arrows (\`-->\`) or lines (\`---\`).
  - Example: \`A --> B\`

- **Flow Direction**: Set the direction with \`TD\` (top-to-bottom) or \`LR\` (left-to-right).
  - Example: \`graph LR\`

- **Subgraphs**: Group nodes with subgraphs for clarity.
  - Example:
    \`\`\`
    subgraph "Title"
      A --> B
    end
    \`\`\`

- **Styling**: Customize appearance using CSS-like syntax.
  - Example: \`A[Node A] {stroke: #333; fill: #FFF}\`

- **Array of labels**: Make sure to use double quotes around array of labels.
  - Example: \`["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"]\`

# Example Diagrams

- **Flowchart**:

graph TD
  A[Start] --> B{Decision}
  B -->|Yes| C[Result 1]
  B -->|No| D[Result 2]
  text

- **Sequence Diagram**:

sequenceDiagram
  Alice->>Bob: Hello Bob, how are you?
  Bob-->>Alice: I am good, thanks!
  text

- **Mind Map**:

mindmap
  root (("mindmap title"))
    ("Origins")
      ("Long history")
      ("Popularisation")
        ("British popular psychology author Tony Buzan")
    ("Research")
      ("On effectiveness<br/>and features")
      ("On Automatic creation")
        ("Uses")
            ("Creative techniques")
            ("Strategic planning")
            ("Argument mapping")
    ("Tools")
      ("Pen and paper")
      ("Mermaid")

- **Quadrant Chart**:

quadrantChart
    title Reach and engagement of campaigns
    x-axis Low Reach --> High Reach
    y-axis Low Engagement --> High Engagement
    quadrant-1 We should expand
    quadrant-2 Need to promote
    quadrant-3 Re-evaluate
    quadrant-4 May be improved
    Campaign A: [0.3, 0.6]
    Campaign B: [0.45, 0.23]
    Campaign C: [0.57, 0.69]
    Campaign D: [0.78, 0.34]
    Campaign E: [0.40, 0.34]
    Campaign F: [0.35, 0.78]

- **Pie Chart**:

pie title Pets adopted by volunteers
    "Dogs" : 386
    "Cats" : 85
    "Rats" : 15

- **XY Chart**:

xychart-beta
    title "Sales Revenue"
    x-axis ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"]
    y-axis "Revenue (in $)" 4000 --> 11000
    bar [5000, 6000, 7500, 8200, 9500, 10500, 11000, 10200, 9200, 8500, 7000, 6000]
    line [5000, 6000, 7500, 8200, 9500, 10500, 11000, 10200, 9200, 8500, 7000, 6000]

# Guidelines

- Wrap Mermaid code with triple backticks and \`mermaid\`.
- Ensure correct syntax to avoid errors.
- Once you have outputted the Mermaid code, user can click the codeblock's top right bubble button to see the diagram directly, or copy the Mermaid code.
- Make sure to use ("") around titles, labels, and other text. Such as ("title") or ("label").
`;
    return basePrompt + "The current date is ".concat(new Date().toLocaleDateString(), ".");
  }
  _findModeConfiguration(modelName) {
    const modelId = this.modelAliases[modelName] || modelName;
    if (this.modelData[modelId]) {
      return {
        type: "model",
        data: this.modelData[modelId],
        isFallback: false
      };
    }
    const pluginId = this.pluginAliases[modelName] || modelName;
    if (this.pluginData[pluginId]) {
      return {
        type: "plugin",
        data: this.pluginData[pluginId],
        isFallback: false
      };
    }
    return {
      type: "model",
      data: this.modelData["gpt-3.5-turbo"],
      isFallback: true
    };
  }
  async chat({
    model = "gpt-4o",
    prompt,
    system_prompt = this._getDefaultSystemPrompt(),
    messages = [],
    ...rest
  }) {
    const config = this._findModeConfiguration(model);
    if (config.isFallback) {
      console.warn(`Peringatan: Model "${model}" tidak ditemukan. Menggunakan model default.`);
    }
    let finalModel;
    let finalPluginId = null;
    if (config.type === "model") {
      finalModel = config.data;
    } else {
      finalPluginId = config.data.id;
      finalModel = this.modelData["gpt-3.5-turbo"];
    }
    const payload = {
      model: finalModel,
      messages: messages.length ? messages : [{
        pluginId: finalPluginId,
        content: prompt,
        role: "user"
      }],
      prompt: system_prompt,
      temperature: .5,
      enableConversationPrompt: false,
      ...rest
    };
    try {
      console.log(`Mengirim request untuk model: "${model}" (Engine: ${finalModel.name}, Plugin: ${finalPluginId || "None"})`);
      const response = await this.api.post("/chat", payload);
      console.log("Respons API diterima:", response.data);
      return {
        result: response.data
      };
    } catch (error) {
      console.error("Terjadi error saat request:", error.response ? error.response.data : error.message);
      return null;
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
    const apiClient = new ChatApiClient();
    const response = await apiClient.chat(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}