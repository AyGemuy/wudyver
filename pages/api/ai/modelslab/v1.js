import axios from "axios";
class ModelsLab {
  constructor() {
    this.keys = null;
    this.is_initialized = false;
    this.api_url = "https://apikey-api.vercel.app/apiKey";
    this.base_url = "https://modelslab.com/api/v6";
    this.client = axios.create({
      baseURL: this.base_url,
      timeout: 12e4,
      headers: {
        "Content-Type": "application/json"
      }
    });
  }
  _log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const safeData = JSON.parse(JSON.stringify(data || {}));
    if (safeData?.payload?.key) {
      safeData.payload.key = "***";
    }
    console.log(`[${timestamp}] [ModelsLab] [${level.toUpperCase()}] ${message}`, data ? safeData : "");
  }
  async _initialize_keys() {
    try {
      this._log("info", "Mengambil kunci API...");
      const response = await axios.get(this.api_url);
      if (response.status !== 200) throw new Error(`Kesalahan HTTP: ${response.status}`);
      const data = response.data.data;
      this.keys = {
        txt2img: data[79]?.apiKey || null,
        txt2vid: data[80]?.apiKey || null
      };
      if (!this.keys.txt2img && !this.keys.txt2vid) {
        throw new Error("Tidak ada kunci API yang valid ditemukan.");
      }
      this.is_initialized = true;
      this._log("info", "Inisialisasi kunci API berhasil.");
    } catch (error) {
      this._log("error", "Inisialisasi kunci gagal.", {
        message: error.message
      });
      throw new Error(`Inisialisasi kunci gagal: ${error.message}`);
    }
  }
  async _ensure_auth() {
    if (this.is_initialized) return;
    await this._initialize_keys();
  }
  async _request(endpoint, payload) {
    try {
      this._log("info", `Mengirim permintaan ke ${endpoint}`, {
        payload: payload
      });
      const response = await this.client.post(endpoint, payload);
      this._log("info", `Respon dari ${endpoint}`, {
        status: response.status
      });
      return response.data;
    } catch (error) {
      this._log("error", `Terjadi kesalahan saat memanggil ${endpoint}`, error?.response?.data || error.message);
      throw new Error(`Panggilan API ke ${endpoint} gagal: ${error?.response?.data?.message || error.message}`);
    }
  }
  async _process_image(image_input) {
    if (!image_input) return null;
    if (typeof image_input === "string" && image_input.startsWith("http")) {
      return image_input;
    }
    await this._ensure_auth();
    let base64_string;
    if (Buffer.isBuffer(image_input)) {
      base64_string = `data:image/jpeg;base64,${image_input.toString("base64")}`;
    } else if (typeof image_input === "string" && image_input.startsWith("data:image/")) {
      base64_string = image_input;
    } else if (typeof image_input === "string") {
      base64_string = `data:image/jpeg;base64,${image_input}`;
    } else {
      this._log("warn", "Format gambar tidak didukung untuk pra-unggah, mencoba menggunakan input mentah.", {
        input: image_input
      });
      return image_input;
    }
    try {
      this._log("info", "Melakukan pra-unggah gambar base64 untuk mendapatkan URL...");
      const response = await this._request("/base64_to_url", {
        key: this.keys.txt2img || this.keys.txt2vid,
        base64_string: base64_string
      });
      if (response && response.output) {
        this._log("info", "Pra-unggah berhasil.", {
          url: response.output
        });
        return response.output;
      } else {
        throw new Error("Respon pra-unggah tidak valid.");
      }
    } catch (error) {
      this._log("error", "Pra-unggah gambar base64 gagal.", {
        message: error.message
      });
      throw error;
    }
  }
  async txt2img({
    prompt,
    realtime = true,
    ...rest
  }) {
    await this._ensure_auth();
    const endpoint = realtime ? "/realtime/text2img" : "/images/text2img";
    const base_payload = realtime ? {
      prompt: "ultra realistic close up portrait ((beautiful pale cyberpunk female with heavy black eyeliner))",
      negative_prompt: "bad quality",
      width: "512",
      height: "512",
      safety_checker: false,
      seed: null,
      samples: 1,
      base64: false,
      webhook: null,
      track_id: null
    } : {
      model_id: "flux",
      prompt: "ultra realistic close up portrait ((beautiful pale cyberpunk female with heavy black eyeliner)), blue eyes, shaved side haircut, hyper detail, cinematic lighting, magic neon, dark red city, Canon EOS R3, nikon, f/1.4, ISO 200, 1/160s, 8K, RAW, unedited, symmetrical balance, in-frame, 8K",
      negative_prompt: "bad quality",
      width: "512",
      height: "512",
      samples: "1",
      num_inference_steps: "31",
      safety_checker: "no",
      seed: null,
      guidance_scale: 7.5,
      clip_skip: "2",
      vae: null,
      webhook: null,
      track_id: null
    };
    const payload = {
      key: this.keys.txt2img || this.keys.txt2vid,
      ...base_payload,
      ...rest,
      prompt: prompt
    };
    return await this._request(endpoint, payload);
  }
  async img2img({
    prompt,
    imageUrl,
    realtime = true,
    ...rest
  }) {
    await this._ensure_auth();
    const endpoint = realtime ? "/realtime/img2img" : "/images/img2img";
    const base_payload = realtime ? {
      prompt: "a cat sitting on a bench",
      negative_prompt: "bad quality",
      init_image: null,
      width: "512",
      height: "512",
      samples: "1",
      temp: false,
      safety_checker: false,
      strength: .7,
      seed: null,
      webhook: null,
      track_id: null
    } : {
      init_image: null,
      init_image_2: null,
      prompt: "a girl from image one holding the can from image two",
      negative_prompt: "(worst quality:2), (low quality:2), (normal quality:2), (jpeg artifacts), (blurry), (duplicate), (morbid), (mutilated), (out of frame), (extra limbs), (bad anatomy), (disfigured), (deformed), (cross-eye), (glitch), (oversaturated), (overexposed), (underexposed), (bad proportions), (bad hands), (bad feet), (cloned face), (long neck), (missing arms), (missing legs), (extra fingers), (fused fingers), (poorly drawn hands), (poorly drawn face), (mutation), (deformed eyes), watermark, text, logo, signature, grainy, tiling, censored, nsfw, ugly, blurry eyes, noisy image, bad lighting, unnatural skin, asymmetry",
      model_id: "flux-kontext-dev",
      num_inference_steps: "28",
      strength: "0.5",
      guidance: "2.5",
      enhance_prompt: null
    };
    const payload = {
      key: this.keys.txt2img || this.keys.txt2vid,
      ...base_payload,
      ...rest,
      prompt: prompt,
      init_image: await this._process_image(imageUrl),
      init_image_2: rest.init_image_2 ? await this._process_image(rest.init_image_2) : undefined
    };
    return await this._request(endpoint, payload);
  }
  async txt2vid({
    prompt,
    ultra = false,
    ...rest
  }) {
    await this._ensure_auth();
    const endpoint = ultra ? "/video/text2video_ultra" : "/video/text2video";
    const base_payload = ultra ? {
      prompt: "Space Station in space",
      negative_prompt: "low quality",
      model_id: "wan2.1",
      resolution: 480,
      num_frames: 92,
      num_inference_steps: 8,
      guidance_scale: 1,
      shift_sample: 3,
      fps: 18,
      webhook: null,
      track_id: null
    } : {
      model_id: "cogvideox",
      prompt: "Space Station in space",
      negative_prompt: "low quality",
      height: 512,
      width: 512,
      num_frames: 25,
      num_inference_steps: 20,
      guidance_scale: 7,
      upscale_height: 640,
      upscale_width: 1024,
      upscale_strength: .6,
      upscale_guidance_scale: 12,
      upscale_num_inference_steps: 20,
      output_type: "gif",
      webhook: null,
      track_id: null
    };
    const payload = {
      key: this.keys.txt2vid || this.keys.txt2img,
      ...base_payload,
      ...rest,
      prompt: prompt
    };
    return await this._request(endpoint, payload);
  }
  async img2vid({
    prompt,
    imageUrl,
    ultra = false,
    ...rest
  }) {
    await this._ensure_auth();
    const endpoint = ultra ? "/video/img2video_ultra" : "/video/img2video";
    const base_payload = ultra ? {
      init_image: null,
      prompt: "moving character",
      model_id: "wan2.1",
      negative_prompt: "low quality",
      resolution: 320,
      num_frames: 92,
      num_inference_steps: 8,
      guidance_scale: 1,
      webhook: null,
      track_id: null
    } : {
      model_id: "svd",
      init_image: null,
      height: 512,
      width: 512,
      num_frames: 25,
      num_inference_steps: 20,
      min_guidance_scale: 1,
      max_guidance_scale: 3,
      motion_bucket_id: 20,
      noise_aug_strength: .02,
      webhook: null,
      track_id: null
    };
    const payload = {
      key: this.keys.txt2vid || this.keys.txt2img,
      ...base_payload,
      ...rest,
      prompt: prompt,
      init_image: await this._process_image(imageUrl)
    };
    return await this._request(endpoint, payload);
  }
  async status({
    type,
    task_id,
    ...rest
  }) {
    await this._ensure_auth();
    let endpoint;
    if (type === "image") {
      endpoint = `/realtime/fetch/${task_id}`;
    } else if (type === "video") {
      endpoint = `/video/fetch/${task_id}`;
    } else if (type === "voice") {
      endpoint = `/voice/fetch/${task_id}`;
    } else {
      throw new Error("Tipe tidak valid untuk pengecekan status. Gunakan 'image', 'video', atau 'voice'.");
    }
    const payload = {
      key: this.keys.txt2vid || this.keys.txt2img,
      ...rest
    };
    return await this._request(endpoint, payload);
  }
  async super_resolution({
    imageUrl,
    ...rest
  }) {
    await this._ensure_auth();
    const endpoint = "/image_editing/super_resolution";
    const base_payload = {
      model_id: "realesr-general-x4v3",
      scale: 3,
      face_enhance: false,
      webhook: null,
      track_id: null
    };
    const payload = {
      key: this.keys.txt2img || this.keys.txt2vid,
      ...base_payload,
      ...rest,
      init_image: await this._process_image(imageUrl)
    };
    return await this._request(endpoint, payload);
  }
  async mask_creator({
    imageUrl,
    specific_object,
    ...rest
  }) {
    await this._ensure_auth();
    const endpoint = "/image_editing/mask_creator";
    const payload = {
      key: this.keys.txt2img || this.keys.txt2vid,
      webhook: null,
      track_id: null,
      ...rest,
      init_image: await this._process_image(imageUrl),
      specific_object: specific_object
    };
    return await this._request(endpoint, payload);
  }
  async face_gen({
    faceImageUrl,
    ...rest
  }) {
    await this._ensure_auth();
    const endpoint = "/image_editing/face_gen";
    const base_payload = {
      prompt: "pretty woman",
      negative_prompt: "anime, cartoon, drawing, big nose, long nose, fat, ugly, big lips, big mouth, face proportion mismatch, unrealistic, monochrome, lowres, bad anatomy, worst quality, low quality, blurry",
      width: "512",
      height: "512",
      samples: "1",
      num_inference_steps: "21",
      safety_checker: false,
      base64: false,
      seed: null,
      guidance_scale: 7.5,
      webhook: null,
      track_id: null
    };
    const payload = {
      key: this.keys.txt2img || this.keys.txt2vid,
      ...base_payload,
      ...rest,
      face_image: await this._process_image(faceImageUrl)
    };
    return await this._request(endpoint, payload);
  }
  async head_shot({
    faceImageUrl,
    ...rest
  }) {
    await this._ensure_auth();
    const endpoint = "/image_editing/head_shot";
    const base_payload = {
      prompt: "pretty woman",
      negative_prompt: "anime, cartoon, drawing, big nose, long nose, fat, ugly, big lips, big mouth, face proportion mismatch, unrealistic, monochrome, lowres, bad anatomy, worst quality, low quality, blurry",
      width: "512",
      height: "512",
      samples: "1",
      num_inference_steps: "21",
      safety_checker: false,
      base64: false,
      seed: null,
      guidance_scale: 7.5,
      webhook: null,
      track_id: null
    };
    const payload = {
      key: this.keys.txt2img || this.keys.txt2vid,
      ...base_payload,
      ...rest,
      face_image: await this._process_image(faceImageUrl)
    };
    return await this._request(endpoint, payload);
  }
  async tts({
    prompt,
    ...rest
  }) {
    await this._ensure_auth();
    const endpoint = "/voice/tts";
    const base_payload = {
      language: "american english",
      voice_id: "madison",
      speed: 1,
      emotion: false
    };
    const payload = {
      key: this.keys.txt2vid || this.keys.txt2img,
      ...base_payload,
      ...rest,
      prompt: prompt
    };
    return await this._request(endpoint, payload);
  }
  async music_gen({
    audioUrl,
    ...rest
  }) {
    await this._ensure_auth();
    const endpoint = "/voice/music_gen";
    const base_payload = {
      prompt: "marimba, percussion, bass, tropical house, melodic riff, G# minor, 96 bpm",
      sampling_rate: 32e3,
      base64: false,
      temp: false,
      webhook: null,
      track_id: null
    };
    const payload = {
      key: this.keys.txt2vid || this.keys.txt2img,
      ...base_payload,
      ...rest,
      init_audio: audioUrl
    };
    return await this._request(endpoint, payload);
  }
  async voice_cover({
    audioUrl,
    ...rest
  }) {
    await this._ensure_auth();
    const endpoint = "/voice/voice_cover";
    const base_payload = {
      model_id: "zoro",
      pitch: "none",
      rate: .5,
      radius: 3,
      mix: .25,
      algorithm: "rmvpe",
      hop_length: 128,
      originality: .5,
      lead_voice_volume_delta: "+1",
      backup_voice_volume_delta: "-2",
      instrument_volume_delta: "+2",
      reverb_size: .15,
      wetness: .2,
      dryness: .8,
      damping: .7,
      base64: false,
      temp: false,
      webhook: null,
      track_id: null
    };
    const payload = {
      key: this.keys.txt2vid || this.keys.txt2img,
      ...base_payload,
      ...rest,
      init_audio: audioUrl
    };
    return await this._request(endpoint, payload);
  }
  async song_generator(params) {
    await this._ensure_auth();
    const endpoint = "/voice/song_generator";
    const payload = {
      key: this.keys.txt2vid || this.keys.txt2img,
      webhook: null,
      track_id: null,
      ...params
    };
    return await this._request(endpoint, payload);
  }
  async chat({
    prompt,
    messages,
    ...rest
  }) {
    await this._ensure_auth();
    const endpoint = "/llm/uncensored_chat";
    let final_messages;
    if (messages && messages.length > 0) {
      final_messages = messages;
    } else if (prompt) {
      final_messages = [{
        role: "user",
        content: prompt
      }];
    } else {
      throw new Error("Diperlukan 'prompt' atau array 'messages' untuk chat.");
    }
    const base_payload = {
      max_tokens: 1e3
    };
    const payload = {
      key: this.keys.txt2vid || this.keys.txt2img,
      ...base_payload,
      ...rest,
      messages: final_messages
    };
    return await this._request(endpoint, payload);
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  if (!action) {
    return res.status(400).json({
      error: "Aksi diperlukan."
    });
  }
  const api = new ModelsLab();
  try {
    let response;
    switch (action) {
      case "img2vid":
        if (!params.prompt || !params.imageUrl) return res.status(400).json({
          error: "Prompt dan imageUrl diperlukan untuk img2vid."
        });
        response = await api.img2vid(params);
        return res.status(200).json(response);
      case "txt2vid":
        if (!params.prompt) return res.status(400).json({
          error: "Prompt diperlukan untuk txt2vid."
        });
        response = await api.txt2vid(params);
        return res.status(200).json(response);
      case "img2img":
        if (!params.prompt || !params.imageUrl) return res.status(400).json({
          error: "Prompt dan imageUrl diperlukan untuk img2img."
        });
        response = await api.img2img(params);
        return res.status(200).json(response);
      case "txt2img":
        if (!params.prompt) return res.status(400).json({
          error: "Prompt diperlukan untuk txt2img."
        });
        response = await api.txt2img(params);
        return res.status(200).json(response);
      case "status":
        if (!params.type || !params.task_id) return res.status(400).json({
          error: "Tipe (image/video) dan task_id diperlukan untuk status."
        });
        response = await api.status(params);
        return res.status(200).json(response);
      case "super_resolution":
        if (!params.imageUrl) return res.status(400).json({
          error: "imageUrl diperlukan untuk super_resolution."
        });
        response = await api.super_resolution(params);
        return res.status(200).json(response);
      case "mask_creator":
        if (!params.imageUrl || !params.specific_object) return res.status(400).json({
          error: "imageUrl dan specific_object diperlukan untuk mask_creator."
        });
        response = await api.mask_creator(params);
        return res.status(200).json(response);
      case "face_gen":
        if (!params.faceImageUrl) return res.status(400).json({
          error: "faceImageUrl diperlukan untuk face_gen."
        });
        response = await api.face_gen(params);
        return res.status(200).json(response);
      case "head_shot":
        if (!params.faceImageUrl) return res.status(400).json({
          error: "faceImageUrl diperlukan untuk head_shot."
        });
        response = await api.head_shot(params);
        return res.status(200).json(response);
      case "tts":
        if (!params.prompt) return res.status(400).json({
          error: "prompt diperlukan untuk tts."
        });
        response = await api.tts(params);
        return res.status(200).json(response);
      case "music_gen":
        response = await api.music_gen(params);
        return res.status(200).json(response);
      case "voice_cover":
        if (!params.audioUrl) return res.status(400).json({
          error: "audioUrl diperlukan untuk voice_cover."
        });
        response = await api.voice_cover(params);
        return res.status(200).json(response);
      case "song_generator":
        if (params.lyrics_generation === true && !params.prompt) {
          return res.status(400).json({
            error: "prompt diperlukan saat lyrics_generation bernilai true."
          });
        }
        if (params.lyrics_generation === false && (!params.audioUrl || !params.lyrics)) {
          return res.status(400).json({
            error: "audioUrl dan lyrics diperlukan saat lyrics_generation bernilai false."
          });
        }
        response = await api.song_generator(params);
        return res.status(200).json(response);
      case "chat":
        if (!params.prompt) {
          return res.status(400).json({
            error: "Diperlukan 'prompt' untuk chat."
          });
        }
        response = await api.chat(params);
        return res.status(200).json(response);
      default:
        const supportedActions = ["img2vid", "txt2vid", "img2img", "txt2img", "status", "super_resolution", "mask_creator", "face_gen", "head_shot", "tts", "music_gen", "voice_cover", "song_generator", "chat"].join(", ");
        return res.status(400).json({
          error: `Aksi tidak valid: ${action}. Aksi yang didukung adalah: ${supportedActions}.`
        });
    }
  } catch (error) {
    console.error("Kesalahan API:", error);
    return res.status(500).json({
      error: error.message || "Terjadi Kesalahan Internal Server"
    });
  }
}