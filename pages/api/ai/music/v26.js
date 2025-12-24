import axios from "axios";
import crypto from "crypto";
import FormData from "form-data";
import Encoder from "@/lib/encoder";
import SpoofHead from "@/lib/spoof-head";
class BachAIClient {
  constructor() {
    this.baseUrl = "https://bach-ai.top/api";
    this.secret = "VLvbT##*8oQ6JgUwg@wciD";
    this.config = {
      endpoints: {
        generate: "/generate",
        task: id => `/result/${id}`
      }
    };
    this.appInfo = this.genApp();
  }
  async enc(data) {
    const {
      uuid: jsonUuid
    } = await Encoder.enc({
      data: data,
      method: "combined"
    });
    return jsonUuid;
  }
  async dec(uuid) {
    const decryptedJson = await Encoder.dec({
      uuid: uuid,
      method: "combined"
    });
    return decryptedJson.text;
  }
  genApp() {
    const devices = ["Pixel 7", "Galaxy S23", "iPhone 14", "OnePlus 11", "Pixel 8", "Galaxy S24"];
    const versions = ["11", "12", "13", "14"];
    const osTypes = ["Android", "iOS"];
    const osName = osTypes[Math.floor(Math.random() * osTypes.length)];
    return {
      name: "Bach AI",
      version: "1.0.2",
      osName: osName,
      osVersion: versions[Math.floor(Math.random() * versions.length)],
      deviceModel: devices[Math.floor(Math.random() * devices.length)]
    };
  }
  buildHeader(deviceId = null, isFormData = false) {
    try {
      console.log("Building headers...");
      const finalDeviceId = deviceId || crypto.randomUUID();
      console.log("Device ID generated:", finalDeviceId?.slice(0, 8) + "...");
      const {
        name,
        version,
        osName,
        osVersion,
        deviceModel
      } = this.appInfo;
      const userAgent = `${name}/${version} (${osName}; ${osVersion}; ${deviceModel})`;
      console.log("User agent created");
      const utcHour = new Date().getUTCHours().toString();
      const message = `${userAgent}|${utcHour}`;
      const hmac = crypto.createHmac("sha256", Buffer.from(this.secret, "utf-8"));
      hmac.update(Buffer.from(message, "utf-8"));
      const apiKey = hmac.digest("hex");
      console.log("API key generated");
      const headers = {
        "User-Agent": userAgent,
        "x-api-key": apiKey,
        "device-id": finalDeviceId,
        ...SpoofHead()
      };
      if (isFormData) {
        headers["Content-Type"] = "multipart/form-data";
      }
      console.log("Headers built successfully");
      return {
        headers: headers,
        deviceId: finalDeviceId,
        userAgent: userAgent,
        apiKey: apiKey
      };
    } catch (error) {
      console.error("Header building failed:", error);
      throw error;
    }
  }
  buildForm(options = {}) {
    try {
      console.log("Building form data...");
      const {
        customMode = false,
          prompt = `[Verse]\nAisles stretching out like endless dreams\nCereal boxes and canned food schemes\nPickle jars and pasta towers\nLost for hours in neon flowered scenes\n[Chorus]\nTrolley rolling to a distant beat\nDancing down the frozen treat street\nMilk's going wild in the dairy lane\nGet lost with me in this bizarre terrain`,
          title = "Rise of the Titans",
          style = "pop",
          instrumental = false
      } = options;
      const form = new FormData();
      form.append("mode", customMode ? "custom" : "default");
      form.append("prompt", prompt);
      form.append("isInstrumental", instrumental.toString());
      if (customMode) {
        form.append("title", title || "untitled");
        form.append("gpt_prompt", "Generate the music.");
        form.append("tags", JSON.stringify((style || "pop").split(" ")));
      }
      console.log("Form data built successfully");
      return form;
    } catch (error) {
      console.error("Form building failed:", error);
      throw error;
    }
  }
  async generate({
    ...rest
  } = {}) {
    try {
      console.log("Starting generation process...");
      this.appInfo = this.genApp();
      const {
        headers,
        deviceId,
        userAgent,
        apiKey
      } = this.buildHeader(null, true);
      const form = this.buildForm(rest);
      const url = `${this.baseUrl}${this.config.endpoints.generate}`;
      console.log("Sending generation request...");
      const response = await axios.post(url, form, {
        headers: headers,
        validateStatus: () => true
      });
      const data = response?.data;
      if (!data?.success) {
        throw new Error(`Generation failed: ${data?.message || "Unknown error"}`);
      }
      const jobId = data?.data?.job_id;
      if (!jobId) {
        throw new Error("No job ID returned from generation request");
      }
      console.log("Job created:", jobId);
      const taskData = {
        job_id: jobId,
        device_id: deviceId,
        user_agent: userAgent,
        api_key: apiKey,
        app_info: this.appInfo,
        timestamp: Date.now()
      };
      const taskId = await this.enc(taskData);
      console.log("Generation completed, task created");
      return {
        task_id: taskId
      };
    } catch (error) {
      console.error("Generation failed:", error.message);
      throw error;
    }
  }
  async status({
    task_id,
    ...rest
  } = {}) {
    try {
      console.log("Checking task status...");
      if (!task_id) {
        throw new Error("Task ID is required");
      }
      const taskData = await this.dec(task_id);
      const {
        job_id,
        device_id,
        user_agent,
        api_key
      } = taskData;
      if (!job_id || !device_id || !user_agent || !api_key) {
        throw new Error("Invalid task data");
      }
      console.log("Fetching status for job:", job_id);
      const url = `${this.baseUrl}${this.config.endpoints.task(job_id)}`;
      const {
        headers
      } = this.buildHeader(device_id);
      const response = await axios.get(url, {
        headers: headers,
        validateStatus: () => true
      });
      const data = response?.data;
      if (!data?.success) {
        throw new Error(`Status check failed: ${data?.message || "Unknown error"}`);
      }
      const status = data?.data?.status;
      const tracks = data?.data?.tracks;
      console.log("Status check completed:", status);
      return {
        status: status || "unknown",
        completed: status !== "pending",
        tracks: tracks || null,
        data: data?.data || null
      };
    } catch (error) {
      console.error("Status check failed:", error.message);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!action) {
    return res.status(400).json({
      error: "Action (create or status) is required."
    });
  }
  const api = new BachAIClient();
  try {
    switch (action) {
      case "create":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Prompt is required for 'create' action."
          });
        }
        const createResponse = await api.generate(params);
        return res.status(200).json(createResponse);
      case "status":
        if (!params.task_id) {
          return res.status(400).json({
            error: "task_id is required for 'status' action."
          });
        }
        const statusResponse = await api.status(params);
        return res.status(200).json(statusResponse);
      default:
        return res.status(400).json({
          error: "Invalid action. Supported actions are 'create' and 'status'."
        });
    }
  } catch (error) {
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}