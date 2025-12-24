import axios from "axios";
const tiktokenMock = {
  get_encoding: encodingName => {
    if (["o200k_base", "cl100k_base"].includes(encodingName)) {
      return {
        encode: text => {
          const estimatedTokens = Math.ceil(text.length / 2.8);
          return {
            length: estimatedTokens
          };
        },
        free: () => {}
      };
    }
    throw new Error(`Mock tiktoken: Encoding tidak dikenal ${encodingName}`);
  }
};
const r_iw = tiktokenMock.get_encoding;
class ApiService {
  constructor() {
    this.modelData = [{
      name: "GPT-4o",
      id: "gpt4o",
      provider: "openai",
      inputCost: 5e-6,
      outputCost: 15e-6,
      apiCost: .002,
      encoding: "o200k_base"
    }, {
      name: "GPT-4o mini",
      id: "gpt4o_mini",
      provider: "openai",
      inputCost: 15e-8,
      outputCost: 6e-7,
      apiCost: 3e-4,
      encoding: "o200k_base"
    }, {
      name: "GPT-4 Turbo",
      id: "gpt4_turbo",
      provider: "openai",
      inputCost: 1e-5,
      outputCost: 3e-5,
      apiCost: .004,
      encoding: "cl100k_base"
    }, {
      name: "GPT-4",
      id: "gpt4",
      provider: "openai",
      inputCost: 3e-5,
      outputCost: 6e-5,
      apiCost: .009,
      encoding: "cl100k_base"
    }, {
      name: "GPT-3.5 Turbo",
      id: "gpt35_turbo",
      provider: "openai",
      inputCost: 5e-7,
      outputCost: 15e-7,
      apiCost: 2e-4,
      encoding: "cl100k_base"
    }, {
      name: "Claude 3 Opus",
      id: "claude3_opus",
      provider: "anthropic",
      inputCost: 15e-6,
      outputCost: 75e-6,
      apiCost: .009,
      encoding: "claude-3-opus-20240229"
    }, {
      name: "Claude 3 Sonnet",
      id: "claude3_sonnet",
      provider: "anthropic",
      inputCost: 3e-6,
      outputCost: 15e-6,
      apiCost: .0018,
      encoding: "claude-3-sonnet-20240229"
    }, {
      name: "Claude 3 Haiku",
      id: "claude3_haiku",
      provider: "anthropic",
      inputCost: 25e-8,
      outputCost: 125e-8,
      apiCost: 2e-4,
      encoding: "claude-3-haiku-20240307"
    }];
    this.apiUrl = "https://metaschool.so/api/count-tokens";
    this.headers = {
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
      "Content-Type": "application/json",
      Referer: "https://metaschool.so/_next/static/chunks/8157.65f1c78cb61376d8.js"
    };
  }
  findModelById(modelId) {
    return this.modelData.find(model => model.id === modelId) || null;
  }
  analyzeText(text) {
    const characters = text.length;
    const words = text.trim().split(/\s+/).filter(word => word.length > 0).length;
    return {
      characters: characters,
      words: words
    };
  }
  formatCostBreakdown(result, modelObject) {
    const textAnalysis = this.analyzeText(result.originalText);
    return {
      model: {
        name: modelObject.name,
        id: modelObject.id,
        provider: modelObject.provider
      },
      input: {
        text: result.originalText,
        analysis: {
          tokens: result.inputTokens,
          words: textAnalysis.words,
          characters: textAnalysis.characters
        }
      },
      output: {
        analysis: {
          tokens: result.outputTokens,
          estimatedWords: Math.ceil(result.outputTokens * .75),
          estimatedCharacters: Math.ceil(result.outputTokens * 3.5)
        }
      },
      costs: {
        input: {
          amount: result.inputCost,
          formatted: `$${result.inputCost.toFixed(6)}`
        },
        output: {
          amount: result.outputCost,
          formatted: `$${result.outputCost.toFixed(6)}`
        },
        apiCall: {
          amount: result.apiCallCost,
          formatted: `$${result.apiCallCost.toFixed(6)}`
        },
        perCall: {
          amount: result.costPerCall,
          formatted: `$${result.costPerCall.toFixed(6)}`
        },
        total: {
          amount: result.totalCost,
          formatted: `$${result.totalCost.toFixed(6)}`
        }
      },
      calls: {
        numberOfCalls: result.numApiCall,
        totalTokens: {
          input: result.inputTokens * result.numApiCall,
          output: result.outputTokens * result.numApiCall,
          combined: (result.inputTokens + result.outputTokens) * result.numApiCall
        },
        totalWords: {
          input: textAnalysis.words * result.numApiCall,
          output: Math.ceil(result.outputTokens * .75) * result.numApiCall,
          combined: (textAnalysis.words + Math.ceil(result.outputTokens * .75)) * result.numApiCall
        },
        totalCharacters: {
          input: textAnalysis.characters * result.numApiCall,
          output: Math.ceil(result.outputTokens * 3.5) * result.numApiCall,
          combined: (textAnalysis.characters + Math.ceil(result.outputTokens * 3.5)) * result.numApiCall
        }
      },
      summary: {
        costPerToken: result.totalCost / ((result.inputTokens + result.outputTokens) * result.numApiCall),
        costPerWord: result.totalCost / ((textAnalysis.words + Math.ceil(result.outputTokens * .75)) * result.numApiCall),
        costPerCharacter: result.totalCost / ((textAnalysis.characters + Math.ceil(result.outputTokens * 3.5)) * result.numApiCall),
        efficiency: {
          tokensPerDollar: (result.inputTokens + result.outputTokens) * result.numApiCall / result.totalCost,
          wordsPerDollar: (textAnalysis.words + Math.ceil(result.outputTokens * .75)) * result.numApiCall / result.totalCost,
          charactersPerDollar: (textAnalysis.characters + Math.ceil(result.outputTokens * 3.5)) * result.numApiCall / result.totalCost
        }
      }
    };
  }
  async token({
    text,
    model: modelId = "gpt4o_mini",
    output_token = 0,
    num_call = 1
  }) {
    const modelObject = this.findModelById(modelId);
    if (!modelObject) {
      throw new Error(`Model dengan ID "${modelId}" tidak ditemukan.`);
    }
    let inputTokenCount = 0;
    const provider = modelObject.provider;
    try {
      if (provider === "openai") {
        let encoder;
        try {
          encoder = r_iw(modelObject.encoding);
        } catch (e) {
          console.error(`Error mendapatkan encoding "${modelObject.encoding}", fallback ke cl100k_base. Pesan: ${e.message}`);
          encoder = r_iw("cl100k_base");
        }
        const encoded = encoder.encode(text);
        inputTokenCount = encoded.length;
        encoder.free();
      } else if (provider === "anthropic") {
        const payload = {
          text: text,
          model: modelObject.id
        };
        try {
          const response = await axios.post(this.apiUrl, payload, {
            headers: this.headers
          });
          if (response.data && typeof response.data.tokens === "number") {
            inputTokenCount = response.data.tokens;
          } else if (response.data && response.data.tokenCount && typeof response.data.tokenCount.input_tokens === "number") {
            inputTokenCount = response.data.tokenCount.input_tokens;
          } else {
            console.error("Format jumlah token tidak valid dari API Anthropic. Respons:", response.data);
            throw new Error("Format jumlah token tidak valid dari API Anthropic.");
          }
        } catch (apiError) {
          console.error(`Error pada tokenisasi API Anthropic untuk model "${modelId}":`, apiError.message);
          const wordCount = text.trim().split(/\s+/).length;
          inputTokenCount = Math.ceil(1.3 * wordCount);
          console.log(`Menggunakan fallback jumlah token untuk "${modelId}": ${inputTokenCount} (berdasarkan ${wordCount} kata)`);
        }
      } else {
        console.warn(`Provider "${provider}" tidak ditangani secara eksplisit atau tidak dikenal. Menggunakan estimasi token fallback untuk model "${modelId}".`);
        const wordCount = text.trim().split(/\s+/).length;
        inputTokenCount = Math.ceil(1.3 * wordCount);
      }
      const calculatedInputCost = inputTokenCount * modelObject.inputCost;
      const calculatedOutputCost = output_token * modelObject.outputCost;
      const modelApiFixedCost = modelObject.apiCost;
      const costPerSingleCall = calculatedInputCost + calculatedOutputCost + modelApiFixedCost;
      const totalCalculatedCost = costPerSingleCall * num_call;
      const result = {
        inputTokens: inputTokenCount,
        outputTokens: output_token,
        costPerCall: costPerSingleCall,
        totalCost: totalCalculatedCost,
        inputCost: calculatedInputCost,
        outputCost: calculatedOutputCost,
        apiCallCost: modelApiFixedCost,
        modelId: modelId,
        numApiCall: num_call,
        originalText: text
      };
      return {
        ...result,
        detailedAnalysis: this.formatCostBreakdown(result, modelObject)
      };
    } catch (error) {
      const errorMessage = error.response ? error.response.data || error.message : error.message;
      console.error(`Error dalam kalkulasi token/biaya untuk model "${modelId}":`, errorMessage);
      if (error.response && error.response.data && error.response.data.message) {
        throw new Error(`API Error untuk model ${modelId}: ${error.response.data.message}`);
      }
      throw error;
    }
  }
  generateCostTable(results) {
    const table = {
      models: [],
      totals: {
        tokens: {
          input: 0,
          output: 0,
          combined: 0
        },
        words: {
          input: 0,
          output: 0,
          combined: 0
        },
        characters: {
          input: 0,
          output: 0,
          combined: 0
        },
        costs: {
          input: 0,
          output: 0,
          apiCall: 0,
          total: 0
        }
      }
    };
    results.forEach(result => {
      const analysis = result.detailedAnalysis;
      table.models.push({
        name: analysis.model.name,
        tokens: analysis.calls.totalTokens.combined,
        inputCost: analysis.costs.input.formatted,
        outputCost: analysis.costs.output.formatted,
        apiCallCost: analysis.costs.apiCall.formatted,
        totalCost: analysis.costs.total.formatted
      });
      table.totals.tokens.input += analysis.calls.totalTokens.input;
      table.totals.tokens.output += analysis.calls.totalTokens.output;
      table.totals.tokens.combined += analysis.calls.totalTokens.combined;
      table.totals.words.input += analysis.calls.totalWords.input;
      table.totals.words.output += analysis.calls.totalWords.output;
      table.totals.words.combined += analysis.calls.totalWords.combined;
      table.totals.characters.input += analysis.calls.totalCharacters.input;
      table.totals.characters.output += analysis.calls.totalCharacters.output;
      table.totals.characters.combined += analysis.calls.totalCharacters.combined;
      table.totals.costs.input += analysis.costs.input.amount;
      table.totals.costs.output += analysis.costs.output.amount;
      table.totals.costs.apiCall += analysis.costs.apiCall.amount;
      table.totals.costs.total += analysis.costs.total.amount;
    });
    table.totals.costs = {
      input: `$${table.totals.costs.input.toFixed(6)}`,
      output: `$${table.totals.costs.output.toFixed(6)}`,
      apiCall: `$${table.totals.costs.apiCall.toFixed(6)}`,
      total: `$${table.totals.costs.total.toFixed(6)}`
    };
    return table;
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.text) {
    return res.status(400).json({
      error: "Text are required"
    });
  }
  try {
    const apiClient = new ApiService();
    const response = await apiClient.token(params);
    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}