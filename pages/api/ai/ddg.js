import fetch from "node-fetch";
import dbConnect from "@/lib/mongoose";
import DdgContinues from "@/models/DdgContinues";
export default async function handler(req, res) {
  const STATUS_URL = "https://duckduckgo.com/duckchat/v1/status";
  const CHAT_API = "https://duckduckgo.com/duckchat/v1/chat";
  const {
    action = "chat",
      id = "random",
      prompt,
      continue: continueHistory = "false",
        model = "gpt-4o-mini"
  } = req.method === "GET" ? req.query : req.body;
  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:129.0) Gecko/20100101 Firefox/129.0",
    Accept: "*/*",
    "Accept-Language": "en-US,en;q=0.5",
    "Accept-Encoding": "gzip, deflate, br, zstd",
    Referer: "https://duckduckgo.com/",
    "Cache-Control": "no-store",
    "x-vqd-accept": "1",
    Connection: "keep-alive",
    Cookie: "dcm=3",
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-origin",
    Priority: "u=4",
    Pragma: "no-cache",
    TE: "trailers",
    "Content-Type": "application/json"
  };
  try {
    const xVqd4 = await fetch(STATUS_URL, {
      headers: headers
    }).then(response => response.headers.get("x-vqd-4"));
    if (xVqd4) headers["x-vqd-4"] = xVqd4;
    if (action === "create") {
      if (!id || !prompt) {
        return res.status(400).json({
          result: "Missing id or prompt for create action"
        });
      }
      const history = [{
        role: "user",
        content: prompt
      }];
      await dbConnect();
      await DdgContinues.create({
        _id: id,
        model: model,
        history: history
      });
      return res.status(200).json({
        result: "History created successfully"
      });
    }
    if (action === "chat") {
      if (!id || !prompt) {
        return res.status(400).json({
          result: "Missing id or prompt for chat action"
        });
      }
      await dbConnect();
      let historyData = await DdgContinues.findOne({
        _id: id
      });
      if (historyData) {
        let chatHistory = historyData.history;
        chatHistory = continueHistory === "true" ? [...chatHistory, {
          role: "user",
          content: prompt
        }] : [{
          role: "user",
          content: prompt
        }];
        const response = await fetch(CHAT_API, {
          method: "POST",
          headers: headers,
          body: JSON.stringify({
            model: model,
            messages: chatHistory
          })
        });
        const responseText = await response.text();
        const chatMessages = responseText.split("\n").filter(line => line.includes("message")).map(line => JSON.parse(line.split("data: ")[1]).message).join("");
        if (chatMessages === "") {
          return res.status(500).json({
            result: "No chat response"
          });
        }
        chatHistory.push({
          role: "assistant",
          content: chatMessages
        });
        await DdgContinues.findOneAndUpdate({
          _id: id
        }, {
          history: chatHistory
        }, {
          new: true
        });
        return res.status(200).json({
          result: chatMessages
        });
      } else {
        return res.status(404).json({
          result: "History not found for the given id"
        });
      }
    }
    return res.status(400).json({
      result: "Invalid action"
    });
  } catch (error) {
    return res.status(500).json({
      result: "Internal Server Error",
      error: error.message
    });
  }
}