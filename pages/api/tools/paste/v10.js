import axios from "axios";
import crypto from "crypto";
const origin = "https://privatebin.net";
class PrivateBin {
  constructor() {
    this.origin = origin;
  }
  getRandomBytes(length) {
    const bytes = crypto.randomBytes(length);
    return Array.from(bytes).map(b => String.fromCharCode(b)).join("");
  }
  generateKey() {
    return this.getRandomBytes(32);
  }
  base58encode(input) {
    const alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
    const buffer = Buffer.from(input, "binary");
    let num = BigInt("0x" + buffer.toString("hex"));
    let encoded = "";
    while (num > 0n) {
      const remainder = num % 58n;
      num = num / 58n;
      encoded = alphabet[Number(remainder)] + encoded;
    }
    for (let i = 0; i < buffer.length && buffer[i] === 0; i++) {
      encoded = "1" + encoded;
    }
    return encoded || "1";
  }
  base58decode(input) {
    const alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
    let num = 0n;
    for (let i = 0; i < input.length; i++) {
      const char = input[i];
      const value = alphabet.indexOf(char);
      if (value === -1) throw new Error("Invalid base58 character");
      num = num * 58n + BigInt(value);
    }
    const hex = num.toString(16);
    const buffer = Buffer.from(hex.padStart(64, "0"), "hex");
    return Array.from(buffer).map(b => String.fromCharCode(b)).join("");
  }
  stringToArraybuffer(message) {
    const messageArray = new Uint8Array(message.length);
    for (let i = 0; i < message.length; i++) {
      messageArray[i] = message.charCodeAt(i);
    }
    return messageArray;
  }
  arraybufferToString(messageArray) {
    const array = new Uint8Array(messageArray);
    let message = "";
    for (let i = 0; i < array.length; i++) {
      message += String.fromCharCode(array[i]);
    }
    return message;
  }
  utf16To8(message) {
    return Buffer.from(encodeURIComponent(message).replace(/%([0-9A-F]{2})/g, (match, hex) => String.fromCharCode(parseInt(hex, 16))), "binary").toString("binary");
  }
  utf8To16(message) {
    return decodeURIComponent(message.split("").map(char => "%" + ("00" + char.charCodeAt(0).toString(16)).slice(-2)).join(""));
  }
  async deriveKey(key, password, spec) {
    const keyArray = this.stringToArraybuffer(key);
    let combinedKey = keyArray;
    if (password.length > 0) {
      const passwordArray = this.stringToArraybuffer(password);
      const newKeyArray = new Uint8Array(keyArray.length + passwordArray.length);
      newKeyArray.set(keyArray, 0);
      newKeyArray.set(passwordArray, keyArray.length);
      combinedKey = newKeyArray;
    }
    return crypto.pbkdf2Sync(Buffer.from(combinedKey), Buffer.from(this.stringToArraybuffer(spec[1])), spec[2], spec[3] / 8, "sha256");
  }
  async encrypt(text, key, password = "", adata = []) {
    try {
      const iv = this.getRandomBytes(16);
      const salt = this.getRandomBytes(8);
      const spec = [iv, salt, 1e5, 256, 128, "aes", "gcm", "none"];
      const encodedSpec = [Buffer.from(spec[0], "binary").toString("base64"), Buffer.from(spec[1], "binary").toString("base64"), spec[2], spec[3], spec[4], spec[5], spec[6], spec[7]];
      if (adata.length === 0) {
        adata = encodedSpec;
      } else if (adata[0] === null) {
        adata[0] = encodedSpec;
      }
      const derivedKey = await this.deriveKey(key, password, spec);
      const message = this.utf16To8(text);
      const messageBuffer = Buffer.from(message, "binary");
      const cipher = crypto.createCipheriv("aes-256-gcm", derivedKey, Buffer.from(spec[0], "binary"));
      cipher.setAAD(Buffer.from(JSON.stringify(adata), "utf8"));
      let encrypted = cipher.update(messageBuffer);
      encrypted = Buffer.concat([encrypted, cipher.final()]);
      const authTag = cipher.getAuthTag();
      const combined = Buffer.concat([encrypted, authTag]);
      const ct = combined.toString("base64");
      return {
        ct: ct,
        adata: adata
      };
    } catch (err) {
      throw new Error("Encryption error: " + err.message);
    }
  }
  async decrypt(ct, key, password = "", adata) {
    try {
      const adataString = JSON.stringify(adata);
      const spec = (adata[0] instanceof Array ? adata[0] : adata).slice();
      spec[0] = Buffer.from(spec[0], "base64").toString("binary");
      spec[1] = Buffer.from(spec[1], "base64").toString("binary");
      const derivedKey = await this.deriveKey(key, password, spec);
      const encryptedBuffer = Buffer.from(ct, "base64");
      const authTagLength = spec[4] / 8;
      const authTag = encryptedBuffer.slice(-authTagLength);
      const ciphertext = encryptedBuffer.slice(0, -authTagLength);
      const decipher = crypto.createDecipheriv("aes-256-gcm", derivedKey, Buffer.from(spec[0], "binary"));
      decipher.setAAD(Buffer.from(adataString, "utf8"));
      decipher.setAuthTag(authTag);
      let decrypted = decipher.update(ciphertext);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      return this.utf8To16(decrypted.toString("binary"));
    } catch (err) {
      throw new Error("Decryption error: " + err.message);
    }
  }
  async create({
    content,
    password = "",
    expire = "1week",
    burnAfterReading = false,
    openDiscussion = false,
    format = "plaintext"
  }) {
    try {
      const key = this.generateKey();
      const message = JSON.stringify({
        paste: content
      });
      const adata = [null, format, openDiscussion ? 1 : 0, burnAfterReading ? 1 : 0];
      const encrypted = await this.encrypt(message, key, password, adata);
      const payload = {
        v: 2,
        adata: encrypted.adata,
        ct: encrypted.ct,
        meta: {
          expire: expire
        }
      };
      const response = await axios.post(this.origin, payload, {
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          origin: this.origin,
          "x-requested-with": "JSONHttpRequest",
          "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
      });
      if (response.data.status === 0) {
        const pasteId = response.data.id;
        const deleteToken = response.data.deletetoken;
        const encodedKey = this.base58encode(key);
        const fullUrl = `${this.origin}/?${pasteId}#${encodedKey}`;
        const deleteUrl = `${this.origin}/?pasteid=${pasteId}&deletetoken=${deleteToken}`;
        return {
          status: "success",
          id: pasteId,
          key: encodedKey,
          url: fullUrl,
          deleteUrl: deleteUrl,
          deleteToken: deleteToken
        };
      } else {
        throw new Error(response.data.message || "Failed to create paste");
      }
    } catch (err) {
      return {
        status: "error",
        error: err.message
      };
    }
  }
  async read({
    id,
    key,
    password = ""
  }) {
    try {
      const response = await axios.get(`${this.origin}/?pasteid=${id}`, {
        headers: {
          accept: "application/json",
          "x-requested-with": "JSONHttpRequest",
          "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
      });
      if (response.data.status === 0) {
        const ct = response.data.ct;
        const adata = response.data.adata;
        const decodedKey = this.base58decode(key).padStart(32, "\0");
        const decrypted = await this.decrypt(ct, decodedKey, password, adata);
        const pasteData = JSON.parse(decrypted);
        return {
          status: "success",
          content: pasteData.paste || decrypted,
          format: adata[1],
          discussion: adata[2] === 1,
          burnAfterReading: adata[3] === 1,
          timeToLive: response.data.meta?.time_to_live || 0
        };
      } else {
        throw new Error(response.data.message || "Paste not found");
      }
    } catch (err) {
      return {
        status: "error",
        error: err.message
      };
    }
  }
  async delete({
    id,
    deleteToken
  }) {
    try {
      const response = await axios.get(`${this.origin}/?pasteid=${id}&deletetoken=${deleteToken}`, {
        headers: {
          accept: "application/json",
          "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
      });
      if (response.data.status === 0) {
        return {
          status: "success",
          message: "Paste deleted successfully"
        };
      } else {
        throw new Error(response.data.message || "Failed to delete paste");
      }
    } catch (err) {
      return {
        status: "error",
        error: err.message
      };
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
      error: "Missing required field: action",
      required: {
        action: "create | read | delete"
      }
    });
  }
  const scraper = new PrivateBin();
  try {
    let result;
    switch (action) {
      case "create":
        if (!params.content) {
          return res.status(400).json({
            error: "Missing required field: content",
            example: {
              action: "create",
              content: "Your text here",
              password: "optional",
              expire: "1week",
              burnAfterReading: false,
              openDiscussion: false,
              format: "plaintext"
            }
          });
        }
        result = await scraper.create(params);
        break;
      case "read":
        if (!params.id || !params.key) {
          return res.status(400).json({
            error: "Missing required fields: id, key",
            example: {
              action: "read",
              id: "paste_id",
              key: "encryption_key",
              password: "optional"
            }
          });
        }
        result = await scraper.read(params);
        break;
      case "delete":
        if (!params.id || !params.deleteToken) {
          return res.status(400).json({
            error: "Missing required fields: id, deleteToken",
            example: {
              action: "delete",
              id: "paste_id",
              deleteToken: "delete_token"
            }
          });
        }
        result = await scraper.delete(params);
        break;
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}`,
          allowed: ["create", "read", "delete"]
        });
    }
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: `Processing error: ${error.message}`
    });
  }
}