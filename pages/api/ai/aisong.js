import axios from "axios";

const createSong = async (lyrics, style, title) => {
  try {
    const response = await axios.post(
      'https://aisonggenerator.ai/api/create-suno-damo',
      {
        customMode: true,
        instrumental: false,
        prompt: "",
        lyrics: lyrics || "=== === Example Lyrics  End of Example === ",
        isPublic: true,
        style: style || "Pop",
        title: title || "Lagu Pop"
      },
      {
        headers: {
          'accept': '*/*',
          'accept-language': 'id-ID,id;q=0.9',
          'cache-control': 'no-cache',
          'content-type': 'application/json',
          'cookie': 'NEXT_LOCALE=en; trafficSource=%7B%22source_type%22%3A%22referral%22%2C%22source_url%22%3A%22https%3A%2F%2Ftopai.tools%2F%22%2C%22landing_page%22%3A%22%2F%22%2C%22device_type%22%3A%22mobile%22%7D; _gcl_au=1.1.1024903838.1735809323; _ga_HMBJEWZZ89=GS1.1.1735809322.1.0.1735809322.0.0.0; _ga=GA1.1.129287236.1735809323; _hjSessionUser_5251618=eyJpZCI6ImRjOWQ1OTM1LWMzMWEtNThkOS04ZWZiLTU4ZGE2YWIyN2Q1MSIsImNyZWF0ZWQiOjE3MzU4MDkzMjY1MDksImV4aXN0aW5nIjp0cnVlfQ==; _hjSession_5251618=eyJpZCI6IjJiNjllYjBmLWFhZTctNGRlNy1hYTY2LWIxNGYzZGI2ZjIwYiIsImMiOjE3MzU4MDkzMjY1MTIsInMiOjEsInIiOjEsInNiIjowLCJzciI6MCwic2UiOjAsImZzIjoxLCJzcCI6MH0=',
          'origin': 'https://aisonggenerator.ai',
          'pragma': 'no-cache',
          'priority': 'u=1, i',
          'referer': 'https://aisonggenerator.ai/',
          'sec-ch-ua': '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
          'sec-ch-ua-mobile': '?1',
          'sec-ch-ua-platform': '"Android"',
          'sec-fetch-dest': 'empty',
          'sec-fetch-mode': 'cors',
          'sec-fetch-site': 'same-origin',
          'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36'
        }
      }
    );
    return response.data.taskId;
  } catch (error) {
    console.error('Error creating song:', error.message);
  }
};

const getMyMusic = async () => {
  try {
    const response = await axios.get(
      'https://aisonggenerator.ai/api/my-music',
      {
        headers: {
          'accept': '*/*',
          'accept-language': 'id-ID,id;q=0.9',
          'cache-control': 'no-cache',
          'cookie': 'NEXT_LOCALE=en; _gcl_au=1.1.1024903838.1735809323; _ga=GA1.1.129287236.1735809323; _hjSessionUser_5251618=eyJpZCI6ImRjOWQ1OTM1LWMzMWEtNThkOS04ZWZiLTU4ZGE2YWIyN2Q1MSIsImNyZWF0ZWQiOjE3MzU4MDkzMjY1MDksImV4aXN0aW5nIjp0cnVlfQ==; _hjSession_5251618=eyJpZCI6IjJiNjllYjBmLWFhZTctNGRlNy1hYTY2LWIxNGYzZGI2ZjIwYiIsImMiOjE3MzU4MDkzMjY1MTIsInMiOjEsInIiOjEsInNiIjowLCJzciI6MCwic2UiOjAsImZzIjoxLCJzcCI6MH0=; trafficSource=%7B%22source_type%22%3A%22direct%22%2C%22source_url%22%3Anull%2C%22landing_page%22%3A%22%2F%22%2C%22device_type%22%3A%22mobile%22%7D; _ga_HMBJEWZZ89=GS1.1.1735809322.1.1.1735809356.0.0.0',
          'pragma': 'no-cache',
          'priority': 'u=1, i',
          'referer': 'https://aisonggenerator.ai/create',
          'sec-ch-ua': '"Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge Simulate";v="131", "Lemur";v="131"',
          'sec-ch-ua-mobile': '?1',
          'sec-ch-ua-platform': '"Android"',
          'sec-fetch-dest': 'empty',
          'sec-fetch-mode': 'cors',
          'sec-fetch-site': 'same-origin',
          'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36'
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching my music:', error.message);
  }
};

const suno = async (lyrics, style, title) => {
  try {
    const id = await createSong(lyrics, style, title);
    let music = null;

    while (!music || !music.audio_url) {
      const myMusic = await getMyMusic();
      music = myMusic.find(v => v.task_id === id);

      if (!music || !music.audio_url) {
        console.log('Audio belum tersedia, mengulangi...');
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }

    console.log('Audio tersedia:', music.audio_url);
    return music;
  } catch (error) {
    console.error('Failed:', error);
  }
};

export default async function handler(req, res) {
  try {
    const { action, id, lyrics, style, title } = req.method === "GET" ? req.query : req.body;

    if (action === 'check' && id) {
      let music = null;
      while (!music || !music.audio_url) {
        const myMusic = await getMyMusic();
        music = myMusic.find(v => v.task_id === id);
        if (!music || !music.audio_url) {
          console.log('Audio belum tersedia, mengulangi...');
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      }
      return res.status(200).json({ result: music || "Music not found" });
    }

    if (action === 'create' && lyrics) {
      const result = await createSong(lyrics, style, title);
      return res.status(200).json({
        result: typeof result === "object" ? result : result
      });
    }

    if (!action || !id) {
      const result = await suno(lyrics, style, title);
      return res.status(200).json({
        result: typeof result === "object" ? result : result
      });
    }

    return res.status(400).json({ message: "Invalid query parameters" });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "An error occurred while processing your request.",
      error: error.message
    });
  }
}
