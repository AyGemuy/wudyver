import fetch from "node-fetch";
const voices = ["Lotte", "Maxim", "Ayanda", "Salli", "Ola", "Arthur", "Ida", "Tomoko", "Remi", "Geraint", "Miguel", "Elin", "Giorgio", "Marlene", "Ines", "Kajal", "Zhiyu", "Zeina", "Suvi", "Karl", "Gwyneth", "Joanna", "Lucia", "Cristiano", "Astrid", "Andres", "Vicki", "Mia", "Vitoria", "Bianca", "Chantal", "Raveena", "Daniel", "Amy", "Liam", "Ruth", "Kevin", "Brian", "Russell", "Aria", "Matthew", "Aditi", "Dora", "Enrique", "Hans", "Hiujin", "Carmen", "Ivy", "Ewa", "Maja", "Gabrielle", "Nicole", "Filiz", "Camila", "Jacek", "Thiago", "Justin", "Celine", "Kazuha", "Kendra", "Arlet", "Ricardo", "Mads", "Hannah", "Mathieu", "Lea", "Sergio", "Hala", "Tatyana", "Penelope", "Naja", "Olivia", "Ruben", "Laura", "Takumi", "Mizuki", "Carla", "Conchita", "Jan", "Kimberly", "Liv", "Adriano", "Lupe", "Joey", "Pedro", "Seoyeon", "Emma", "Stephen"];
const CUSTOM_WORD_MAP = {
  blgsteve: "B L G Steve",
  bexchat: "Bex Chat",
  specialcei: "Special K",
  cei: "K"
};

function replaceWordsIfNeeded(text) {
  return text.split(" ").map(token => Object.prototype.hasOwnProperty.call(CUSTOM_WORD_MAP, token.toLowerCase()) ? CUSTOM_WORD_MAP[token.toLowerCase()] : token).join(" ");
}
async function getAudioBuffer(voice, text) {
  try {
    const response = await fetch("https://streamlabs.com/polly/speak", {
      method: "POST",
      body: JSON.stringify({
        voice: voice,
        text: text
      }),
      headers: {
        "Content-Type": "application/json;charset=utf-8"
      }
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch audio URL: ${response.statusText}`);
    }
    const json = await response.json();
    if (json.error) {
      throw new Error(json.error);
    }
    if (!json.success) {
      throw new Error("Failed to get TTS audio");
    }
    const audioResponse = await fetch(json.speak_url);
    if (!audioResponse.ok) {
      throw new Error(`Failed to fetch audio buffer: ${audioResponse.statusText}`);
    }
    return Buffer.from(await audioResponse.arrayBuffer());
  } catch (error) {
    throw new Error(error.message || "An unknown error occurred");
  }
}
export default async function handler(req, res) {
  const {
    voice = 1,
      text
  } = req.method === "GET" ? req.query : req.body;
  if (!text) {
    return res.status(400).json({
      success: false,
      message: "Missing parameters"
    });
  }
  const voiceIndex = parseInt(voice, 10) - 1;
  if (isNaN(voiceIndex) || voiceIndex < 0 || voiceIndex >= voices.length) {
    return res.status(400).json({
      success: false,
      message: "Invalid voice parameter"
    });
  }
  try {
    const selectedVoice = voices[voiceIndex];
    const processedText = replaceWordsIfNeeded(text);
    const audioBuffer = await getAudioBuffer(selectedVoice, processedText);
    res.set("Content-Type", "audio/mp3");
    return res.status(200).send(audioBuffer);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
}