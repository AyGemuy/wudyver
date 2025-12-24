import axios from "axios";
class FreeConvertJob {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.client = axios.create({
      baseURL: "https://api.freeconvert.com/v1/process/jobs",
      headers: {
        Accept: "application/json, text/plain, */*",
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
        Referer: "https://www.freeconvert.com/webpage-to-html/download"
      }
    });
  }
  async startJob(url) {
    const data = {
      tasks: {
        convert: {
          operation: "convert",
          input: "import",
          input_format: "webpage",
          output_format: "html",
          options: {}
        },
        "export-url": {
          operation: "export/url",
          input: "convert"
        },
        import: {
          operation: "import/webpage",
          url: url,
          filename: url
        }
      }
    };
    try {
      const response = await this.client.post("", data);
      console.log("Job started:", response.data);
      return response.data.links.self;
    } catch (error) {
      console.error("Error starting job:", error.message);
      throw error;
    }
  }
  async checkJobStatus(jobLink) {
    try {
      const response = await this.client.get(jobLink);
      console.log("Job status:", response.data.status);
      if (response.data.status === "completed") {
        return response.data.tasks.find(task => task.name === "export-url").result.url;
      } else {
        return null;
      }
    } catch (error) {
      console.error("Error checking job status:", error.message);
      throw error;
    }
  }
  async waitForCompletion(jobLink) {
    let status = "processing";
    let resultUrl = null;
    while (status !== "completed") {
      await new Promise(resolve => setTimeout(resolve, 3e3));
      resultUrl = await this.checkJobStatus(jobLink);
      if (resultUrl) {
        status = "completed";
      }
    }
    return resultUrl;
  }
  async run(url) {
    try {
      const jobLink = await this.startJob(url);
      const resultUrl = await this.waitForCompletion(jobLink);
      console.log("HTML link generated:", resultUrl);
      return resultUrl;
    } catch (error) {
      console.error("Error in job processing:", error.message);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const {
    url
  } = req.method === "GET" ? req.query : req.body;
  if (!url) {
    return res.status(400).json({
      error: "Paramenter url wajib diisi"
    });
  }
  try {
    const apiKey = "null";
    const freeConvert = new FreeConvertJob(apiKey);
    const result = await freeConvert.run(url);
    return res.status(200).json({
      result: result
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}