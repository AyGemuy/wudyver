import dbConnect from "../../../lib/mongoose";
import AyesoulModel from "../../../models/Ayesoul";
import WebSocket from "ws";
import axios from "axios";
import {
  FormData,
  Blob
} from "formdata-node";
class Ayesoul {
  constructor() {
    this.webs = "wss://goto.ayesoul.com/";
    this.base = "https://ayesoul.com/api/attachgoto";
    this.imgBase = "https://media.ayesoul.com/";
    this.context = null;
  }
  async initializeContext() {
    try {
      if (!this.context) {
        await dbConnect();
        const context = await AyesoulModel.findOne();
        this.context = context || {
          messageId: null,
          question: null,
          answer: null,
          type: null
        };
      }
    } catch (error) {
      throw new Error("Gagal menginisialisasi konteks: " + error.message);
    }
  }
  async saveContext(newContext) {
    try {
      if (!newContext || !newContext.messageId) {
        throw new Error("Invalid context data");
      }
      await dbConnect();
      const existingContext = await AyesoulModel.findOneAndUpdate({
        messageId: newContext.messageId
      }, newContext, {
        new: true,
        upsert: true
      });
      if (!existingContext) {
        this.context = newContext;
      }
    } catch (error) {
      throw new Error("Gagal menyimpan atau memperbarui konteks: " + error.message);
    }
  }
  async resetContext() {
    try {
      await dbConnect();
      await AyesoulModel.deleteMany({});
      this.context = {
        messageId: null,
        question: null,
        answer: null,
        type: null
      };
    } catch (error) {
      throw new Error("Gagal mereset konteks: " + error.message);
    }
  }
  genId(length = 21) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_";
    return Array.from({
      length: length
    }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  }
  async uploadImage(imageUrl) {
    try {
      const response = await axios.get(imageUrl, {
        responseType: "arraybuffer"
      });
      const imageBuffer = Buffer.from(response.data, "binary");
      const blob = new Blob([imageBuffer], {
        type: "image/jpeg"
      });
      const form = new FormData();
      form.append("file", blob, {
        filename: "image.jpg",
        contentType: "image/jpeg"
      });
      const {
        data
      } = await axios.post(this.base, form, {
        headers: {
          "user-agent": "Postify/1.0.0",
          origin: "https://ayesoul.com",
          referer: "https://ayesoul.com/",
          "x-cache-sec": `${this.genId(7)}-|BANKAI|-${this.genId(7)}`
        }
      });
      return data.file_id;
    } catch (error) {
      throw new Error("Gagal mengunggah gambar: " + error.message);
    }
  }
  create(query, isFollowUp = false, attachments = []) {
    return {
      input: JSON.stringify({
        event: query,
        attach: attachments,
        dateObject: new Date().toLocaleString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "numeric",
          minute: "numeric",
          hour12: true
        }),
        currentDateTimeISOString: new Date().toISOString(),
        id: this.genId(),
        "x-cache-sec": `${this.genId(7)}-|BANKAI|-${this.genId(7)}`,
        chin_tapak_dum_dum: {
          cf_config: {
            unos: "",
            dos: "",
            tres: "",
            chin: ""
          }
        },
        nostal: isFollowUp && this.context?.messageId ? [{
          id: this.context.messageId,
          rank: 1,
          question: this.context.question,
          answer: this.context.answer
        }] : [],
        ultra_mode: true,
        customExcludeList: []
      })
    };
  }
  references(text, sourcesRaw, refOps) {
    try {
      if (refOps === true) {
        return text.replace(/\[(\d+(?:,\s*\d+)*)\]/g, (match, p1) => p1.split(",").map(num => parseInt(num.trim()) - 1).map(index => index >= 0 && index < sourcesRaw.length ? `[${sourcesRaw[index]}](${sourcesRaw[index]})` : "").filter(Boolean).join(", ") || match);
      }
      return refOps === "delete" ? text.replace(/\s*\[(\d+(?:,\s*\d+)*)\]\s*/g, "") : text;
    } catch (error) {
      throw new Error("Gagal memproses referensi: " + error.message);
    }
  }
  async websoket(query, isFollowUp = false, attachments = [], refOps = false) {
    return new Promise((resolve, reject) => {
      const socket = new WebSocket(this.webs, {
        headers: {
          "user-agent": "Postify/1.0.0",
          origin: "https://ayesoul.com",
          referer: "https://ayesoul.com/",
          upgrade: "websocket",
          connection: "Upgrade",
          "sec-websocket-version": "13",
          "sec-websocket-extensions": "permessage-deflate; client_max_window_bits"
        }
      });
      let response = {
        sourcesRaw: [],
        contextSources: [],
        followUpQuestions: [],
        searchPlan: "",
        answer: "",
        messageId: null,
        images: []
      };
      let fullAnswer = "";
      let remainingCount = 0;
      let retryCount = 0;
      const maxRetries = 3;
      const retry = () => {
        if (retryCount < maxRetries) {
          retryCount++;
          socket.close();
          this.websoket(query, isFollowUp, attachments, refOps).then(resolve).catch(reject);
        } else {
          reject(new Error(`Gagal terhubung setelah ${maxRetries} kali percobaan.`));
        }
      };
      socket.on("open", () => socket.send(JSON.stringify(this.create(query, isFollowUp, attachments))));
      socket.on("message", data => {
        const message = JSON.parse(data);
        switch (message.status) {
          case "SOUL XDots":
            if (message.message.sourcesRaw) response.sourcesRaw = message.message.sourcesRaw;
            break;
          case "SOUL XMeta":
            Object.assign(response, {
              contextSources: message.message.contextSources || response.contextSources,
              followUpQuestions: message.message.followUpQuestions || response.followUpQuestions,
              searchPlan: message.message.genUiConfig?.searchPlan || response.searchPlan
            });
            break;
          case "SOUL XType":
            if (message.message === "gen_image") response.answer = `Otw generate ${remainingCount} gambar...`;
            break;
          case "SOUL XStream":
            fullAnswer += message.message;
            break;
          case "SOUL XImage":
            response.images.push(`${this.imgBase}${message.message}`);
            remainingCount--;
            if (remainingCount === 0) {
              socket.close();
              resolve(response);
            } else {
              socket.send(JSON.stringify(this.create(query, false, [])));
            }
            break;
          case "SOUL XOver":
            response.messageId = message.message.id;
            if (response.images.length === 0) response.answer = this.references(fullAnswer, response.sourcesRaw, refOps);
            if (remainingCount === 0) {
              socket.close();
              resolve(response);
            }
            break;
        }
      });
      socket.on("close", () => {
        if (response.answer) {
          resolve(response);
        } else {
          retry();
        }
      });
      socket.on("error", retry);
    });
  }
  async request(query, options = {}) {
    try {
      if (!query?.trim()) throw new Error("Query tidak boleh kosong!");
      await this.initializeContext();
      const isFollowUp = options.follow === "true" || options.follow;
      const attachments = [];
      const image = options.image || null;
      if (image) {
        const fileId = await this.uploadImage(image);
        attachments.push({
          file_id: fileId,
          name: image.split("/").pop(),
          type: "jpg",
          mime: "image/jpeg"
        });
      }
      const response = await this.websoket(query, isFollowUp && this.context.messageId !== null, attachments, options.useReferences);
      const finalAnswer = response.answer.includes("https://") ? "genimage" : "chat";
      const newContext = isFollowUp ? {
        messageId: response.messageId,
        question: query,
        answer: response.answer,
        type: finalAnswer
      } : {
        messageId: null,
        question: null,
        answer: null,
        type: null
      };
      if (isFollowUp) {
        await this.saveContext(newContext);
      } else {
        await this.resetContext();
      }
      return response;
    } catch (error) {
      throw new Error("Terjadi kesalahan dalam permintaan: " + error.message);
    }
  }
}
export default async function handler(req, res) {
  const {
    prompt,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!prompt) return res.status(400).json({
    error: "Prompt is required"
  });
  const options = {
    follow: params.follow === "true",
    image: params.image || null,
    ...params
  };
  const wsClient = new Ayesoul();
  try {
    const finalOutput = await wsClient.request(prompt, options);
    res.status(200).json({
      result: finalOutput
    });
  } catch (error) {
    res.status(500).json({
      error: `Error: ${error.message}`
    });
  }
}