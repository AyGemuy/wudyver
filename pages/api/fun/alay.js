export default function handler(req, res) {
  const {
    text
  } = req.method === "GET" ? req.query : req.body;
  if (!text) {
    return res.status(400).json({
      error: "Paramenter 'text' diperlukan"
    });
  }
  const result = text.replace(/[a-z]/gi, v => Math.random() > .5 ? v[["toLowerCase", "toUpperCase"][Math.floor(2 * Math.random())]]() : v).replace(/[abegiors]/gi, v => {
    if (Math.random() > .5) return v;
    switch (v.toLowerCase()) {
      case "a":
        return "4";
      case "b":
        return Math.random() > .5 ? "8" : "13";
      case "e":
        return "3";
      case "g":
        return Math.random() > .5 ? "6" : "9";
      case "i":
        return "1";
      case "o":
        return "0";
      case "r":
        return "12";
      case "s":
        return "5";
    }
  });
  return res.status(200).json({
    result: result
  });
}