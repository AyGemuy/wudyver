import axios from "axios";
class YourSearchAI {
  constructor() {
    this.baseURL = "https://app.yoursearch.ai/api";
    this.headers = {
      "content-type": "application/json",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Mobile Safari/537.36",
      Referer: "https://app.yoursearch.ai/?q=joo"
    };
  }
  async search({
    prompt,
    customPrompt
  }) {
    try {
      const defaultPrompt = `Search term: "{searchTerm}"

Create a summary of the search results in three paragraphs with reference numbers, which you then list numbered at the bottom.
Include emojis in the summary.
Be sure to include the reference numbers in the summary.
Both in the text of the summary and in the reference list, the reference numbers should look like this: "(1)".
Formulate simple sentences.
Include blank lines between the paragraphs.
Do not reply with an introduction, but start directly with the summary.
Include emojis in the summary.

At the end, write a hint text where I can find search results as a comparison with the above search term with a link to Google search in this format: 
"See Google results: <Google search link>"

Below that, provide a tip on how I can optimize the search results for my search query.

I show you in which format this should be structured:

\`\`\`
<Summary of search results with reference numbers>

Sources:
(1) <URL of the first reference>
(2) <URL of the second reference>

<Hint text for further search results with Google link>
<Tip on optimizing the search results>
\`\`\`

Here are the search results:
{searchResults}`;
      const promptTemplate = customPrompt || defaultPrompt;
      const response = await axios.post(this.baseURL, {
        searchTerm: prompt,
        promptTemplate: promptTemplate,
        searchParamenters: "{}",
        searchResultTemplate: '[{order}] "{snippet}"\nURL: {link}'
      }, {
        headers: this.headers
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching search results:", error.message);
      throw new Error("Failed to fetch search results");
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Prompt is required"
    });
  }
  const searchAI = new YourSearchAI();
  try {
    const data = await searchAI.search(params);
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({
      error: "Error during search request"
    });
  }
}