import axios from "axios";
import {
  parseStringPromise
} from "xml2js";
class GlowText {
  constructor() {
    this.effects = ["sweetheart", "flutter", "pinkglow", "volcano", "petalprint", "giftwrap", "mrfrosty", "littlehelper", "sprinklesparkle", "seasonsgreetings", "heartbeat", "valentine", "sapphireheart", "signature", "lollipop", "handbag", "tiptoe", "sketchy", "ghostship", "oldenglish", "dragonscale", "magicdust", "substance", "piratescove", "backstreet", "funkyzeit", "airman", "foolsgold", "zephyr", "paintbrush", "lokum", "insignia", "cottoncandy", "fairygarden", "neonlights", "glowstick", "lavender", "ohhai", "bluegecko", "moderno", "petalprint", "rhizome", "devana", "cupcake", "fame", "ionize", "volcano", "broadway", "sweetheart", "starshine", "flowerpower", "gobstopper", "discodiva", "medieval", "fruityfresh", "letterboard", "greenstone", "alieninvasion", "pinkglow", "pinkcandy", "losttales", "glowtxt", "purple", "yourstruly", "electricblue", "greek", "cyrillic", "cyrillic2", "cyrillic3", "korean", "arabic", "arabic2", "arabic3", "hindi", "chinese", "japanese", "hebrew", "hebrew2", "hebrew3", "ethiopic", "ethiopic2", "ethiopic3", "vietnamese", "icelandic", "bengali", "yoruba", "igbo", "armenian", "armenian2", "georgian", "georgian2", "thai", "euro", "euro2", "euro3", "allstars", "dearest", "metropol", "ransom", "bronco", "platformtwo", "fictional", "typeface", "stardate", "beachfront", "arthouse", "sterling", "jukebox", "bubbles", "invitation", "frontier", "surprise", "firstedition", "republika", "jumble", "warehouse", "orientexpress", "orbitron", "starlight", "jet", "tamil", "kannada", "telugu", "punjabi", "malayalam", "odia", "thai2", "thai3", "thai4", "hindi2", "hindi3", "hindi4", "hindi5", "hindi6", "hindi7", "hindi8", "euro4", "arabic4", "arabic5", "arabic6", "hebrew4", "hebrew5", "hebrew6", "cyrillic4", "japanese2", "japanese3", "japanese4", "japanese5", "japanese6", "japanese7", "japanese8", "japanese9", "japanese10", "japanese11", "japanese12", "japanese13", "chinese_tc"];
  }
  async create(effect, text) {
    try {
      const url = `https://glowtxt.com/gentext2.php`;
      const params = {
        text: text,
        text2: "",
        text3: "",
        font_style: effect,
        font_size: "x",
        font_colour: "0",
        bgcolour: "#000000",
        glow_halo: "2",
        non_trans: "false",
        glitter_border: "false",
        anim_type: "none",
        submit_type: "text"
      };
      const headers = {
        Host: "glowtxt.com",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Mobile Safari/537.36",
        "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7"
      };
      const response = await axios.get(url, {
        params: params,
        headers: headers
      });
      const result = await parseStringPromise(response.data);
      const datadir = result?.image?.datadir?.[0];
      const fullFilename = result?.image?.fullfilename?.[0];
      return datadir && fullFilename ? `https://glowtxt.com/${datadir}/${fullFilename}` : null;
    } catch (error) {
      console.error("Error creating glow text:", error);
      return null;
    }
  }
}
export default async function handler(req, res) {
  const {
    effect = "sweetheart",
      text = "Hello"
  } = req.method === "GET" ? req.query : req.body;
  const glowText = new GlowText();
  const result = await glowText.create(effect, text);
  if (result) {
    return res.status(200).json({
      url: result
    });
  } else {
    res.status(500).json({
      error: "Failed to create glow text"
    });
  }
}