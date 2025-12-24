import fetch from "node-fetch";
export default async function handler(req, res) {
  const {
    source,
    height,
    width
  } = req.method === "GET" ? req.query : req.body;
  const sources = [{
    id: 1,
    name: "random-d.uk",
    url: "https://random-d.uk/api/random"
  }, {
    id: 2,
    name: "placebear",
    url: "https://placebear.com"
  }, {
    id: 3,
    name: "place.dog",
    url: "https://place.dog"
  }, {
    id: 4,
    name: "random.dog",
    url: "https://random.dog/woof.json"
  }, {
    id: 5,
    name: "dog.ceo",
    url: "https://dog.ceo/api/breeds/image/random"
  }, {
    id: 6,
    name: "randomfox",
    url: "https://randomfox.ca/floof/"
  }, {
    id: 7,
    name: "shibe",
    url: "https://shibe.online/api/shibes?count=10&urls=true&httpsUrls=true"
  }, {
    id: 8,
    name: "placekitten",
    url: "https://placekitten.com"
  }, {
    id: 9,
    name: "thecocktaildb",
    url: "https://www.thecocktaildb.com/api/json/v1/1/random.php"
  }, {
    id: 10,
    name: "catboys_img",
    url: "https://api.catboys.com/img"
  }, {
    id: 11,
    name: "catboys_8ball",
    url: "https://api.catboys.com/8ball"
  }, {
    id: 12,
    name: "catboys_dice",
    url: "https://api.catboys.com/dice"
  }, {
    id: 13,
    name: "catboys_catboy",
    url: "https://api.catboys.com/catboy"
  }];
  const sourceData = sources.find(src => src.id === parseInt(source));
  if (!source || !sourceData) {
    return res.status(400).json({
      error: "Source tidak valid.",
      availableSources: sources.map(({
        id,
        name
      }) => ({
        id: id,
        name: name
      })),
      message: "Gunakan ID source yang tersedia."
    });
  }
  try {
    let url = sourceData.url;
    if ([2, 3, 8].includes(sourceData.id)) {
      if (!height || !width) {
        return res.status(400).json({
          error: `Untuk '${sourceData.name}', parameter 'height' dan 'width' diperlukan.`
        });
      }
      url = `${url}/${width}/${height}`;
    }
    const response = await fetch(url);
    if (!response.ok) {
      return res.status(404).json({
        error: "Gagal mengambil data dari source."
      });
    }
    const contentType = response.headers.get("content-type");
    if (contentType.includes("image") || contentType.includes("octet-stream")) {
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      res.setHeader("Content-Type", "image/png");
      res.send(buffer);
      return;
    }
    const data = await response.json();
    if (contentType.includes("json") || contentType.includes("text")) {
      return res.status(200).json(data);
    }
    res.status(500).json({
      error: "Tipe konten tidak dikenali."
    });
  } catch (error) {
    return res.status(500).json({
      error: "Terjadi kesalahan saat mengambil data."
    });
  }
}