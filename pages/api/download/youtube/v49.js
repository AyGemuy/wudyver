import axios from "axios";
class Downloader {
  constructor(config) {
    this.baseUrl = "mnuu.nu";
    this.gA = 0;
    this.gB = String.fromCharCode(109, 110, 117, 117, 46, 110, 117);
    this.gC;
    this.dynamicG0;
    this.dynamicGO;
    this.log = config.logging || false;
    this.headers = {
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
      "Accept-Encoding": "gzip, deflate, br",
      "Accept-Language": "en-US,en;q=0.9,id-ID;q=0.8,id;q=0.7,as;q=0.6",
      "Cache-Control": "max-age=0",
      Dnt: "1",
      "Sec-Ch-Ua": `"Not-A.Brand";v="99", "Chromium";v="124"`,
      "Sec-Ch-Ua-Mobile": "?1",
      "Sec-Ch-Ua-Platform": "Android",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
      "Sec-Fetch-User": "?1",
      "Upgrade-Insecure-Requests": "1",
      Origin: "https://y2mate.nu",
      Referer: "https://y2mate.nu/"
    };
  }
  async getDownloadLink({
    url,
    format = "mp3"
  }) {
    try {
      const videoId = this.validateUrl(url);
      if (!this.validateFormat(format)) throw new Error(`Format tidak valid. Gunakan "mp3" atau "mp4".`);
      const {
        title,
        download,
        progress
      } = await this.startConvert(videoId, format);
      await this.getProgress(progress);
      return {
        title: title,
        downloadUrl: download
      };
    } catch (e) {
      console.error(e);
      throw new Error(`Error: ${e.message}`);
    }
  }
  async getConvertUrl() {
    try {
      const a = await this.getSignature();
      if (!a) throw new Error("Gagal mendapatkan signature");
      const response = await axios.get(`https://d.${this.baseUrl}/api/v1/init?a=${a}&_=${Math.random()}`, {
        headers: this.headers
      });
      const json = response.data;
      if (json.error === 1) throw new Error("Gagal mendapatkan Convert URL");
      return json.convertURL;
    } catch (e) {
      console.error(e);
      throw new Error(`Error: ${e.message}`);
    }
  }
  async startConvert(videoId, format = "mp3") {
    try {
      const url = await this.getConvertUrl();
      let response = await axios.get(`${url}&v=${videoId}&f=${format}&_=${Math.random()}`, {
        headers: this.headers
      });
      let json = response.data;
      if (json.error === 1) throw new Error("Gagal konversi, kemungkinan server error");
      if (json.redirect === 1) {
        if (this.log) console.log("Redirect terdeteksi, memproses URL redirect.");
        response = await axios.get(json.redirectURL, {
          headers: this.headers
        });
        json = response.data;
      }
      return {
        title: json.title,
        download: json.downloadURL,
        progress: json.progressURL
      };
    } catch (e) {
      console.error(e);
      throw new Error(`Error: ${e.message}`);
    }
  }
  async getProgress(url) {
    try {
      while (true) {
        let response = await axios.get(`${url}&_${Math.random()}`, {
          headers: this.headers
        });
        let json = response.data;
        if (json.error === 1) throw new Error("Gagal mendapatkan progress, kemungkinan server error");
        if (json.progress === 3) break;
        await this.sleep(500);
      }
      return true;
    } catch (e) {
      console.error(e);
      throw new Error(`Error: ${e.message}`);
    }
  }
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  validateUrl(url) {
    if (!url || typeof url !== "string") {
      throw new Error("URL harus berupa string.");
    }
    try {
      new URL(url);
      const match = /(?:youtu\.be\/|youtube\.com(?:.*[?&]v=|.*\/))([^?&]+)/.exec(url);
      if (match) {
        return match[1];
      } else {
        throw new Error(`URL tidak valid: ${url}`);
      }
    } catch (e) {
      throw new Error(`URL tidak valid: ${url}`);
    }
  }
  validateFormat(format) {
    return ["mp3", "mp4"].includes(format);
  }
  async extractSignature() {
    try {
      if (this.log) console.log(`Mendapatkan HTML dari https://y2mate.nu...`);
      const response = await axios.get("https://y2mate.nu", {
        headers: this.headers
      });
      const htmlContent = response.data;
      if (this.log) console.log("HTML didapatkan.");
      const regex = /eval\(atob\('([^']+)'\)\)/;
      const match = htmlContent.match(regex);
      if (match && match[1]) {
        const base64EncodedJs = match[1];
        if (this.log) console.log("JS base64 encoded ditemukan.");
        const decodedJs = atob(base64EncodedJs);
        if (this.log) console.log("JS Dekode:", decodedJs);
        const objectVarRegex = /var\s+([a-zA-Z0-9_]+)\s*=\s*(\{.*?\});/;
        const arrayVarRegex = /var\s+([a-zA-Z0-9_]+)\s*=\s*(\[.*?\]);/;
        const objectMatch = decodedJs.match(objectVarRegex);
        const arrayMatch = decodedJs.match(arrayVarRegex);
        if (objectMatch && objectMatch[1] && objectMatch[2] && arrayMatch && arrayMatch[1] && arrayMatch[2]) {
          const objectVarName = objectMatch[1];
          let objectString = objectMatch[2];
          const arrayVarName = arrayMatch[1];
          let arrayString = arrayMatch[2];
          const firstElementInArrayRegex = new RegExp(`\\['"${objectVarName}"',`);
          if (!arrayString.match(firstElementInArrayRegex) && !arrayString.match(new RegExp(`\\["${objectVarName}",`))) {
            const firstElementInArraySingleQuoteRegex = new RegExp(`\\['${objectVarName}',`);
            if (!arrayString.match(firstElementInArraySingleQuoteRegex)) {
              console.error(`Error: Elemen pertama dalam array var (${arrayVarName}) tidak merujuk ke objek var (${objectVarName}).`);
              console.error(`Nama Objek Var: ${objectVarName}`);
              console.error(`Array String: ${arrayString}`);
              return null;
            }
          }
          console.log(`Objek variabel teridentifikasi: ${objectVarName}`);
          console.log(`Array variabel terindentifikasi: ${arrayVarName}`);
          try {
            const jsonCompatibleObjectString = objectString.replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3');
            const jsonCompatibleArrayString = arrayString.replace(/'/g, '"');
            const parsedObject = JSON.parse(jsonCompatibleObjectString);
            const parsedArray = JSON.parse(jsonCompatibleArrayString);
            if (this.log) console.log("Dinamik variabel didapatkan");
            return {
              g0: parsedObject,
              gO: parsedArray
            };
          } catch (parseError) {
            console.error("Error saat parsing g0/gO string sebagai JSON:", parseError);
            console.error("g0 string setelah dimodif:", jsonCompatibleObjectString);
            console.error("gO string setelah dimodif:", jsonCompatibleArrayString);
            return null;
          }
        } else {
          console.error("Tidak mengekstrak g0 atau gO string menggunakan regex dari decoded JS.");
          return null;
        }
      } else {
        console.error("Tidak dapat menemukan pola eval(atob(...)) di HTML.");
        return null;
      }
    } catch (error) {
      console.error("Gagal mendapatkan atau memproses HTML:", error.message);
      if (error.response) {
        console.error("Status:", error.response.status);
      }
      return null;
    }
  }
  async getSignature() {
    const extractedData = await this.extractSignature();
    if (extractedData) {
      this.dynamicG0 = extractedData.g0;
      this.dynamicGO = extractedData.gO;
    } else {
      if (this.log) console.log("Tidak dapat memproses g0/gO.");
    }
    if (!this.dynamicG0 || !this.dynamicGO) {
      console.error("dynamicG0 atau dynamicGO belum di-inisialisasi.");
      return false;
    }
    if (this.log) console.log("--- Memulai this.getSignature() ---");
    this.gC = this.dynamicG0;
    this.gC.c = this.gC[this.dynamicGO[1]];
    this.gC.f = this.gC[this.dynamicGO[2]];
    this.gC.t = this.gC[this.dynamicGO[3]];
    if (this.log) {
      console.log("gC.f (dynamicG0[gO[2]]):", JSON.stringify(this.gC.f));
      console.log("gC.t (dynamicG0[gO[3]]):", JSON.stringify(this.gC.t));
    }
    let evalCheckString = atob(this.gC.t[0]);
    let evalCheckResult;
    if (evalCheckString.match(/^\d+$/)) {
      evalCheckResult = Number(evalCheckString);
    } else {
      if (this.log) console.warn(`Tidak dapat 'eval' string dengan aman "${evalCheckString}". Mencoba konversi langsung.`);
      try {
        evalCheckResult = Number(evalCheckString);
        if (isNaN(evalCheckResult) && typeof this.gC.t[1] === "string" && evalCheckString === this.gC.t[1]) {
          evalCheckResult = evalCheckString;
        } else if (isNaN(evalCheckResult)) {
          console.error("evalCheckString bukan angka sederhana dan tidak dapat dikonversi.");
          return false;
        }
      } catch (e) {
        console.error("Error selama penggantian 'eval' manual untuk pemeriksaan:", e);
        return false;
      }
    }
    if (this.log) console.log(`Pemeriksaan 'eval' manual: hasil = ${evalCheckResult}. Diharapkan: ${this.gC.t[1]}`);
    if (evalCheckResult != this.gC.t[1]) {
      if (this.log) console.log("Pemeriksaan otorisasi gagal.");
      return !1;
    }
    if (this.log) console.log("Pemeriksaan 'eval' otorisasi lulus.");
    var key = this.gC.f[6].split("").reverse().join("") + this.gC.f[7];
    if (this.log) console.log(`Bagian kunci awal 1 (f[6] + f[7] terbalik): "${key}"`);
    var decodedGC0 = atob(this.gC[0]);
    var indicesStrArray = decodedGC0.split(this.gC.f[5]);
    if (this.log) console.log(`Array string indeks: beberapa yang pertama adalah ${indicesStrArray.slice(0, 3).join(",")}... total ${indicesStrArray.length}`);
    var charSource = 0 < this.gC.f[4] ? this.gC[1].split("").reverse().join("") : this.gC[1];
    if (this.log) console.log(`Sumber string karakter: "${charSource.substring(0, 10)}..."`);
    for (var cIdx = 0; cIdx < indicesStrArray.length; cIdx++) {
      let indexVal = parseInt(indicesStrArray[cIdx]);
      let indexToUse = indexVal - this.gC.f[3];
      if (indexToUse < 0 || indexToUse >= charSource.length) {
        key += charSource[indexToUse];
      } else {
        key += charSource[indexToUse];
      }
    }
    if (this.log) console.log(`Kunci setelah loop: "${key.substring(0, 10)}...${key.slice(-10)}" (panjang ${key.length})`);
    var firstPartLength = this.gC.f[6].length + this.gC.f[7].length;
    if (1 == this.gC.f[1]) {
      key = key.substring(0, firstPartLength) + key.substring(firstPartLength).toLowerCase();
      if (this.log) console.log(`Kunci setelah toLowerCase: "${key.substring(0, 10)}...${key.slice(-10)}"`);
    } else if (2 == this.gC.f[1]) {
      key = key.substring(0, firstPartLength) + key.substring(firstPartLength).toUpperCase();
      if (this.log) console.log(`Kunci setelah toUpperCase: "${key.substring(0, 10)}...${key.slice(-10)}"`);
    }
    var finalString;
    if (0 < this.gC.f[0].length) {
      let prefix = atob(this.gC.f[0]).replace(String.fromCharCode(this.gC.f[8]), "");
      finalString = prefix + "_" + this.gC[2];
      if (this.log) console.log(`String terakhir dibangun menggunakan f[0]`);
    } else if (0 < this.gC.f[2]) {
      finalString = key.substring(0, this.gC.f[2] + firstPartLength) + "_" + this.gC[2];
      if (this.log) console.log(`String akhir dibangun menggunakan substring kunci`);
    } else {
      finalString = key + "_" + this.gC[2];
      if (this.log) console.log(`String akhir dibangun menggunakan kunci penuh + "_" + gC[2]`);
    }
    if (this.log) {
      console.log(`bagian kunci: "${key.substring(0, 10)}...${key.slice(-10)}"`);
      console.log(`bagian gC[2]: "${this.gC[2]}"`);
      console.log(`Gabungan finalString sebelum btoa: "${finalString.substring(0, 10)}...${finalString.slice(-45)}" (panjang ${finalString.length})`);
    }
    let b64Result = btoa(finalString);
    if (this.log) console.log(`Hasil akhir yang dikodekan btoa: "${b64Result}"`);
    return b64Result;
  }
}
export default async function handler(req, res) {
  try {
    const params = req.method === "GET" ? req.query : req.body;
    if (!params.url) return res.status(400).json({
      error: "No URL"
    });
    const yt = new Downloader({
      logging: params.logging
    });
    const result = await yt.getDownloadLink(params);
    return res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}