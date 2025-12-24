import axios from "axios";
class Game {
  async game(provider, userId, zoneId) {
    try {
      let url, headers = {},
        method = "POST",
        data = {};
      switch (provider) {
        case "duniagames":
          url = "https://api.duniagames.co.id/api/transaction/v1/top-up/inquiry/store";
          headers = {
            origin: "https://duniagames.co.id",
            referer: "https://duniagames.co.id/",
            "x-device": "875b1600-b073-4dc3-bce1-b3513ce0b952"
          };
          data = {
            productId: 1,
            itemId: 66,
            product_ref: "REG",
            product_ref_denom: "REG",
            catalogId: 121,
            paymentId: 6361,
            gameId: "92666339",
            zoneId: zoneId,
            campaignUrl: ""
          };
          break;
        case "vocagame":
          url = `https://vocagame.com/api/v1/order/prepare/MOBILE_LEGENDS?userId=${userId}&zoneId=${zoneId}`;
          headers = {
            referer: "https://vocagame.com/mobile-legends-bang-bang"
          };
          method = "GET";
          break;
        case "garudavoucher":
          url = "https://garudavoucher.id/prosess/product_validation";
          headers = {
            "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
            origin: "https://garudavoucher.id",
            referer: "https://garudavoucher.id/order/game/mobile-legend"
          };
          data = `UserId=${userId}&ServerZone=${zoneId}&ProductId=3&PaymentCode=SP&GameId=1`;
          break;
        default:
          throw new Error("Unknown provider");
      }
      const config = {
        headers: headers
      };
      const response = method === "GET" ? await axios.get(url, config) : await axios.post(url, data, config);
      return response.data;
    } catch (error) {
      console.error("Error in game provider request:", error);
      throw error;
    }
  }
}
export default async function handler(req, res) {
  try {
    const {
      provider = "vocagame",
        userId,
        zoneId
    } = req.method === "GET" ? req.query : req.body;
    if (!(userId && zoneId)) {
      return res.status(400).json({
        error: "userId and zoneId are required"
      });
    }
    const generator = new Game();
    const response = await generator.game(provider, userId, zoneId);
    return res.status(200).json({
      result: response
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: error.message || "Internal server error"
    });
  }
}