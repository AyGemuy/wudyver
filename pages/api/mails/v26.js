import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import SpoofHead from "@/lib/spoof-head";
class SnapMail {
  constructor() {
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar,
      withCredentials: true,
      headers: {
        accept: "application/json",
        "accept-language": "id-ID",
        "cache-control": "no-cache",
        pragma: "no-cache",
        priority: "u=1, i",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        ...SpoofHead()
      }
    }));
    this.state = {
      userId: null,
      emailAddress: null,
      accessToken: null,
      mailboxId: null
    };
  }
  _updateClientJar(newJar) {
    this.jar = newJar;
    this.client.defaults.jar = this.jar;
  }
  async _getInboxList(headers) {
    try {
      const {
        mailboxId
      } = this.state;
      const listUrl = `https://x-box.in/api/users/me/mailboxes/${mailboxId}/messages`;
      const response = await this.client.get(listUrl, {
        headers: headers
      });
      return response?.data?.results || [];
    } catch (e) {
      console.error("[SnapMail] List Error:", e.message);
      return [];
    }
  }
  async create() {
    try {
      console.log("[SnapMail] Creating new email session...");
      const url = "https://www.snapmail.in/api/user";
      const headers = {
        origin: "https://www.snapmail.in",
        referer: "https://www.snapmail.in/id",
        "content-length": "0"
      };
      const response = await this.client.post(url, {}, {
        headers: headers
      });
      const data = response?.data;
      if (!data) throw new Error("No data received from create endpoint");
      this.state.userId = data?.userId;
      this.state.emailAddress = data?.emailAddress;
      this.state.accessToken = data?.accessToken;
      this.state.mailboxId = data?.inboxMailboxId;
      const sessionData = {
        info: this.state,
        cookies: this.jar.toJSON()
      };
      const stateBase64 = Buffer.from(JSON.stringify(sessionData)).toString("base64");
      console.log(`[SnapMail] Success! Email: ${this.state.emailAddress}`);
      return {
        ...data,
        state: stateBase64
      };
    } catch (error) {
      console.error(`[SnapMail] Create Failed: ${error?.message}`);
      return null;
    }
  }
  async message({
    state,
    id = null
  }) {
    if (!state) {
      console.error('[SnapMail] Error: Parameter "state" is required.');
      return null;
    }
    try {
      const decodedStr = Buffer.from(state, "base64").toString("utf-8");
      const sessionData = JSON.parse(decodedStr);
      this.state = {
        ...sessionData?.info
      };
      if (sessionData?.cookies) {
        this._updateClientJar(CookieJar.fromJSON(sessionData.cookies));
      }
      const {
        mailboxId,
        accessToken
      } = this.state;
      if (!mailboxId || !accessToken) {
        console.error("[SnapMail] Invalid State: Missing tokens.");
        return null;
      }
      const headers = {
        origin: "https://www.snapmail.in",
        referer: "https://www.snapmail.in/",
        "sec-fetch-site": "cross-site",
        "x-access-token": accessToken
      };
      let targetId = id;
      if (!targetId) {
        console.log("[SnapMail] Checking inbox...");
        const messages = await this._getInboxList(headers);
        if (!Array.isArray(messages)) return null;
        const sortedMessages = messages.sort((a, b) => b.id - a.id);
        if (sortedMessages.length > 0) {
          const latestMsg = sortedMessages[0];
          targetId = latestMsg.id;
          console.log(`[SnapMail] Found latest ID: ${targetId}`);
        } else {
          console.log("[SnapMail] Inbox empty.");
          return null;
        }
      }
      console.log(`[SnapMail] Fetching content ID: ${targetId}...`);
      const url = `https://x-box.in/api/users/me/mailboxes/${mailboxId}/messages/${targetId}`;
      const response = await this.client.get(url, {
        headers: headers
      });
      return response?.data;
    } catch (error) {
      if (error?.response?.status === 404) {
        console.log(`[SnapMail] Msg ID ${id} not found.`);
      } else {
        console.error(`[SnapMail] Error: ${error?.message}`);
      }
      return null;
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["create", "message"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        example: "/?action=create"
      }
    });
  }
  const api = new SnapMail();
  try {
    let response;
    switch (action) {
      case "create":
        response = await api.create();
        break;
      case "message":
        if (!params.state) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'state' wajib diisi untuk action 'message'."
          });
        }
        response = await api.message(params);
        break;
      default:
        return res.status(400).json({
          status: false,
          error: `Action tidak valid: ${action}.`,
          valid_actions: validActions
        });
    }
    return res.status(200).json({
      action: action,
      ...response
    });
  } catch (error) {
    console.error(`[FATAL ERROR] Kegagalan pada action '${action}':`, error);
    return res.status(500).json({
      status: false,
      message: "Terjadi kesalahan internal pada server atau target website.",
      error: error.message || "Unknown Error"
    });
  }
}