import ai from "unlimited-ai";
const models = new Set(["gpt-4o-mini-free", "gpt-4o-mini", "gpt-4o-free", "gpt-4-turbo-2024-04-09", "gpt-4o-2024-08-06", "grok-2", "grok-2-mini", "claude-3-opus-20240229", "claude-3-opus-20240229-gcp", "claude-3-sonnet-20240229", "claude-3-5-sonnet-20240620", "claude-3-haiku-20240307", "claude-2.1", "gemini-1.5-flash-exp-0827", "gemini-1.5-pro-exp-0827"]);
export default async function handler(req, res) {
  const {
    model,
    action,
    prompt,
    system,
    assistant,
    word,
    list
  } = req.method === "GET" ? req.query : req.body;
  let result = null;
  if (!model || !models.has(model)) {
    return res.status(400).json({
      error: "Invalid model provided",
      message: `The model '${model}' is not available. Please choose a valid model from the list.`,
      availableModels: Array.from(models)
    });
  }
  try {
    if (action === "search" && word) {
      result = await ai.searchModels(word, list === "true");
    } else if (action === "generate" && model && prompt) {
      const messages = [system ? {
        role: "system",
        content: system
      } : null, {
        role: "user",
        content: prompt
      }, assistant ? {
        role: "assistant",
        content: assistant
      } : null].filter(Boolean);
      result = await ai.generate(model, messages);
    } else if (action === "models") {
      result = await ai.models();
    } else if (action === "allModels") {
      result = await ai.allModels();
    } else {
      return res.status(400).json({
        error: "Invalid action or missing required parameters",
        message: "Please check the parameters you provided and try again. Example: ?action=generate&model=gpt-4-turbo&prompt=Hello!"
      });
    }
    return res.status(200).json({
      result: result
    });
  } catch (error) {
    res.status(500).json({
      error: "Something went wrong",
      message: `An error occurred: ${error.message}. Please try again later.`
    });
  }
}