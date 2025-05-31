import ws from "ws";
const voices = ["Airi", "Akane", "Akari", "Ako", "Aris", "Arona", "Aru", "Asuna", "Atsuko", "Ayane", "Azusa", "Cherino", "Chihiro", "Chinatsu", "Chise", "Eimi", "Erica", "Fubuki", "Fuuka", "Hanae", "Hanako", "Hare", "Haruka", "Haruna", "Hasumi", "Hibiki", "Hihumi", "Himari", "Hina", "Hinata", "Hiyori", "Hoshino", "Iori", "Iroha", "Izumi", "Izuna", "Juri", "Kaede", "Karin", "Kayoko", "Kazusa", "Kirino", "Koharu", "Kokona", "Kotama", "Kotori", "Main", "Maki", "Mari", "Marina", "Mashiro", "Michiru", "Midori", "Miku", "Mimori", "Misaki", "Miyako", "Miyu", "Moe", "Momoi", "Momoka", "Mutsuki", "NP0013", "Natsu", "Neru", "Noa", "Nodoka", "Nonomi", "Pina", "Rin", "Saki", "Saori", "Saya", "Sena", "Serika", "Serina", "Shigure", "Shimiko", "Shiroko", "Shizuko", "Shun", "ShunBaby", "Sora", "Sumire", "Suzumi", "Tomoe", "Tsubaki", "Tsurugi", "Ui", "Utaha", "Wakamo", "Yoshimi", "Yuuka", "Yuzu", "Zunko"];
class HuggingFace {
  base_url;
  url_ident;
  constructor() {
    this.base_url = ["https://ori-muchim-bluearchivetts.hf.space/", "wss://zomehwh-vits-models.hf.space/queue/join", "wss://zomehwh-vits-models-pcr.hf.space/queue/join", "wss://zomehwh-vits-models-genshin-bh3.hf.space/queue/join"];
    this.url_ident = {
      bAV: 0,
      vMV: 1
    };
  }
  async blueArchiveVoice(data) {
    return new Promise(async (resolve, reject) => {
      try {
        let {
          text,
          model = "Airi",
          speed = 1.2
        } = data;
        if (!text || text.length >= 500) throw new Error(`Make sure to enter valid text, that's not exceed 500 words!`);
        if (speed && (speed < .1 || speed > 2)) speed = 2;
        model = "JP_" + model;
        const url = this.base_url[this.url_ident.bAV];
        const session_hash = this.generateSession();
        const socket = new ws(url.replace("https", "wss") + "queue/join");
        socket.on("message", data => {
          const d = JSON.parse(data.toString("utf8"));
          switch (d.msg) {
            case "send_hash": {
              socket.send(JSON.stringify({
                fn_index: 0,
                session_hash: session_hash
              }));
              break;
            }
            case "send_data": {
              socket.send(JSON.stringify({
                fn_index: 0,
                session_hash: session_hash,
                data: [text, model, speed]
              }));
              break;
            }
            case "estimation":
            case "process_starts": {
              break;
            }
            case "process_completed": {
              if (!d.success) throw new Error(`Error failed generating : ${JSON.stringify(d, null, 2)}`);
              const o = d.output;
              const name = o.data[1]?.name;
              socket.close();
              return resolve({
                text: text,
                model: model,
                speed: speed,
                result: {
                  duration: +o.duration.toFixed(2),
                  path: name,
                  url: url + "file=" + name
                }
              });
            }
            default: {
              console.log(`Unexpected message type : ${data.toString("utf8")}`);
              break;
            }
          }
        });
      } catch (e) {
        return reject(`Error in voice ${data} ${e}`);
      }
    });
  }
  pVitsModelVoiceLang = ["japanese", "chinese", "mix"];
  pVitsModelVoiceModelIdent = {
    normal: {
      kafka: 0,
      herta: 5,
      saibamomoi: 20,
      natsumeiroha: 25,
      misonomika: 30,
      kasumizawamiyu: 35,
      shiraazusa: 40,
      tendoualice: 45,
      sunaookamishiroko: 50,
      sorasakihina: 55,
      shiromiiori: 60,
      kudaizuna: 65,
      hayaseyuuka: 70,
      nishikigichisato: 130,
      takinainoue: 135
    },
    princessconnect: {
      yuni: 0,
      misora: 5,
      kyoka: 10,
      hiyori: 15,
      ameth: 20,
      hatsune: 25,
      eriko: 30,
      pecorine: 35,
      kokoro: 40,
      kyaru: 45
    },
    genshin: {
      ayaka: 0,
      nahida: 5,
      abyssinvoker: 10,
      keqing: 15,
      eula: 20
    },
    honkai3rd: {
      herrscher: 50,
      theresa: 55
    }
  };
  pVitsModelVoiceGame = {
    princessconnect: 2,
    genshin: 3,
    honkai3rd: 3
  };
  async vitsModelVoice(data) {
    return new Promise(async (resolve, reject) => {
      try {
        let {
          text,
          lang = "japanese",
          model = "kafka",
          game = null
        } = data;
        if (!text || text.length >= 100) throw new Error("Enter valid text! with length more than 0 and less than 100!");
        lang = lang.toLowerCase().replace(/w^/gi, "");
        model = model.toLowerCase().replace(/w^/gi, "");
        game = game ? game.toLowerCase() : null;
        if (!this.pVitsModelVoiceLang.includes(lang)) throw new Error(`Enter valid lang choice! : \n${this.pVitsModelVoiceLang.join("\n")}`);
        lang = lang !== "mix" ? lang[0].toUpperCase() + lang.slice(1) : "Mix（wrap the Chinese text with [ZH][ZH], wrap the Japanese text with [JA][JA]）";
        if (game ? !Object.keys(this.pVitsModelVoiceModelIdent[game]).includes(model) : !Object.keys(this.pVitsModelVoiceModelIdent.normal).includes(model)) throw new Error(`Enter valid model choice based on game (i.e Kafka | Shiromi Iori) your choices are ${model} are available in ${Object.keys(this.pVitsModelVoiceModelIdent)[Object.keys(this.pVitsModelVoiceModelIdent).map(v => Object.keys(this.pVitsModelVoiceModelIdent[v]).find(v => v === model)).findIndex(v => v)]} game choice : \n${Object.keys(this.pVitsModelVoiceModelIdent).map(v => Object.keys(this.pVitsModelVoiceModelIdent[v])).flat().join("\n")}`);
        if (game && !Object.keys(this.pVitsModelVoiceGame).includes(game)) throw new Error(`Enter valid game choice (i.e genshin | honkai3rd) : \n${Object.keys(this.pVitsModelVoiceGame).join("\n")}`);
        const url = this.base_url[game ? this.pVitsModelVoiceGame[game] : this.url_ident.vMV];
        if (!url) throw new Error(`Enter valid game choice (i.e genshin | honkai3rd) : \n${Object.keys(this.pVitsModelVoiceGame).join("\n")}`);
        const s = new ws(url);
        const session_hash = this.generateSession();
        const fn_index = this.pVitsModelVoiceModelIdent[game ? game : "normal"][model];
        s.on("message", data => {
          const d = JSON.parse(data.toString("utf8"));
          switch (d.msg) {
            case "send_hash": {
              s.send(JSON.stringify({
                fn_index: fn_index,
                session_hash: session_hash
              }));
              break;
            }
            case "send_data": {
              s.send(JSON.stringify({
                fn_index: fn_index,
                session_hash: session_hash,
                data: [text, lang, .6, .668, 1, false]
              }));
              break;
            }
            case "estimation":
            case "process_starts": {
              break;
            }
            case "process_completed": {
              if (!d.success) throw new Error(`Error failed generating : ${JSON.stringify(d, null, 2)}`);
              const o = d.output;
              s.close();
              return resolve({
                text: text,
                lang: lang.includes("Mix") ? "Mix" : lang,
                model: model,
                game: game || null,
                result: {
                  data: Buffer.from(o.data[1].split(",")[1], "base64"),
                  duration: +o.duration.toFixed(2)
                }
              });
            }
            default: {
              console.log(`Unexpected message type : ${data.toString("utf8")}`);
              break;
            }
          }
        });
      } catch (e) {
        return reject(`Error in vitsModelVoice : ${e}`);
      }
    });
  }
  generateSession() {
    return Math.random().toString(36).substring(2);
  }
}
export default async function handler(req, res) {
  const {
    type = "blue",
      text,
      model = "Airi",
      speed = 1.2,
      lang = "japanese",
      game = null
  } = req.method === "GET" ? req.query : req.body;
  if (!text) return res.status(400).json({
    success: false,
    message: "Missing parameters"
  });
  try {
    const hfApi = new HuggingFace();
    const result = type === "blue" ? await hfApi.blueArchiveVoice({
      model: model,
      text: text,
      speed: speed
    }) : type === "vits" ? await hfApi.vitsModelVoice({
      text: text,
      lang: lang,
      model: model,
      game: game
    }) : null;
    if (!result) return res.status(400).json({
      success: false,
      message: "Invalid type specified. Use 'blue' or 'vits'."
    });
    return res.status(200).json({
      result: typeof result === "object" ? result : result
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
}