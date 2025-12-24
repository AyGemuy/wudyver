export default async function handler(req, res) {
  const {
    text
  } = req.method === "GET" ? req.query : req.body;
  if (!text || typeof text !== "string") {
    return res.status(400).json({
      message: "Harap masukkan teks yang ingin convert!"
    });
  }
  const charMap = {
    a: "ᔑ",
    b: "ʖ",
    c: "ᓵ",
    d: "↸",
    e: "ᒷ",
    f: "⎓",
    g: "⊣",
    h: "⍑",
    i: "╎",
    j: "⋮",
    k: "ꖌ",
    l: "ꖎ",
    m: "ᒲ",
    n: "リ",
    o: "𝙹",
    p: "!¡",
    q: "ᑑ",
    r: "∷",
    s: "ᓭ",
    t: "ℸ ̣",
    u: "⚍",
    v: "⍊",
    w: "∴",
    x: "̇/",
    y: "||",
    z: "⨅"
  };
  const convertToEnchant = text => {
    return text.toLowerCase().split("").map(char => charMap[char] || char).join("");
  };
  try {
    const convertedText = convertToEnchant(text);
    return res.status(200).json({
      input: text,
      converted: convertedText
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Error during conversion",
      error: error
    });
  }
}