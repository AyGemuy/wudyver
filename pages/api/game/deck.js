import axios from "axios";
import connectMongo from "@/lib/mongoose";
import Deck from "@/models/Deck";
const getValue = (value, currentHandValue = 0) => {
  if (value === "ACE") {
    if (currentHandValue + 11 <= 21) {
      return 11;
    } else {
      return 1;
    }
  }
  if (value === "JACK" || value === "QUEEN" || value === "KING") {
    return 10;
  }
  return parseInt(value);
};
const calculateHandValue = hand => {
  let value = 0;
  let aceCount = 0;
  for (const card of hand) {
    if (card.value === "ACE") {
      aceCount++;
      value += 11;
    } else {
      value += getValue(card.value);
    }
  }
  while (value > 21 && aceCount > 0) {
    value -= 10;
    aceCount--;
  }
  return value;
};
const determineWinner = (playerScore, dealerScore) => {
  if (playerScore > 21) {
    return "Player busts! Dealer wins.";
  }
  if (dealerScore > 21) {
    return "Dealer busts! Player wins.";
  }
  if (playerScore === dealerScore) {
    return "It's a push! (Tie)";
  }
  if (playerScore > dealerScore) {
    return "Player wins!";
  } else {
    return "Dealer wins!";
  }
};
const drawCard = async deckApiId => {
  try {
    const response = await axios.get(`https://deckofcardsapi.com/api/deck/${deckApiId}/draw/?count=1`);
    const data = response.data;
    if (data.cards.length === 0) {
      return {
        error: "No more cards in the deck."
      };
    }
    return {
      card: data.cards[0]
    };
  } catch (error) {
    console.error("Error drawing card from external API:", error.message);
    return {
      error: "Failed to draw card from external API."
    };
  }
};
export default async function handler(req, res) {
  await connectMongo();
  const {
    action,
    gameId,
    customId
  } = req.method === "GET" ? req.query : req.body;
  let currentDeckDocument;
  if (gameId && action !== "create") {
    currentDeckDocument = await Deck.findById(gameId);
    if (!currentDeckDocument) {
      return res.status(404).json({
        error: "Game (Deck) not found."
      });
    }
  } else if (!gameId && action !== "create") {
    return res.status(400).json({
      error: "gameId is required for this action unless 'create' is specified."
    });
  }
  if (action === "create") {
    if (customId) {
      const existingGame = await Deck.findById(customId);
      if (existingGame) {
        return res.status(409).json({
          error: "Game with this custom ID already exists."
        });
      }
    }
    const deckResponse = await axios.get("https://deckofcardsapi.com/api/deck/new/shuffle/?deck_count=1");
    const newDeckApiId = deckResponse.data.deck_id;
    const playerCard1 = await drawCard(newDeckApiId);
    const playerCard2 = await drawCard(newDeckApiId);
    const dealerCard1 = await drawCard(newDeckApiId);
    const dealerCard2 = await drawCard(newDeckApiId);
    if (playerCard1.error || playerCard2.error || dealerCard1.error || dealerCard2.error) {
      return res.status(500).json({
        error: "Failed to draw initial cards.",
        details: playerCard1.error || playerCard2.error || dealerCard1.error || dealerCard2.error
      });
    }
    const newDeckDocument = new Deck({
      _id: customId || undefined,
      deckApiId: newDeckApiId,
      playerHand: [playerCard1.card, playerCard2.card],
      dealerHand: [dealerCard1.card, dealerCard2.card]
    });
    newDeckDocument.playerScore = calculateHandValue(newDeckDocument.playerHand);
    newDeckDocument.dealerScore = calculateHandValue(newDeckDocument.dealerHand);
    await newDeckDocument.save();
    return res.status(201).json({
      gameId: newDeckDocument._id,
      deckApiId: newDeckDocument.deckApiId,
      playerHand: newDeckDocument.playerHand,
      playerScore: newDeckDocument.playerScore,
      dealerVisibleCard: newDeckDocument.dealerHand[0],
      dealerVisibleCardValue: getValue(newDeckDocument.dealerHand[0].value),
      status: newDeckDocument.status,
      message: newDeckDocument.message,
      createdAt: newDeckDocument.createdAt,
      updatedAt: newDeckDocument.updatedAt
    });
  }
  if (action === "delete") {
    if (!currentDeckDocument) {
      return res.status(400).json({
        error: "gameId is required to delete a game."
      });
    }
    await Deck.deleteOne({
      _id: gameId
    });
    return res.status(200).json({
      message: `Game with ID ${gameId} deleted successfully.`
    });
  }
  if (action === "clear") {
    if (!currentDeckDocument) {
      return res.status(400).json({
        error: "gameId is required to clear a game."
      });
    }
    currentDeckDocument.playerHand = [];
    currentDeckDocument.dealerHand = [];
    currentDeckDocument.playerScore = 0;
    currentDeckDocument.dealerScore = 0;
    currentDeckDocument.status = "cleared";
    currentDeckDocument.message = "Game cleared. Ready for a new hand.";
    currentDeckDocument.winner = null;
    await currentDeckDocument.save();
    return res.status(200).json({
      gameId: currentDeckDocument._id,
      message: currentDeckDocument.message,
      status: currentDeckDocument.status,
      createdAt: currentDeckDocument.createdAt,
      updatedAt: currentDeckDocument.updatedAt
    });
  }
  if (action === "hit") {
    if (!currentDeckDocument) {
      return res.status(400).json({
        error: "No active game (Deck) found. Use 'create' to start a new game."
      });
    }
    if (currentDeckDocument.status !== "active") {
      return res.status(400).json({
        error: "Game is already over. Create a new game to play again."
      });
    }
    const newCard = await drawCard(currentDeckDocument.deckApiId);
    if (newCard.error) {
      return res.status(500).json({
        error: newCard.error
      });
    }
    currentDeckDocument.playerHand.push(newCard.card);
    currentDeckDocument.playerScore = calculateHandValue(currentDeckDocument.playerHand);
    currentDeckDocument.message = "Player hits. Current hand:";
    if (currentDeckDocument.playerScore > 21) {
      currentDeckDocument.status = "player_bust";
      currentDeckDocument.message = "Player busts!";
      currentDeckDocument.winner = determineWinner(currentDeckDocument.playerScore, currentDeckDocument.dealerScore);
    }
    await currentDeckDocument.save();
    return res.status(200).json({
      gameId: currentDeckDocument._id,
      playerHand: currentDeckDocument.playerHand,
      playerScore: currentDeckDocument.playerScore,
      dealerVisibleCard: currentDeckDocument.dealerHand[0],
      dealerVisibleCardValue: getValue(currentDeckDocument.dealerHand[0].value),
      status: currentDeckDocument.status,
      message: currentDeckDocument.message,
      winner: currentDeckDocument.winner,
      createdAt: currentDeckDocument.createdAt,
      updatedAt: currentDeckDocument.updatedAt
    });
  }
  if (action === "stand") {
    if (!currentDeckDocument) {
      return res.status(400).json({
        error: "No active game (Deck) found. Use 'create' to start a new game."
      });
    }
    if (currentDeckDocument.status !== "active") {
      return res.status(400).json({
        error: "Game is already over. Create a new game to play again."
      });
    }
    let dealerTurnMessage = "Dealer's turn...";
    let dealerHandValue = calculateHandValue(currentDeckDocument.dealerHand);
    while (dealerHandValue < 17) {
      const newCard = await drawCard(currentDeckDocument.deckApiId);
      if (newCard.error) {
        return res.status(500).json({
          error: newCard.error
        });
      }
      currentDeckDocument.dealerHand.push(newCard.card);
      dealerHandValue = calculateHandValue(currentDeckDocument.dealerHand);
      dealerTurnMessage += ` Dealer draws ${newCard.card.value} of ${newCard.card.suit}.`;
    }
    currentDeckDocument.dealerScore = dealerHandValue;
    currentDeckDocument.message = dealerTurnMessage;
    currentDeckDocument.winner = determineWinner(currentDeckDocument.playerScore, currentDeckDocument.dealerScore);
    if (currentDeckDocument.dealerScore > 21) {
      currentDeckDocument.status = "dealer_bust";
    } else if (currentDeckDocument.playerScore > currentDeckDocument.dealerScore) {
      currentDeckDocument.status = "player_win";
    } else if (currentDeckDocument.dealerScore > currentDeckDocument.playerScore) {
      currentDeckDocument.status = "dealer_win";
    } else {
      currentDeckDocument.status = "push";
    }
    await currentDeckDocument.save();
    return res.status(200).json({
      gameId: currentDeckDocument._id,
      playerHand: currentDeckDocument.playerHand,
      playerScore: currentDeckDocument.playerScore,
      dealerHand: currentDeckDocument.dealerHand,
      dealerScore: currentDeckDocument.dealerScore,
      status: currentDeckDocument.status,
      message: currentDeckDocument.message,
      winner: currentDeckDocument.winner,
      createdAt: currentDeckDocument.createdAt,
      updatedAt: currentDeckDocument.updatedAt
    });
  }
  if (action === "info") {
    if (!currentDeckDocument) {
      return res.status(400).json({
        error: "gameId is required to get game info."
      });
    }
    return res.status(200).json({
      gameId: currentDeckDocument._id,
      deckApiId: currentDeckDocument.deckApiId,
      playerHand: currentDeckDocument.playerHand,
      playerScore: currentDeckDocument.playerScore,
      dealerHand: currentDeckDocument.status !== "active" ? currentDeckDocument.dealerHand : [currentDeckDocument.dealerHand[0]],
      dealerScore: currentDeckDocument.status !== "active" ? currentDeckDocument.dealerScore : null,
      dealerVisibleCard: currentDeckDocument.dealerHand[0],
      dealerVisibleCardValue: getValue(currentDeckDocument.dealerHand[0].value),
      status: currentDeckDocument.status,
      message: currentDeckDocument.message,
      winner: currentDeckDocument.winner,
      createdAt: currentDeckDocument.createdAt,
      updatedAt: currentDeckDocument.updatedAt
    });
  }
  return res.status(400).json({
    error: "Invalid action. Available actions: create, delete, clear, hit, stand, info."
  });
}