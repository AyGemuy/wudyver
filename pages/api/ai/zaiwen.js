import fetch from "node-fetch";
class Zaiwen {
  async chat({
    prompt,
    model,
    id,
    key
  }) {
    const payload = {
      message: [{
        role: "user",
        content: prompt
      }],
      mode: model,
      prompt_id: id,
      key: key
    };
    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      Referer: "https://zaiwen.xueban.org.cn/chat"
    };
    const response = await fetch("https://aliyun.zaiwen.top/admin/chatbot", {
      method: "POST",
      headers: headers,
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    return await response.text();
  }
  async draw({
    prompt,
    model,
    ratio,
    seed
  }) {
    const payload = {
      model_name: model || "poe_model_fluxschnell",
      prompt: prompt || "Men",
      ratio: ratio || "1:1",
      seed: seed || 387410394
    };
    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      Referer: "https://zaiwen.xueban.org.cn/draw/midjourney"
    };
    const response = await fetch("https://aliyun.zaiwen.top/draw/mj/imagine", {
      method: "POST",
      headers: headers,
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    return await response.json();
  }
  async bing({
    prompt
  }) {
    const payload = {
      question: prompt
    };
    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      Referer: "https://zaiwen.xueban.org.cn/chat/online-search"
    };
    const response = await fetch("https://aliyun.zaiwen.top/aisearch/search/task/add", {
      method: "POST",
      headers: headers,
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    const taskData = await response.json();
    const {
      task_id
    } = taskData.info;
    while (true) {
      const infoResponse = await fetch("https://aliyun.zaiwen.top/aisearch/search/task/info", {
        method: "POST",
        headers: headers,
        body: JSON.stringify({
          task_id: task_id
        })
      });
      if (!infoResponse.ok) throw new Error(`API Error: ${infoResponse.status}`);
      const taskInfo = await infoResponse.json();
      if (taskInfo.info.status === "SUCCESS") {
        return taskInfo.info.answer;
      }
      await new Promise(resolve => setTimeout(resolve, 2e3));
    }
  }
  async gemini({
    prompt,
    system,
    key
  }) {
    const payload = {
      message: [{
        role: "system",
        content: system || "You are Ai"
      }, {
        role: "user",
        content: prompt || "Yolo"
      }],
      user_key: key || null
    };
    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      Referer: "https://zaiwen.xueban.org.cn/chat/mind-map"
    };
    const response = await fetch("https://aliyun.zaiwen.top/message_gemini", {
      method: "POST",
      headers: headers,
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    return await response.text();
  }
  async suno({
    tags,
    title,
    prompt,
    model,
    instrumental
  }) {
    const payload = {
      make_instrumental: instrumental || true,
      mv: model || "chirp-v3-5",
      tags: tags || "Rock, Blues",
      title: title || "Suno",
      prompt: prompt || "You are very rockers"
    };
    const headers = {
      Accept: "application/json, text/plain, */*",
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      Referer: "https://zaiwen.xueban.org.cn/suno/create"
    };
    const response = await fetch("https://aliyun.zaiwen.top/suno/submit/music", {
      method: "POST",
      headers: headers,
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    const taskData = await response.json();
    const {
      task_id
    } = taskData;
    while (true) {
      const infoResponse = await fetch(`https://aliyun.zaiwen.top/suno/fetch/${task_id}`, {
        method: "GET",
        headers: headers
      });
      if (!infoResponse.ok) throw new Error(`API Error: ${infoResponse.status}`);
      const taskInfo = await infoResponse.json();
      if (taskInfo.data.status === "success") {
        return taskInfo.data.data;
      }
      await new Promise(resolve => setTimeout(resolve, 2e3));
    }
  }
}
export default async function handler(req, res) {
  const zaiwen = new Zaiwen();
  try {
    const {
      action,
      prompt,
      system,
      model,
      id,
      key,
      tags,
      title,
      instrumental
    } = req.method === "GET" ? req.query : req.body;
    let result;
    switch (action) {
      case "chat":
        result = await zaiwen.chat({
          prompt: prompt,
          model: model,
          id: id,
          key: key
        });
        break;
      case "draw":
        result = await zaiwen.draw({
          prompt: prompt,
          model: model,
          ratio: req.query.ratio,
          seed: req.query.seed
        });
        break;
      case "bing":
        result = await zaiwen.bing({
          prompt: prompt
        });
        break;
      case "gemini":
        result = await zaiwen.gemini({
          prompt: prompt,
          system: system,
          key: key
        });
        break;
      case "suno":
        result = await zaiwen.suno({
          tags: tags,
          title: title,
          prompt: prompt,
          model: model,
          instrumental: instrumental
        });
        break;
      default:
        throw new Error("Invalid action");
    }
    return res.status(200).json({
      result: result
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}