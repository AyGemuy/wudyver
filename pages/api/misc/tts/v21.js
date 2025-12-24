import axios from "axios";
import * as cheerio from "cheerio";
import {
  FormData,
  Blob
} from "formdata-node";
import apiConfig from "@/configs/apiConfig";
class AIVoice {
  constructor() {
    this.bUrl = "https://theaivoicegenerator.com";
    this.uploadUrl = `https://${apiConfig.DOMAIN_URL}/api/tools/upload`;
    this.axI = axios.create({
      baseURL: this.bUrl,
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
        "Accept-Language": "id-ID,id;q=0.9"
      }
    });
    this.cookies = {};
    this.initData = null;
    this.mdls = {
      langs: [],
      voices: {}
    };
    this.homepageVoices = null;
    this.fN = ["Olivia", "Emma", "Ava", "Sophia", "Isabella", "Mia", "Charlotte", "Amelia", "Harper", "Evelyn", "Abigail", "Emily", "Elizabeth", "Sofia", "Avery", "Ella", "Scarlett", "Grace", "Chloe", "Victoria", "Riley", "Zoey", "Nora", "Lily", "Hannah", "Layla", "Penelope", "Aurora", "Stella", "Maya", "Luna", "Willow", "Camila", "Gianna", "Aria"];
    this.mN = ["Noah", "Liam", "William", "Mason", "James", "Benjamin", "Jacob", "Michael", "Elijah", "Ethan", "Alexander", "Oliver", "Daniel", "Lucas", "Matthew", "David", "Joseph", "Samuel", "John", "Robert", "Andrew", "Christopher", "Joshua", "Anthony", "Ryan", "Leo", "Owen", "Caleb", "Isaac", "Jack", "Henry", "Wyatt", "Julian", "Levi", "Aaron"];
    this.axI.interceptors.response.use(res => {
      const setCookieHeader = res.headers["set-cookie"];
      if (setCookieHeader) {
        setCookieHeader.forEach(cookie => {
          const parts = cookie.split(";")[0].split("=");
          if (parts.length === 2) {
            this.cookies[parts[0]] = parts[1];
          }
        });
      }
      return res;
    }, error => Promise.reject(error));
    this.axI.interceptors.request.use(cfg => {
      const cookies = Object.entries(this.cookies).map(([key, value]) => `${key}=${value}`).join("; ");
      if (cookies) {
        cfg.headers.Cookie = cookies;
      }
      return cfg;
    }, error => Promise.reject(error));
    this._initializePromise = this._init();
  }
  async _init() {
    console.log("[INIT] Memulai inisialisasi scraper.");
    const pgData = await this.fPgC();
    if (!pgData) {
      console.error("[INIT] Gagal memuat konten halaman awal.");
      return false;
    }
    try {
      await this.eID(pgData);
      await this.eM(pgData);
      this.homepageVoices = await this._scrapeHomepageVoiceList();
      console.log("[INIT] Inisialisasi selesai. Homepage voices dimuat:", Object.keys(this.homepageVoices).length);
      return true;
    } catch (error) {
      console.error("[INIT] Error selama inisialisasi:", error.message);
      return false;
    }
  }
  mVIN(vId, g) {
    const p = vId.split("-");
    if (p.length < 3) return vId;
    const lC = p[p.length - 1].toUpperCase();
    const gU = g ? g.toUpperCase() : "";
    const cI = lC.charCodeAt(0) - "A".charCodeAt(0);
    let mN = lC;
    if (!isNaN(parseInt(lC, 10))) {
      mN = "Voice " + lC;
    } else if (gU === "FEMALE" && cI >= 0 && cI < this.fN.length) {
      mN = this.fN[cI];
    } else if (gU === "MALE" && cI >= 0 && cI < this.mN.length) {
      mN = this.mN[cI];
    }
    return mN;
  }
  async fPgC() {
    console.log("[fPgC] Mengambil konten halaman dasar.");
    try {
      const res = await this.axI.get("/ai-voices-by-gender/");
      console.log("[fPgC] Konten halaman dasar berhasil diambil. Status:", res.status);
      return {
        $: cheerio.load(res.data),
        html: res.data
      };
    } catch (error) {
      console.error("[fPgC] Error mengambil konten halaman dasar:", error.message);
      return null;
    }
  }
  async _scrapeHomepageVoiceList() {
    console.log("[_scrapeHomepageVoiceList] Mengambil daftar suara dari halaman utama.");
    try {
      const {
        data: html
      } = await this.axI.get("/");
      const $ = cheerio.load(html);
      const voiceList = {};
      $("div.tools-category ul.tools-link-list li a").each((i, el) => {
        const href = $(el).attr("href");
        const text = $(el).text();
        if (href && href.startsWith(this.bUrl + "/")) {
          const path = href.substring(this.bUrl.length + 1).replace(/\/$/, "");
          voiceList[path] = text;
        }
      });
      console.log("[_scrapeHomepageVoiceList] Berhasil mengambil", Object.keys(voiceList).length, "suara dari halaman utama.");
      return voiceList;
    } catch (error) {
      console.error(`[_scrapeHomepageVoiceList] Error scraping homepage voice list: ${error.message}`);
      return {};
    }
  }
  async eID(data) {
    console.log("[eID] Mengekstrak data inisialisasi.");
    const $ = data.$;
    const uId = $('form[data-instance-id] input[name="unique_id"]').val();
    const nonce = $('form[data-instance-id] input[name="mgntts_nonce"]').val();
    const sG = $("#selected_gender_mgntts_71877").val();
    const lC = $("#selected_language_code_mgntts_71877").val();
    const vN = $("#selected_voice_value_mgntts_71877").val();
    if (!nonce) {
      throw new Error("Nonce not found.");
    }
    this.initData = {
      cookies: this.cookies,
      nonce: nonce,
      fD: {
        unique_id: uId,
        gender: sG || "FEMALE",
        language_code: lC || "en-GB",
        voice_name: vN || ""
      }
    };
    console.log("[eID] Data inisialisasi berhasil diekstrak.");
  }
  async eM(data) {
    console.log("[eM] Mengekstrak model suara TTS umum.");
    const html = data.html;
    let aVD = {};
    const cR = /\(jQuery,\s*(\{[\s\S]*?\})\s*\)/;
    const mtch = html.match(cR);
    if (mtch && mtch[1]) {
      const cJS = mtch[1];
      try {
        const pC = JSON.parse(cJS);
        if (pC.availableVoicesData && pC.action === "mgntts_generate_proxy") {
          aVD = pC.availableVoicesData;
        }
      } catch (e) {
        console.warn("[eM] Gagal mengurai JSON konfigurasi model TTS:", e.message);
      }
    }
    const langs = [];
    const voices = {};
    if (aVD && Object.keys(aVD).length > 0) {
      for (const lC in aVD) {
        if (Object.hasOwnProperty.call(aVD, lC)) {
          const lI = aVD[lC];
          langs.push({
            code: lC,
            name: lI.name
          });
          voices[lC] = [];
          if (lI.voices && Array.isArray(lI.voices)) {
            lI.voices.forEach(v => {
              voices[lC].push({
                id: v.name,
                name: this.mVIN(v.name, v.gender),
                gender: v.gender
              });
            });
          }
        }
      }
    }
    this.mdls = {
      langs: langs,
      voices: voices
    };
    console.log("[eM] Model suara TTS umum berhasil diekstrak.");
  }
  async gID() {
    await this._initializePromise;
    return this.initData;
  }
  async list() {
    await this._initializePromise;
    return this.mdls;
  }
  _getAvailableVoicesMapTTS() {
    const availableVoices = {};
    if (this.mdls && this.mdls.voices) {
      for (const langCode in this.mdls.voices) {
        this.mdls.voices[langCode].forEach(voice => {
          availableVoices[voice.id] = voice.name;
        });
      }
    }
    return availableVoices;
  }
  async gPL(iLC = null) {
    await this._initializePromise;
    if (!this.mdls || !this.mdls.langs || this.mdls.langs.length === 0) {
      return [];
    }
    const langs = [...this.mdls.langs];
    let enUS = null;
    const oLangs = langs.filter(l => {
      if (l.code === "en-US") {
        enUS = l;
        return false;
      }
      return true;
    });
    oLangs.sort((a, b) => a.name.localeCompare(b.name));
    const dO = [{
      code: "#",
      name: "-- Select Language --",
      isSelected: false,
      isDisabled: true
    }];
    if (enUS) {
      dO.push({
        code: enUS.code,
        name: enUS.name,
        isSelected: enUS.code === iLC,
        isDisabled: false
      });
    }
    oLangs.forEach(l => {
      dO.push({
        code: l.code,
        name: l.name,
        isSelected: l.code === iLC,
        isDisabled: false
      });
    });
    return dO;
  }
  async gPV(sLC, gF, tVId = null) {
    await this._initializePromise;
    if (!this.mdls || !this.mdls.voices || !this.mdls.voices[sLC]) {
      return [{
        id: "#",
        name: "-- Select Voice --",
        isSelected: false,
        isDisabled: true
      }];
    }
    const lDV = this.mdls.voices[sLC];
    let vTS = lDV.filter(v => {
      if (gF === "BOTH") {
        return true;
      }
      return v.gender && v.gender.toUpperCase() === gF.toUpperCase();
    });
    const iGP = this.initData?.fD?.gender || "FEMALE";
    vTS.sort((a, b) => {
      const nA = this.mVIN(a.id, a.gender);
      const nB = this.mVIN(b.id, b.gender);
      if (gF === "BOTH") {
        const gA = a.gender?.toUpperCase();
        const gB = b.gender?.toUpperCase();
        if (gA === iGP && gB !== iGP) return -1;
        if (gA !== iGP && gB === iGP) return 1;
      }
      return nA.localeCompare(nB);
    });
    const dO = [{
      id: "#",
      name: "-- Select Voice --",
      isSelected: false,
      isDisabled: true
    }];
    let vTSel = null;
    if (tVId) {
      vTSel = vTS.find(v => v.id === tVId);
    }
    if (!vTSel && vTS.length > 0) {
      vTSel = vTS[0];
    }
    vTS.forEach(v => {
      dO.push({
        id: v.id,
        name: v.name,
        gender: v.gender,
        isSelected: v.id === (vTSel ? vTSel.id : null),
        isDisabled: false
      });
    });
    return dO;
  }
  async uA(buffer, mimeType = "audio/mpeg", fileName = "audio.mp3") {
    try {
      const formData = new FormData();
      formData.append("file", new Blob([buffer], {
        type: mimeType
      }), fileName);
      const {
        data: uploadResponse
      } = await axios.post(this.uploadUrl, formData, {
        headers: {
          ...formData.headers ? formData.headers : {}
        }
      });
      if (!uploadResponse) {
        throw new Error("Upload failed");
      }
      return uploadResponse.result;
    } catch (error) {
      if (error.response) {
        throw new Error(`Error uploading image: Server responded with status ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      } else if (error.request) {
        throw new Error("Error uploading image: No response received from server.");
      } else {
        throw new Error("Error uploading image: " + error.message);
      }
    }
  }
  async tts({
    voice: vName = "Abigail",
    text: tTS = "Hello"
  }) {
    console.log(`[TTS] Memulai generasi TTS untuk suara "${vName}" dengan teks "${tTS.substring(0, 30)}..."`);
    await this._initializePromise;
    if (!this.initData || !this.mdls) {
      console.error("[TTS] Scraper belum terinisialisasi atau model TTS belum dimuat.");
      return {
        success: false,
        error: "Scraper belum terinisialisasi.",
        available_voices: {}
      };
    }
    const availableVoices = this._getAvailableVoicesMapTTS();
    console.log("[TTS] Memeriksa ketersediaan suara TTS.");
    let aVId = null;
    let aLC = null;
    let aG = null;
    let aMM = "audio/mp3";
    let fV = null;
    if (availableVoices[vName]) {
      aVId = vName;
      for (const lC in this.mdls.voices) {
        fV = this.mdls.voices[lC].find(v => v.id === aVId);
        if (fV) {
          aLC = lC;
          aG = fV.gender;
          break;
        }
      }
    } else {
      for (const lC in this.mdls.voices) {
        if (Object.hasOwnProperty.call(this.mdls.voices, lC)) {
          fV = this.mdls.voices[lC].find(v => this.mVIN(v.id, v.gender).toLowerCase() === vName.toLowerCase() || v.name.toLowerCase() === vName.toLowerCase());
          if (fV) {
            aVId = fV.id;
            aLC = lC;
            aG = fV.gender;
            break;
          }
        }
      }
    }
    if (!aVId || !aLC || !aG) {
      console.error(`[TTS] Voice ID atau nama "${vName}" tidak ditemukan. Mengembalikan daftar suara yang tersedia.`);
      return {
        success: false,
        error: `Voice ID atau nama "${vName}" tidak ditemukan untuk metode TTS.`,
        available_voices: availableVoices
      };
    }
    console.log(`[TTS] Suara "${vName}" ditemukan. ID: ${aVId}, Bahasa: ${aLC}, Gender: ${aG}.`);
    const uId = this.initData.fD.unique_id;
    const nonce = this.initData.nonce;
    const fD = new FormData();
    fD.append("action", "mgntts_generate_proxy");
    fD.append("unique_id", uId);
    fD.append("gender", aG);
    fD.append("mgntts_nonce", nonce);
    fD.append("language_code", aLC);
    fD.append("voice_name", aVId);
    fD.append("text_to_speech", tTS);
    fD.append("mgntts_nonce", nonce);
    console.log("[TTS] FormData siap. Mengirim permintaan POST ke admin-ajax.php.");
    try {
      const res = await this.axI.post("/wp-admin/admin-ajax.php", fD, {
        headers: {
          "Content-Type": `multipart/form-data; boundary=${fD.boundary}`,
          Accept: "*/*",
          Origin: this.bUrl,
          Referer: `${this.bUrl}/ai-voices-by-gender/`,
          "Sec-Fetch-Dest": "empty",
          "Sec-Fetch-Mode": "cors",
          "Sec-Fetch-Site": "same-origin",
          Priority: "u=1, i",
          "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"'
        },
        withCredentials: true
      });
      console.log("[TTS] Permintaan POST berhasil. Status:", res.status);
      const gData = res.data;
      if (gData.success && gData.data && gData.data.audio_content) {
        console.log("[TTS] Konten audio Base64 diterima.");
        const aC = gData.data.audio_content;
        const mM = gData.data.mime_type || aMM;
        const aB = Buffer.from(aC, "base64");
        try {
          const uUrl = await this.uA(aB, mM);
          console.log("[TTS] Audio berhasil diunggah.");
          return {
            success: true,
            audio_url: uUrl,
            ...gData.data
          };
        } catch (uErr) {
          console.error(`[TTS] Gagal mengunggah audio: ${uErr.message}`);
          return {
            success: false,
            error: `Gagal mengunggah audio: ${uErr.message}`,
            original_response_data: gData.data,
            available_voices: availableVoices
          };
        }
      } else {
        console.warn("[TTS] Respons berhasil, namun tidak ada konten audio atau format tidak sesuai:", gData);
        return {
          ...gData,
          available_voices: availableVoices
        };
      }
    } catch (error) {
      console.error(`[TTS] Error saat menghasilkan audio: ${error.message}`);
      if (error.response) {
        console.error("[TTS] Detail error respons:", error.response.status, error.response.data);
      }
      return {
        success: false,
        error: `Error saat menghasilkan audio: ${error.message}`,
        available_voices: availableVoices
      };
    }
  }
  async aivoice({
    voice: targetVoiceId = "spongebob-ai-voice",
    text: textToSpeak = "This is a generic voice test."
  }) {
    console.log(`[AIVOICE] Memulai generasi AI Voice untuk suara "${targetVoiceId}" dengan teks "${textToSpeak.substring(0, 30)}..."`);
    await this._initializePromise;
    if (!this.initData || !this.homepageVoices) {
      console.error("[AIVOICE] Scraper belum terinisialisasi atau daftar suara AI Voice belum dimuat.");
      return {
        success: false,
        error: "Scraper belum terinisialisasi atau daftar suara AI Voice belum dimuat.",
        available_voices: {}
      };
    }
    const availableVoices = this.homepageVoices;
    console.log("[AIVOICE] Memeriksa ketersediaan suara AI Voice.");
    let actualVoiceId = targetVoiceId;
    let foundVoice = false;
    if (availableVoices[targetVoiceId]) {
      foundVoice = true;
    } else {
      for (const id in availableVoices) {
        if (availableVoices[id].toLowerCase() === targetVoiceId.toLowerCase() || availableVoices[id].toLowerCase().includes(targetVoiceId.toLowerCase()) && targetVoiceId.length > 3) {
          actualVoiceId = id;
          foundVoice = true;
          break;
        }
      }
    }
    if (!foundVoice) {
      console.error(`[AIVOICE] Voice ID atau nama "${targetVoiceId}" tidak ditemukan.`);
      return {
        success: false,
        error: `Voice ID atau nama "${targetVoiceId}" tidak ditemukan.`,
        available_voices: availableVoices
      };
    }
    console.log(`[AIVOICE] Suara "${targetVoiceId}" ditemukan. Menggunakan actualVoiceId: ${actualVoiceId}.`);
    const voicePageUrl = `${this.bUrl}/${actualVoiceId}/`;
    console.log(`[AIVOICE] Mengambil halaman suara: ${voicePageUrl}`);
    let $;
    let pageHtml = "";
    try {
      const response = await this.axI.get(voicePageUrl, {
        responseType: "text"
      });
      pageHtml = response.data;
      $ = cheerio.load(pageHtml);
      console.log("[AIVOICE] Halaman suara berhasil dimuat.");
    } catch (error) {
      console.error(`[AIVOICE] Gagal memuat halaman suara ${voicePageUrl}: ${error.message}`);
      return {
        success: false,
        error: `Gagal memuat halaman untuk voice_id: ${actualVoiceId}. Pastikan URL-nya benar. Error: ${error.message}`,
        available_voices: availableVoices
      };
    }
    let instanceId = null;
    let nonce = null;
    let nonceName = null;
    let modelId = null;
    let voiceIdFromHtml = null;
    const cleanedActualVoiceIdForRegex = actualVoiceId.replace(/-/g, "[_-]").replace(/\//g, "[_/]");
    const scriptRegex = new RegExp(`<script type="application/json" id="tts-config-master_tts_${cleanedActualVoiceIdForRegex}[_0-9a-fA-F]*?">\\s*({.*?})\\s*<\\/script>`, "s");
    const scriptMatch = pageHtml.match(scriptRegex);
    if (scriptMatch && scriptMatch[1]) {
      console.log("[AIVOICE] Ditemukan script konfigurasi JSON. Mencoba parse...");
      try {
        const config = JSON.parse(scriptMatch[1]);
        if (config.instanceId && config.nonce && config.nonceName && config.ajaxAction === "master_tts_generate_audio") {
          instanceId = config.instanceId;
          nonce = config.nonce;
          nonceName = config.nonceName;
          console.log("[AIVOICE] Data dari script JSON berhasil diekstrak.");
        }
      } catch (e) {
        console.warn(`[AIVOICE] Gagal mengurai JSON dari script untuk ${actualVoiceId}: ${e.message}. Mencoba fallback.`);
      }
    }
    let formElement;
    if (instanceId) {
      formElement = $(`form[data-instance-id="${instanceId}"]`);
      console.log(`[AIVOICE] Mencari form dengan data-instance-id="${instanceId}".`);
    } else {
      const formPrefix = `master_tts_${actualVoiceId.replace(/-/g, "_").replace(/\//g, "_")}`;
      formElement = $(`form[data-instance-id^="${formPrefix}"]`);
      console.log(`[AIVOICE] InstanceId belum ditemukan, mencoba mencari form dengan data-instance-id yang diawali "${formPrefix}".`);
      if (formElement.length > 0) {
        instanceId = formElement.attr("data-instance-id");
        if (instanceId) {
          console.log("[AIVOICE] InstanceId ditemukan via form:", instanceId);
          if (!nonce || !nonceName) {
            nonceName = `master_tts_nonce_${instanceId}`;
            nonce = $(`input[name="${nonceName}"]`, formElement).val();
            if (nonce) console.log("[AIVOICE] Nonce dan NonceName ditemukan via form.");
          }
        }
      }
    }
    if (formElement.length > 0) {
      modelId = $(`input[name="model_id"]`, formElement).val();
      voiceIdFromHtml = $(`input[name="voice_id"]`, formElement).val();
      console.log(`[AIVOICE] model_id: ${modelId}, voice_id_from_html: ${voiceIdFromHtml} ditemukan dari form.`);
    }
    if (!instanceId || !nonce || !nonceName || !modelId || !voiceIdFromHtml) {
      console.error("[AIVOICE] Gagal mengekstrak parameter form penting.");
      return {
        success: false,
        error: `Gagal mengekstrak data form yang diperlukan (instanceId, nonce, model_id, voice_id) untuk voice_id: ${actualVoiceId}. Mungkin struktur halaman berubah atau elemen kunci tidak ditemukan.`,
        available_voices: availableVoices
      };
    }
    console.log(`[AIVOICE] Semua parameter form berhasil diekstrak: InstanceID: ${instanceId}, Nonce: ${nonce}, ModelID: ${modelId}, VoiceID (HTML): ${voiceIdFromHtml}.`);
    const formData = new FormData();
    formData.append("action", "master_tts_generate_audio");
    formData.append(nonceName, nonce);
    formData.append("text", textToSpeak);
    formData.append("model_id", modelId);
    formData.append("voice_id", voiceIdFromHtml);
    formData.append("instance_id", instanceId);
    console.log("[AIVOICE] FormData siap. Mengirim permintaan POST ke admin-ajax.php.");
    try {
      const response = await this.axI.post("/wp-admin/admin-ajax.php", formData, {
        headers: {
          "Content-Type": `multipart/form-data; boundary=${formData.boundary}`,
          "sec-ch-ua-platform": '"Android"',
          Referer: voicePageUrl,
          "Accept-Language": "id-ID,id;q=0.9",
          "sec-ch-ua": '"Lemur";v="135", "", "", "Microsoft Edge Simulate";v="135"',
          "sec-ch-ua-mobile": "?1",
          "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36"
        },
        responseType: "arraybuffer",
        withCredentials: true
      });
      console.log("[AIVOICE] Permintaan POST berhasil. Status:", response.status);
      const contentType = response.headers["content-type"];
      console.log(`[AIVOICE] Response Content-Type: ${contentType}`);
      if (contentType && contentType.includes("audio")) {
        console.log("[AIVOICE] Respon adalah data audio biner langsung.");
        const audioBuffer = Buffer.from(response.data);
        const mimeType = contentType.split(";")[0].trim();
        try {
          const uploadedUrl = await this.uA(audioBuffer, mimeType);
          console.log("[AIVOICE] Audio berhasil diunggah.");
          return {
            success: true,
            audio_url: uploadedUrl,
            mime_type: mimeType
          };
        } catch (uErr) {
          console.error(`[AIVOICE] Gagal mengunggah audio: ${uErr.message}`);
          return {
            success: false,
            error: `Gagal mengunggah audio: ${uErr.message}`,
            original_response_data: null,
            available_voices: availableVoices
          };
        }
      } else if (contentType && contentType.includes("application/json")) {
        let responseData;
        try {
          responseData = JSON.parse(response.data.toString());
          console.log("[AIVOICE] Respon adalah JSON. Memeriksa konten audio.");
        } catch (jsonErr) {
          console.error(`[AIVOICE] Gagal mengurai JSON dari respons: ${jsonErr.message}`);
          return {
            success: false,
            error: `Gagal mengurai JSON dari respons API: ${jsonErr.message}`,
            available_voices: availableVoices
          };
        }
        if (responseData.success && responseData.data && responseData.data.audio_content) {
          console.log("[AIVOICE] Konten audio Base64 diterima dari JSON.");
          const audioContent = responseData.data.audio_content;
          const mimeType = responseData.data.mime_type || "audio/mp3";
          const audioBuffer = Buffer.from(audioContent, "base64");
          try {
            const uploadedUrl = await this.uA(audioBuffer, mimeType);
            console.log("[AIVOICE] Audio berhasil diunggah.");
            return {
              success: true,
              audio_url: uploadedUrl,
              ...responseData.data
            };
          } catch (uErr) {
            console.error(`[AIVOICE] Gagal mengunggah audio: ${uErr.message}`);
            return {
              success: false,
              error: `Gagal mengunggah audio: ${uErr.message}`,
              original_response_data: responseData.data,
              available_voices: availableVoices
            };
          }
        } else {
          console.warn("[AIVOICE] Respon JSON sukses, namun tidak ada konten audio Base64 atau format tidak sesuai:", responseData);
          return {
            ...responseData,
            available_voices: availableVoices
          };
        }
      } else {
        console.error(`[AIVOICE] Respon tidak dikenali atau tidak ada konten audio: Content-Type: ${contentType}, Data: ${response.data.toString().substring(0, 100)}...`);
        return {
          success: false,
          error: `Respon tidak dikenali dari API. Content-Type: ${contentType}`,
          original_response_data: response.data.toString().substring(0, 500),
          available_voices: availableVoices
        };
      }
    } catch (error) {
      console.error(`[AIVOICE] Error saat mengirim permintaan POST: ${error.message}`);
      if (axios.isAxiosError(error) && error.response) {
        console.error("[AIVOICE] Detail error respons Axios:", error.response.status, error.response.data ? error.response.data.toString() : "No data");
      }
      return {
        success: false,
        error: `Error saat menghasilkan audio: ${error.message}`,
        available_voices: availableVoices
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
        action: "list | tts | aivoice"
      }
    });
  }
  const mic = new AIVoice();
  try {
    let result;
    switch (action) {
      case "list":
        result = await mic[action]();
        break;
      case "tts":
        if (!params.text) {
          return res.status(400).json({
            error: `Missing required field: text (required for ${action})`
          });
        }
        result = await mic[action](params);
        break;
      case "aivoice":
        if (!params.text) {
          return res.status(400).json({
            error: `Missing required field: text (required for ${action})`
          });
        }
        result = await mic[action](params);
        break;
      default:
        return res.status(400).json({
          error: `Invalid action: ${action}. Allowed: list | tts | aivoice`
        });
    }
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: `Processing error: ${error.message}`
    });
  }
}