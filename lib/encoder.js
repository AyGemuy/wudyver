import connectMongo from "@/lib/mongoose";
import UUIDMapping from "@/models/UUIDMapping";
import CryptoJS from "crypto-js";
import apiConfig from "@/configs/apiConfig";
import {
  randomUUID
} from "crypto";
class EncoderClient {
  constructor(key) {
    if (!key) {
      throw new Error("Encryption key must be provided.");
    }
    this.defaultKey = key;
    this.methods = ["aes", "combined"];
  }
  generateKey(length = 256) {
    try {
      return CryptoJS.lib.WordArray.random(length / 8).toString();
    } catch (error) {
      throw new Error(`Key generation failed: ${error.message}`);
    }
  }
  padKey(key, length = 32) {
    try {
      return key.padEnd(length, "0");
    } catch (error) {
      throw new Error(`Key padding failed: ${error.message}`);
    }
  }
  async formatAsUUID(str) {
    try {
      await connectMongo();
      const randomHex = CryptoJS.lib.WordArray.random(3).toString(CryptoJS.enc.Hex);
      const datePart = Date.now().toString().slice(-6);
      const taskID = `task-${randomHex}-${datePart}`.toLowerCase();
      await UUIDMapping.create({
        uuid: taskID,
        value: str,
        createdAt: new Date()
      });
      return taskID;
    } catch (error) {
      throw new Error(`UUID formatting failed: ${error.message}`);
    }
  }
  async parseFromUUID(uuid) {
    try {
      await connectMongo();
      const mapping = await UUIDMapping.findOne({
        uuid: uuid
      });
      if (!mapping) {
        throw new Error("UUID not found");
      }
      return mapping.value;
    } catch (error) {
      throw new Error(`UUID parsing failed: ${error.message}`);
    }
  }
  async encryptAES(text, key) {
    try {
      const paddedKey = this.padKey(key);
      const iv = CryptoJS.lib.WordArray.random(128 / 8);
      const encrypted = CryptoJS.AES.encrypt(text, paddedKey, {
        iv: iv
      });
      const combined = iv.toString() + ":" + encrypted.toString();
      return await this.formatAsUUID(combined);
    } catch (error) {
      throw new Error(`AES encryption failed: ${error.message}`);
    }
  }
  async decryptAES(uuidText, key) {
    try {
      const paddedKey = this.padKey(key);
      const encryptedText = await this.parseFromUUID(uuidText);
      const parts = encryptedText.split(":");
      if (parts.length !== 2) throw new Error("Invalid encrypted text format");
      const iv = CryptoJS.enc.Hex.parse(parts[0]);
      const encrypted = parts[1];
      const decrypted = CryptoJS.AES.decrypt(encrypted, paddedKey, {
        iv: iv
      });
      const result = decrypted.toString(CryptoJS.enc.Utf8);
      if (!result) throw new Error("Decryption returned empty result");
      return result;
    } catch (error) {
      throw new Error(`AES decryption failed: ${error.message}`);
    }
  }
  async encryptMultiLayer(text, key) {
    try {
      const paddedKey = this.padKey(key);
      const timestamp = Date.now().toString();
      const textWithTime = timestamp + "|" + text;
      const iv = CryptoJS.lib.WordArray.random(128 / 8);
      const encrypted = CryptoJS.AES.encrypt(textWithTime, paddedKey, {
        iv: iv
      });
      const aesEncrypted = iv.toString() + ":" + encrypted.toString();
      const base64Encoded = Buffer.from(aesEncrypted).toString("base64");
      const checksum = CryptoJS.MD5(base64Encoded + paddedKey).toString().substring(0, 8);
      const combined = checksum + "." + base64Encoded;
      return await this.formatAsUUID(combined);
    } catch (error) {
      throw new Error(`Multi-layer encryption failed: ${error.message}`);
    }
  }
  async decryptMultiLayer(uuidText, key) {
    try {
      const paddedKey = this.padKey(key);
      const encryptedText = await this.parseFromUUID(uuidText);
      const parts = encryptedText.split(".");
      if (parts.length !== 2) throw new Error("Invalid multi-layer format");
      const checksum = parts[0];
      const base64Data = parts[1];
      const expectedChecksum = CryptoJS.MD5(base64Data + paddedKey).toString().substring(0, 8);
      if (checksum !== expectedChecksum) {
        throw new Error("Invalid checksum - possible key mismatch");
      }
      const aesEncrypted = Buffer.from(base64Data, "base64").toString();
      const aesParts = aesEncrypted.split(":");
      if (aesParts.length !== 2) throw new Error("Invalid AES format");
      const iv = CryptoJS.enc.Hex.parse(aesParts[0]);
      const encrypted = aesParts[1];
      const decrypted = CryptoJS.AES.decrypt(encrypted, paddedKey, {
        iv: iv
      });
      const textWithTime = decrypted.toString(CryptoJS.enc.Utf8);
      if (!textWithTime) throw new Error("Decryption returned empty result");
      const parts2 = textWithTime.split("|");
      if (parts2.length < 2) throw new Error("Invalid timestamp format");
      const timestamp = parts2[0];
      const originalText = parts2.slice(1).join("|");
      return {
        text: originalText,
        timestamp: new Date(parseInt(timestamp)).toISOString(),
        age: Math.floor((Date.now() - parseInt(timestamp)) / 1e3)
      };
    } catch (error) {
      throw new Error(`Multi-layer decryption failed: ${error.message}`);
    }
  }
  async enc({
    data,
    method = "combined",
    ...rest
  }) {
    try {
      if (!data) {
        throw new Error("Data is required for encryption.");
      }
      const dataToEncrypt = typeof data === "object" ? JSON.stringify(data) : data;
      let encrypted;
      switch (method.toLowerCase()) {
        case "aes":
          encrypted = await this.encryptAES(dataToEncrypt, this.defaultKey);
          break;
        case "combined":
        case "multilayer":
          encrypted = await this.encryptMultiLayer(dataToEncrypt, this.defaultKey);
          break;
        default:
          throw new Error(`Unsupported encryption method: ${method}`);
      }
      return {
        uuid: encrypted
      };
    } catch (error) {
      throw new Error(`Encryption process failed: ${error.message}`);
    }
  }
  async dec({
    uuid,
    method = "combined",
    ...rest
  }) {
    try {
      if (!uuid) {
        throw new Error("UUID is required for decryption.");
      }
      let decrypted;
      switch (method.toLowerCase()) {
        case "aes":
          decrypted = await this.decryptAES(uuid, this.defaultKey);
          break;
        case "combined":
        case "multilayer":
          decrypted = await this.decryptMultiLayer(uuid, this.defaultKey);
          break;
        default:
          throw new Error(`Unsupported decryption method: ${method}`);
      }
      if (!decrypted || typeof decrypted === "string" && decrypted.length === 0) {
        throw new Error("Decryption returned empty result");
      }
      if (typeof decrypted === "string") {
        try {
          const jsonResult = JSON.parse(decrypted);
          return typeof jsonResult === "string" ? decrypted : jsonResult;
        } catch (e) {
          return decrypted;
        }
      } else if (typeof decrypted.text === "string") {
        try {
          const jsonResult = JSON.parse(decrypted.text);
          decrypted.text = jsonResult;
          return decrypted;
        } catch (e) {
          return decrypted;
        }
      }
      return decrypted;
    } catch (error) {
      throw new Error(`Decryption process failed: ${error.message}`);
    }
  }
  async clearCache() {
    try {
      await connectMongo();
      const result = await UUIDMapping.deleteMany({});
      console.log(`Cache cleared. Removed ${result.deletedCount} entries.`);
      return result;
    } catch (error) {
      throw new Error(`Cache clearing failed: ${error.message}`);
    }
  }
  async getCacheSize() {
    try {
      await connectMongo();
      return await UUIDMapping.countDocuments();
    } catch (error) {
      throw new Error(`Cache size check failed: ${error.message}`);
    }
  }
  async logCache() {
    try {
      await connectMongo();
      const count = await this.getCacheSize();
      const mappings = await UUIDMapping.find({}).sort({
        createdAt: -1
      }).limit(10).lean();
      console.log("--- UUID Cache ---");
      console.log(`Current cache size: ${count}`);
      mappings.forEach((mapping, index) => {
        console.log(`Entry ${index + 1}:`);
        console.log(`UUID: ${mapping.uuid}`);
        console.log(`Created: ${mapping.createdAt}`);
        console.log("------------------");
      });
      console.log("--- End UUID Cache ---");
      return {
        count: count,
        sample: mappings.slice(0, 3)
      };
    } catch (error) {
      throw new Error(`Cache logging failed: ${error.message}`);
    }
  }
}
const Encoder = new EncoderClient(apiConfig.PASSWORD);
export default Encoder;