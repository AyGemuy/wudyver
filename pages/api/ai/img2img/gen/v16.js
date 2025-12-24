import axios from "axios";
class MorphAI {
  constructor() {
    this.bu = "https://storage.googleapis.com/hardstone_img_us/";
    this.validStyles = null;
    this.styleArray = ["2dCartoon", "3D", "3d", "3d", "3d", "80sCartoon", "80sCartoon", "90s", "90s", "90sanime", "90sanime", "Abyssia", "Afro", "Alita", "Alita", "AmeriDraw", "Ancient", "Angel", "Animation", "Ares", "Ares", "Art Studio", "Aurelia", "Autumn", "Bald", "Barber Shop", "Baroque", "Baroque", "BdayPop", "Bedroom", "Black Eye", "BleachFX", "BlindBox Dog", "BlindBox Girl", "BlindBox Lady", "BlindBox Man", "BlindBox Pets", "BlindBox Skateboard", "BlindBox", "Bling", "Blue Moment", "Blushday", "Blushday", "Bob", "Burgundy", "Butterfly", "Camellia 1", "Camellia 2", "CarRace", "Carnival Night", "Cheerleader", "Cheerleader", "Chefie", "Cheongsam", "Cheongsam", "Cherry", "Cherry", "Chic Blouse", "Childlike", "Classy White", "Clay", "Clay2", "ClayFP", "Clipart", "Combover", "Contour", "Contour", "Coralia", "Coser", "Cozy Sweater", "Cozy SweaterMale", "Crayon", "Crayon", "Crimsia", "Crystal", "Crystal", "CubeCraft", "Curly", "DaisyMe", "Dark Trench", "Dark Trench", "Daznee", "Digital", "Dominant", "Dominant", "Dominant", "Doodle", "Dreadlocks", "Easter", "Elite 1", "Elite 1", "Elite 2", "Elite 2", "Fairy Tale", "Family Portrait", "FauxHawk", "FitBuddy", "Flower Light", "Formal Shirt", "French Sketch", "FrizzyCurls", "Fuji Flash", "Fuji", "Fur Coat", "FuzzyPop", "Gangsta", "Ghiblipro", "Ghost", "Ghosti", "Gianty", "Gianty", "Glacelle", "Goalstar", "Golden Hour", "Group_Shot", "Group_Shot", "Group_Shot", "Halloween Me", "Halloween Model", "Halloween", "HalloweenMale", "HandDrawn", "Harley Pigtails", "Heroic", "HomeDude", "Hoopstar", "Hotlove", "Hotlove", "Ivory", "Ivory", "JOJO", "Jade", "Jersey", "Jersey", "KPop Hunter Male", "KPop Hunter", "KTV", "Kawaii", "KeyChain", "Kimono", "Lafufu", "Leopard Hot", "Leopard Hot", "Leopard", "Leopard", "LifeSim", "Loong Ball", "LooseCurls", "LostFocus", "Lulu Girl", "Lulu Girl", "Lunaria", "Magazine 1", "Magazine 2", "Magazine 3", "Magic Ball", "MagicPill", "Marry Me", "Marry Me", "Mermaid", "Mermaid", "Midnight Call 1", "Midnight Call 2", "Midnight Call 3", "Midnight Call 4", "Mini Me", "Minifig", "Miss Hawaii", "Miss Hawaii", "Mistoire", "Miyazaki", "Miyazaki", "Model Anime", "Model Cat", "Model Dog", "Model Man", "Model Sports", "Model Woman", "Moment", "MonoLine", "Moon Sailor", "Mr Hawaii", "Mr Hawaii", "Muppet", "Mystic Serenity", "Mythia", "Nagomi", "Navy Blue", "NeoDora", "Nightfire", "Nightfire", "Ninjafix", "Noble Gray", "Noel Star", "Noel StarMale", "Oil Painting", "Oil Recoco", "Oil Recoco", "Papillon", "Peanutz", "Pearlith", "Pencil Sketch", "Pet Me", "Pet Me", "Petals", "Phantom", "Phantom", "Picture Book", "Pilot", "Pilot", "PirateFemale", "PirateFemale", "PirateMale", "PirateMale", "Pixar", "Pixar", "Pixel Me", "Pixel Week", "Pixels", "Pizza Horror", "Plaid", "Plaid", "Plaid", "Plant Tone", "PopStar", "Poster Chic", "Power Retro", "Power Retro", "Pregnant", "PregnantMale", "Preppy", "Preppy", "Prince Grace", "Princess Aura", "Pro Shot", "ProHeadshot", "Pumpkin Elf", "Pure Glow", "Pure Glow", "Retro Gaze", "Retro Gaze", "Retro Style", "Retro Style", "Retro Toon", "Rubber Hose", "Sailor", "Santa Red", "Santa RedMale", "Selfie", "Sharkie", "SharkiePet", "ShinFun", "Sketch", "SkiRush", "Skims", "Skims", "Slam Dunk", "Slam Dunk", "Slayer", "Smart", "Smart", "Snoworb", "Snoworb", "Soft Luxe", "Soft Luxe", "Solmare", "Spongee", "Squid Game", "Squid Soldier", "Steampunk", "Steampunk", "Sticklet", "Sticklet", "Straight", "Sunrise 1", "Sunrise 1", "Sunrise 2", "Sunset 1", "Sunset 1", "Sunset 2", "Super Bowl", "Super Bowl", "SuperBowl", "Sylmare", "Tanned", "Tanned", "Tattoo", "Tennis Ace", "Tomboy", "ToonMe", "Toy Me", "Toy Me", "Trick or Treat", "Twintails", "Van Gogh", "Victoria", "VolleyPro", "Wavy", "WebComicFemale", "WebComicMale", "Woodli", "Workee", "Y2K Miss", "Y2K", "Yellowtopia", "YellowtopiaMale", "Zelshade", "animation", "bambi", "barbie", "beach", "beach", "bikini", "bluelover", "bubble", "business", "business", "business", "chibi", "climb", "climb", "comic", "cyber", "darkness", "darkness", "dazzling", "delighted", "detective", "devil", "dragon", "egyptian", "egyptian", "eighty", "elegant", "elegant", "elf", "exotic", "exotic", "fairy", "fairy", "fellow", "fellow", "firework", "firework", "floral", "future", "galaxy", "ghost", "ginger", "ginger", "gogirl", "gothic", "hanfu", "hanfu", "hero", "iOS Emoji", "illustration", "ink", "iron", "iron", "japanese", "jojo", "joyful", "joyful", "king", "king", "korean", "lego", "lightbulb", "linkedlnlady", "linkedlnlady", "luxe", "luxe", "me", "me", "me", "merry", "merry", "modern", "molly_emoji", "monster", "muscular_body", "muscular_body", "nutcracker", "nutcracker", "orange", "pandora", "paper", "pink", "pink", "pinkeyes", "pirate", "pop", "pumpkin", "pureromance", "queen", "queen", "queen", "queen", "rainbow", "rick", "rococo", "rococo", "rosepetals", "rosy", "rosy", "sakura", "santa", "secret", "sitcom", "sitcom", "snowy", "soft", "soft", "spirit", "spooky", "spooky", "sporting", "sporting", "spring", "springprincess", "springprincess", "story", "tomie", "tour", "tour", "tour", "uniform", "uniform", "vibrant", "vogue", "vogue", "war", "watercolor", "wedding", "wedding", "wizard", "wizard", "wizard", "wool", "xmaseve", "youth"];
  }
  log(msg, data = null) {
    console.log(`[MORPH] ${msg}`, data ?? "");
  }
  err(msg, e) {
    console.error(`[MORPH ERR] ${msg}`, e?.response?.data || e?.response || e?.message || e);
  }
  async up(buf, fn) {
    this.log("up: init", fn);
    const sz = buf.length;
    const iu = `https://firebasestorage.googleapis.com/v0/b/hardstone_img_us/o?name=snap_img2img/upload/2025-07-14/${fn}&uploadType=resumable`;
    const ih = {
      "User-Agent": "Dalvik/2.1.0 (Linux; U; Android 10; SM-G9650 Build/QD4A.200805.003)",
      Connection: "Keep-Alive",
      "Accept-Encoding": "gzip",
      "X-Firebase-Storage-Version": "Android/25.13.33 (100400-745790146)",
      "x-firebase-gmpid": "1:890704113682:android:4fe6bc1e015020503a28cb",
      "X-Goog-Upload-Command": "start",
      "X-Goog-Upload-Protocol": "resumable",
      "X-Goog-Upload-Header-Content-Type": "application/octet-stream",
      "Content-Length": "0"
    };
    try {
      const ir = await axios.post(iu, null, {
        headers: ih
      });
      this.log("up: init res", {
        uploadUrl: ir.headers["x-goog-upload-url"]?.slice(0, 60) + "..."
      });
      const uu = ir.headers["x-goog-upload-url"];
      if (!uu) throw new Error("no upload url");
      const uh = {
        "Content-Type": "application/octet-stream",
        "X-Goog-Upload-Command": "upload, finalize",
        "X-Goog-Upload-Offset": "0",
        "X-Goog-Upload-Protocol": "resumable",
        "Content-Length": sz.toString()
      };
      const ur = await axios.post(uu, buf, {
        headers: uh
      });
      this.log("up: final res", ur.data);
      const tk = ur.data?.downloadTokens;
      if (!tk) throw new Error("no downloadTokens in upload response");
      this.log("up: done", {
        fn: fn,
        tk: tk
      });
      return {
        fn: fn,
        tk: tk
      };
    } catch (e) {
      this.err("up failed", e);
      throw e;
    }
  }
  async tk() {
    this.log("tk: fetch");
    try {
      const r = await axios.get("https://token.zone.id/frida-hook/a/bd/jniutils/TokenUtils");
      this.log("tk: res", {
        uid: r.data.uid
      });
      if (!r.data?.uid || !r.data?.token) throw new Error("invalid token");
      return {
        uid: r.data.uid,
        token: r.data.token
      };
    } catch (e) {
      this.err("tk failed", e);
      throw e;
    }
  }
  async hdl(img) {
    if (Buffer.isBuffer(img)) {
      this.log("hdl: buffer", {
        size: img.length
      });
      return img;
    }
    if (typeof img === "string" && img.startsWith("http")) {
      this.log("hdl: fetch url", img);
      const r = await axios.get(img, {
        responseType: "arraybuffer"
      });
      this.log("hdl: downloaded", {
        size: r.data.byteLength
      });
      return Buffer.from(r.data);
    }
    if (typeof img === "string" && img.startsWith("data:")) {
      this.log("hdl: base64");
      const b64 = img.split(",")[1] ?? "";
      return Buffer.from(b64, "base64");
    }
    throw new Error("invalid image input");
  }
  getValidStyles() {
    if (this.validStyles) return this.validStyles;
    this.log("styles: using hardcoded array");
    this.validStyles = this.styleArray.map(s => ({
      id: s,
      name: s
    }));
    return this.validStyles;
  }
  resolveStyle(styleInput) {
    const styleNum = parseInt(styleInput);
    if (!isNaN(styleNum) && styleNum >= 1 && styleNum <= this.styleArray.length) {
      const styleName = this.styleArray[styleNum - 1];
      this.log(`style: resolved ${styleNum} → ${styleName}`);
      return styleName;
    }
    if (typeof styleInput === "string" && this.styleArray.includes(styleInput)) {
      this.log(`style: using ${styleInput}`);
      return styleInput;
    }
    const defaultStyle = this.styleArray[0];
    this.log(`style: invalid ${styleInput} → using default ${defaultStyle}`);
    return defaultStyle;
  }
  async generate({
    pro_t = "",
    imageUrl,
    style = null,
    ...rest
  }) {
    this.log("gen: start", {
      pro_t: !!pro_t,
      image: !!imageUrl,
      style: style
    });
    try {
      if (!imageUrl) throw new Error("imageUrl required");
      const buf = await this.hdl(imageUrl);
      const fn = `img_${Date.now()}.jpg`;
      const {
        fn: ufn,
        tk: ftk
      } = await this.up(buf, fn);
      const {
        uid,
        token
      } = await this.tk();
      if (!ftk) throw new Error("no file token");
      const validStyle = style ? this.resolveStyle(style) : this.styleArray[0];
      const pl = {
        image_name: `snap_img2img/upload/2025-07-14/${fn}`,
        pro_t: pro_t,
        style_id: validStyle,
        strength: 50,
        bs: "4",
        ratio: 1,
        is_first: "1",
        gender: "auto",
        ...rest
      };
      this.log("gen: submit payload", pl);
      await new Promise(r => setTimeout(r, 2e3));
      const headers = {
        "User-Agent": "okhttp/4.12.0",
        "Content-Type": "application/json",
        "Accept-Encoding": "gzip",
        uid: uid,
        token: token
      };
      const r = await axios.post("https://ai.hardstonepte.ltd/snap/img2img/", pl, {
        headers: headers
      });
      this.log("gen: submit res", r.data);
      const responseData = r?.data;
      if (responseData?.response === "ok") {
        const imageUrlArray = responseData?.data?.image_url ?? responseData?.image_url;
        if (Array.isArray(imageUrlArray)) {
          const imageUrls = imageUrlArray.map(relativePath => this.bu + relativePath);
          this.log("gen: success", imageUrls);
          return {
            success: true,
            data: {
              images: imageUrls,
              taskId: responseData?.data?.task_id ?? responseData?.task_id,
              count: imageUrls.length,
              usedStyle: validStyle
            }
          };
        }
      }
      const errMsg = responseData?.message || responseData?.error || "submit failed";
      throw new Error(errMsg);
    } catch (e) {
      this.err("gen failed", e);
      return {
        success: false,
        error: e?.message || "unknown error",
        details: e?.response?.data
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    imageUrl,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!imageUrl) {
    return res.status(400).json({
      error: "Input 'imageUrl' wajib diisi."
    });
  }
  try {
    const api = new MorphAI();
    const response = await api.generate({
      imageUrl: imageUrl,
      ...params
    });
    return res.status(200).json(response);
  } catch (error) {
    console.error("Terjadi kesalahan pada API:", error);
    res.status(500).json({
      error: error.message || "Internal Server Error"
    });
  }
}