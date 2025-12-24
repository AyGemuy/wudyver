import fetch from "node-fetch";
export default async function handler(req, res) {
  try {
    const response = await fetch("https://translate.google.com/translate_a/l?client=webapp&sl=auto&tl=en&v=1.0&hl=en&pv=1&tk=&source=bh&ssel=0&tsel=0&kc=1&tk=626515.626515&q=");
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    const data = await response.json();
    const languages = data?.tl || [];
    return res.status(200).json({
      success: true,
      languages: languages
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
}