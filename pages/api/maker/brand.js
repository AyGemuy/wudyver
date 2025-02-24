import axios from "axios";
const dynamicIds = ["04ca85c5-a4c1-4582-8296-7fb8cbdf7df1", "063a3d53-d7bb-4abb-8b20-3e45ae7c61ac", "065b4535-d123-4261-accb-2f21e3eac3cf", "09699c93-f687-4c58-b6dc-cb8010de7df9", "097b9969-5019-433a-9a3f-d2e097b50e99", "0c963355-e735-4cdd-bec8-1373ba2a222e", "0cd45dda-e1e6-46bc-9f0d-b49a5d3c3667", "10cd8160-2b8d-41c5-87cc-f683a853d5d9", "163db786-9e2a-494a-a996-de565ae52f83", "1e47fc81-0c56-45d5-aa5e-07006260dfbc", "1fd728fb-fdb3-4407-a7da-fe55bfcb5fb0", "236a12ee-2b79-4b58-b9e4-5536f5e93db7", "2648d66c-fec5-488f-9626-06991ca917e0", "362270db-6933-4ccc-8c11-25b2fe97f023", "4a0312ef-6f47-421d-9d10-354c27de8e0f", "50dd554f-ffed-4496-b770-870fef2aefe5", "5ed1f95d-736f-4fe3-9aec-d0a8875dee17", "6458e177-55ec-4b2d-8be7-4094431378ad", "672fc6e7-e445-47e3-9391-2e1d1452960a", "7229c0d6-cc4f-4e47-87b2-3b01285f502d", "73113e56-8ac2-484e-9272-06759b7d51e2", "7429f9b9-562f-439b-86cd-81f04d76d883", "746604d3-8da9-4488-8fa9-bf301d62ea0e", "867bea51-793c-4b09-b13f-44c9053b6754", "882f41c2-98ee-43f2-bf07-f033cf1c3320", "8a2d089b-7b87-4979-906e-7731b594bd4b", "8bb23d1a-7fb2-4f5d-ba6c-2a9bd13cc673", "8dcc7e92-c12c-40df-8c8b-9f9db93b11a0", "8f825f13-dadf-442c-b9e5-a1daa03611c4", "8ffdc28c-ea27-4b0c-89c3-3f9a9b40e5fd", "912b6462-49d3-435a-959e-5c5f3254d6c4", "924d12da-4a2b-46b3-82cd-bc9b38a519d0", "9459965a-f378-430a-8cb9-62778fec5713", "9608708e-7907-4bae-892c-87964aee0454", "963fcb8b-1ba3-46f1-82bd-8e92a5a024d1", "99c6feef-cee4-47b3-afc7-1f192e7f48f4", "a075034f-0363-4af4-877f-aba47a7c059d", "a428ed89-5ed1-4b1d-b095-2ee98ae54b40", "afa0be93-d4ae-46d5-b741-64bd3b4b6148", "b0fb81f5-59a4-4197-947f-26037441ea2f", "b1826077-0a6f-403d-939e-b445c334c470", "b3581ffd-a127-465b-b880-bd3770b85aad", "b5be66f6-a6a6-42dc-ab67-de8f80e96291", "b5e150af-101d-4e96-9518-dff66548dc31", "b8b4fc21-d1b6-4ee1-a6f3-4410a49e123a", "b95516e4-645d-4249-b81b-b9ca65bd2087", "b97103b8-3b7c-4f1d-8c91-451c11e8cde3", "bbf8e7fe-13c2-420c-bb2c-9c059744d599", "bd9069cc-408d-4f00-90b4-9d6c96bc0b3d", "be638691-3065-45cb-b90c-263945cd0177", "c054d202-df4b-466d-8477-2b8690030ce5", "c1e008df-5207-463e-a6a7-a823174d0bda", "cc9a22ce-f65c-40ff-9eac-43c26817f44a", "d588330f-b11c-4482-baff-49323323a8c0", "e32a0e7e-df48-4b33-bccf-1f74d395d322", "ee1930f1-09a8-4d5e-bbe9-e43547bb7f64", "fde5293a-c69b-4d77-9ec8-f3d6797d2b15"];
export default async function handler(req, res) {
  if (req.method === "GET") {
    let {
      id,
      text
    } = req.method === "GET" ? req.query : req.body;
    id = id ? parseInt(id) : 0;
    if (isNaN(id) || id < 0 || id >= dynamicIds.length) {
      return res.status(400).json({
        error: "Invalid or missing logo id."
      });
    }
    if (!text) {
      return res.status(400).json({
        error: "Text parameter is required."
      });
    }
    const logoId = dynamicIds[id];
    const encodedText = encodeURIComponent(text);
    try {
      const imageUrl = `https://dynamic.brandcrowd.com/asset/logo/${logoId}/logo?v=4&text=${encodedText}`;
      const response = await axios.get(imageUrl, {
        responseType: "arraybuffer"
      });
      res.setHeader("Content-Type", "image/png");
      return res.status(200).send(response.data);
    } catch (error) {
      res.status(500).json({
        error: "Failed to fetch the logo image.",
        details: error.message
      });
    }
  } else {
    res.status(405).json({
      error: "Method Not Allowed"
    });
  }
}