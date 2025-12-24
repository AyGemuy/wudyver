import fetch from "node-fetch";
const API_ENDPOINT = "https://code2img.vercel.app";
const themes = ["a11y-dark", "atom-dark", "base16-ateliersulphurpool.light", "cb", "darcula", "default", "dracula", "duotone-dark", "duotone-earth", "duotone-forest", "duotone-light", "duotone-sea", "duotone-space", "ghcolors", "hopscotch", "material-dark", "material-light", "material-oceanic", "nord", "pojoaque", "shades-of-purple", "synthwave84", "vs", "vsc-dark-plus", "xonokai"];
const languages = ["c", "css", "cpp", "go", "html", "java", "javascript", "python", "rust", "typescript"];
const backgroundImages = ["https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT2Ye92kak4Bi2IAprF-ykcdYd6HgaznxIFuqUpG33VvO0RWa98BGA6w81r&s=10", "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSpxJh2JpetuNcNxx89DrZXl9nHtJsQukPbxw&s", "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR8q1eEXUr4C-DZKtIACtr_dgXImZNYwJiEmw&usqp=CAU"];
const detectLanguage = code => {
  if (/^\s*import\s.*\sfrom\s'.*';/.test(code)) return "javascript";
  if (/^\s*def\s\w+\s*\(.*\):/.test(code)) return "python";
  if (/^\s*class\s\w+/.test(code)) return "java";
  if (/^\s*#[^\n]*\n/.test(code)) return "python";
  if (/^\s*public\s+class\s+\w+/.test(code)) return "java";
  if (/^\s*<!DOCTYPE\shtml>/.test(code)) return "html";
  return "javascript";
};
const defaultPreferences = {
  backgroundColor: "radial-gradient(circle, rgba(63,94,251,1) 0%, rgba(252,70,107,1) 100%)",
  showBackground: "true",
  backgroundImage: "",
  showLineNumbers: "false",
  backgroundPadding: 5
};
const fetchImage = async (code, preferences = defaultPreferences) => {
  const selectedLanguage = detectLanguage(code);
  const selectedTheme = themes[Math.floor(Math.random() * themes.length)];
  const randomBackgroundImage = backgroundImages[Math.floor(Math.random() * backgroundImages.length)];
  const queryParams = new URLSearchParams({
    language: selectedLanguage,
    theme: selectedTheme,
    "background-color": preferences.backgroundColor,
    "show-background": preferences.showBackground,
    "line-numbers": preferences.showLineNumbers,
    "background-image": randomBackgroundImage,
    padding: preferences.backgroundPadding
  });
  const requestUrl = `${API_ENDPOINT}/api/to-image?${queryParams.toString()}`;
  try {
    console.log(`Fetching image from URL: ${requestUrl}`);
    const response = await fetch(requestUrl, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain"
      },
      body: code
    });
    if (!response.ok) {
      console.error(`HTTP error! status: ${response.status}`);
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    console.log("Image fetched successfully");
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    return buffer;
  } catch (error) {
    console.error("Error fetching image:", error);
    throw error;
  }
};
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      message: "Method not allowed"
    });
  }
  const {
    code,
    preferences
  } = req.body;
  if (!code) {
    return res.status(400).json({
      message: "Code is required"
    });
  }
  try {
    const imageBuffer = await fetchImage(code, preferences);
    res.setHeader("Content-Type", "image/png");
    return res.status(200).send(imageBuffer);
  } catch (error) {
    res.status(500).json({
      message: "Error fetching image",
      error: error.message
    });
  }
}