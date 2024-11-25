import fetch from 'node-fetch';

async function SayTTS(voice, text, pitch, speed) {
  try {
    pitch = parseInt(pitch);
    speed = parseInt(speed);

    const voiceList = [
      "Adult Female #1, American English (TruVoice)",
      "Adult Female #2, American English (TruVoice)",
      "Adult Male #1, American English (TruVoice)",
      "Adult Male #2, American English (TruVoice)",
      "Adult Male #3, American English (TruVoice)",
      "Adult Male #4, American English (TruVoice)",
      "Adult Male #5, American English (TruVoice)",
      "Adult Male #6, American English (TruVoice)",
      "Adult Male #7, American English (TruVoice)",
      "Adult Male #8, American English (TruVoice)",
      "Female Whisper",
      "Male Whisper",
      "Mary",
      "Mary (for Telephone)",
      "Mary in Hall",
      "Mary in Space",
      "Mary in Stadium",
      "Mike",
      "Mike (for Telephone)",
      "Mike in Hall",
      "Mike in Space",
      "Mike in Stadium",
      "RoboSoft Five",
      "RoboSoft Four",
      "RoboSoft One",
      "RoboSoft Six",
      "RoboSoft Three",
      "RoboSoft Two",
      "Sam",
      "BonziBUDDY",
    ];

    const selectedVoice = voiceList[parseInt(voice) - 1];

    if (!selectedVoice) {
      return { success: false, message: 'Invalid voice parameter' };
    }

    const url = `https://tetyys.com/SAPI4/SAPI4?text=${encodeURIComponent(text)}&voice=${encodeURIComponent(selectedVoice)}&pitch=${pitch}&speed=${speed}`;

    if (text.length > 4088) {
      throw new Error("Text exceeds the maximum allowed length (4088 characters)");
    }

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch audio: ${response.statusText}`);
    }

    const buffer = await response.arrayBuffer();
    return Buffer.from(buffer);
  } catch (error) {
    throw error;
  }
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { voice, text, pitch, speed } = req.query;

    if (!voice || !text || !pitch || !speed) {
      return res.status(400).json({ success: false, message: 'Missing parameters' });
    }

    try {
      const audioBuffer = await SayTTS(voice, text, pitch, speed);

      if (!audioBuffer.success) {
        return res.status(400).json(audioBuffer);
      }

      res.set('Content-Type', 'audio/mp3');
      return res.status(200).send(audioBuffer);

    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  } else {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }
}
