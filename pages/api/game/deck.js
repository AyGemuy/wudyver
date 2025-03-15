import fetch from "node-fetch";
const getValue = value => {
  if (value === "ACE") return 11;
  if (value === "JACK" || value === "QUEEN" || value === "KING") return 10;
  return parseInt(value);
};
let deckID = null;
const startNewGame = async () => {
  const response = await fetch("https://deckofcardsapi.com/api/deck/new/shuffle/?deck_count=1");
  const data = await response.json();
  deckID = data.deck_id;
  return deckID;
};
const drawCard = async () => {
  if (!deckID) return {
    error: "Deck ID is missing. Start a new game first."
  };
  const response = await fetch(`https://deckofcardsapi.com/api/deck/${deckID}/draw/?count=1`);
  const data = await response.json();
  const cardValue = getValue(data.cards[0].value);
  return {
    card: data.cards[0],
    value: cardValue
  };
};
export default async function handler(req, res) {
  if (req.method === "GET") {
    const {
      action
    } = req.method === "GET" ? req.query : req.body;
    if (action === "newGame") {
      const deckId = await startNewGame();
      return res.status(200).json({
        deckId: deckId
      });
    }
    if (action === "drawCard") {
      const cardData = await drawCard();
      if (cardData.error) {
        return res.status(400).json({
          error: cardData.error
        });
      }
      return res.status(200).json({
        card: cardData.card,
        value: cardData.value
      });
    }
    return res.status(400).json({
      error: "Invalid action."
    });
  }
  return res.status(405).json({
    error: "Method Not Allowed"
  });
}