import fetch from "node-fetch";
export default async function handler(req, res) {
  const {
    voice = 1,
      text
  } = req.method === "GET" ? req.query : req.body;
  if (!text) {
    return res.status(400).json({
      success: false,
      message: "Missing voice or text parameter"
    });
  }
  const voices = ["Filiz", "Astrid", "Tatyana", "Maxim", "Carmen", "Ines", "Cristiano", "Vitoria", "Ricardo", "Maja", "Jan", "Jacek", "Ewa", "Ruben", "Lotte", "Liv", "Seoyeon", "Takumi", "Mizuki", "Giorgio", "Carla", "Bianca", "Karl", "Dora", "Mathieu", "Celine", "Chantal", "Penelope", "Miguel", "Mia", "Enrique", "Conchita", "Geraint", "Salli", "Matthew", "Kimberly", "Kendra", "Justin", "Joey", "Joanna", "Ivy", "Raveena", "Aditi", "Emma", "Brian", "Amy", "Russell", "Nicole", "Vicki", "Marlene", "Hans", "Naja", "Mads", "Gwyneth", "Zhiyu", "es-ES-Standard-A", "it-IT-Standard-A", "it-IT-Wavenet-A", "ja-JP-Standard-A", "ja-JP-Wavenet-A", "ko-KR-Standard-A", "ko-KR-Wavenet-A", "pt-BR-Standard-A", "tr-TR-Standard-A", "sv-SE-Standard-A", "nl-NL-Standard-A", "nl-NL-Wavenet-A", "en-US-Wavenet-A", "en-US-Wavenet-B", "en-US-Wavenet-C", "en-US-Wavenet-D", "en-US-Wavenet-E", "en-US-Wavenet-F", "en-GB-Standard-A", "en-GB-Standard-B", "en-GB-Standard-C", "en-GB-Standard-D", "en-GB-Wavenet-A", "en-GB-Wavenet-B", "en-GB-Wavenet-C", "en-GB-Wavenet-D", "en-US-Standard-B", "en-US-Standard-C", "en-US-Standard-D", "en-US-Standard-E", "de-DE-Standard-A", "de-DE-Standard-B", "de-DE-Wavenet-A", "de-DE-Wavenet-B", "de-DE-Wavenet-C", "de-DE-Wavenet-D", "en-AU-Standard-A", "en-AU-Standard-B", "en-AU-Wavenet-A", "en-AU-Wavenet-B", "en-AU-Wavenet-C", "en-AU-Wavenet-D", "en-AU-Standard-C", "en-AU-Standard-D", "fr-CA-Standard-A", "fr-CA-Standard-B", "fr-CA-Standard-C", "fr-CA-Standard-D", "fr-FR-Standard-C", "fr-FR-Standard-D", "fr-FR-Wavenet-A", "fr-FR-Wavenet-B", "fr-FR-Wavenet-C", "fr-FR-Wavenet-D", "da-DK-Wavenet-A", "pl-PL-Wavenet-A", "pl-PL-Wavenet-B", "pl-PL-Wavenet-C", "pl-PL-Wavenet-D", "pt-PT-Wavenet-A", "pt-PT-Wavenet-B", "pt-PT-Wavenet-C", "pt-PT-Wavenet-D", "ru-RU-Wavenet-A", "ru-RU-Wavenet-B", "ru-RU-Wavenet-C", "ru-RU-Wavenet-D", "sk-SK-Wavenet-A", "tr-TR-Wavenet-A", "tr-TR-Wavenet-B", "tr-TR-Wavenet-C", "tr-TR-Wavenet-D", "tr-TR-Wavenet-E", "uk-UA-Wavenet-A", "ar-XA-Wavenet-A", "ar-XA-Wavenet-B", "ar-XA-Wavenet-C", "cs-CZ-Wavenet-A", "nl-NL-Wavenet-B", "nl-NL-Wavenet-C", "nl-NL-Wavenet-D", "nl-NL-Wavenet-E", "en-IN-Wavenet-A", "en-IN-Wavenet-B", "en-IN-Wavenet-C", "fil-PH-Wavenet-A", "fi-FI-Wavenet-A", "el-GR-Wavenet-A", "hi-IN-Wavenet-A", "hi-IN-Wavenet-B", "hi-IN-Wavenet-C", "hu-HU-Wavenet-A", "id-ID-Wavenet-A", "id-ID-Wavenet-B", "id-ID-Wavenet-C", "it-IT-Wavenet-B", "it-IT-Wavenet-C", "it-IT-Wavenet-D", "ja-JP-Wavenet-B", "ja-JP-Wavenet-C", "ja-JP-Wavenet-D", "cmn-CN-Wavenet-A", "cmn-CN-Wavenet-B", "cmn-CN-Wavenet-C", "cmn-CN-Wavenet-D", "nb-no-Wavenet-E", "nb-no-Wavenet-A", "nb-no-Wavenet-B", "nb-no-Wavenet-C", "nb-no-Wavenet-D", "vi-VN-Wavenet-A", "vi-VN-Wavenet-B", "vi-VN-Wavenet-C", "vi-VN-Wavenet-D", "sr-rs-Standard-A", "lv-lv-Standard-A", "is-is-Standard-A", "bg-bg-Standard-A", "af-ZA-Standard-A", "Tracy", "Danny", "Huihui", "Yaoyao", "Kangkang", "HanHan", "Zhiwei", "Asaf", "An", "Stefanos", "Filip", "Ivan", "Heidi", "Herena", "Kalpana", "Hemant", "Matej", "Andika", "Rizwan", "Lado", "Valluvar", "Linda", "Heather", "Sean", "Michael", "Karsten", "Guillaume", "Pattara", "Jakub", "Szabolcs", "Hoda", "Naayf"];
  if (!voices[parseInt(voice) - 1]) {
    return res.status(400).json({
      success: false,
      message: "Invalid voice parameter"
    });
  }
  const voiceParam = voices[parseInt(voice) - 1];
  const apiUrl = `https://api.streamelements.com/kappa/v2/speech?voice=${encodeURIComponent(voiceParam)}&text=${encodeURIComponent(text)}`;
  try {
    const response = await fetch(apiUrl);
    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        message: "Error from external API"
      });
    }
    const arrayBuffer = await response.arrayBuffer();
    res.set("Content-Type", "audio/mp3");
    return res.status(200).send(Buffer.from(arrayBuffer));
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });
  }
}