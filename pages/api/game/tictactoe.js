import crypto from "crypto";
import connectMongo from "@/lib/mongoose";
import TicTacToe from "@/models/TicTacToe";
export default async function handler(req, res) {
  const {
    action,
    gameId,
    box
  } = req.query;
  try {
    await connectMongo();
    switch (action) {
      case "create": {
        const id = gameId || generateGameId();
        const existingGame = await TicTacToe.findOne({
          gameId: id
        });
        if (existingGame) return res.status(400).json({
          message: "Game ID already exists"
        });
        const newGame = await TicTacToe.create({
          gameId: id,
          board: Array(3).fill().map(() => Array(3).fill(null)),
          currentPlayer: "X",
          winner: null
        });
        return res.status(201).json({
          message: "Game created successfully",
          game: newGame
        });
      }
      case "get": {
        if (!gameId) return res.status(400).json({
          message: "Game ID is required"
        });
        const game = await TicTacToe.findOne({
          gameId: gameId
        });
        if (!game) return res.status(404).json({
          message: "Game not found"
        });
        return res.status(200).json({
          game: game
        });
      }
      case "move": {
        if (!gameId || !box) return res.status(400).json({
          message: "Missing required fields"
        });
        const boxNumber = parseInt(box);
        if (isNaN(boxNumber) || boxNumber < 1 || boxNumber > 9) {
          return res.status(400).json({
            message: "Invalid box number"
          });
        }
        const row = Math.floor((boxNumber - 1) / 3);
        const col = (boxNumber - 1) % 3;
        const game = await TicTacToe.findOne({
          gameId: gameId
        });
        if (!game) return res.status(404).json({
          message: "Game not found"
        });
        if (game.winner) return res.status(400).json({
          message: "Game already finished"
        });
        if (game.board[row][col]) return res.status(400).json({
          message: "Cell already occupied"
        });
        game.board[row][col] = game.currentPlayer;
        game.currentPlayer = game.currentPlayer === "X" ? "O" : "X";
        const winner = checkWinner(game.board);
        if (winner) {
          game.winner = winner === "draw" ? "draw" : game.board[row][col];
        }
        await game.save();
        return res.status(200).json({
          message: "Move made successfully",
          game: game
        });
      }
      case "reset": {
        if (!gameId) return res.status(400).json({
          message: "Game ID is required"
        });
        const game = await TicTacToe.findOne({
          gameId: gameId
        });
        if (!game) return res.status(404).json({
          message: "Game not found"
        });
        game.board = Array(3).fill().map(() => Array(3).fill(null));
        game.currentPlayer = "X";
        game.winner = null;
        await game.save();
        return res.status(200).json({
          message: "Game reset successfully",
          game: game
        });
      }
      default:
        return res.status(400).json({
          message: "Invalid action"
        });
    }
  } catch (error) {
    return res.status(500).json({
      message: "Error processing request",
      error: error.message
    });
  }
}

function generateGameId() {
  return crypto.randomBytes(4).toString("hex");
}

function checkWinner(board) {
  for (let i = 0; i < 3; i++) {
    if (board[i][0] && board[i][0] === board[i][1] && board[i][1] === board[i][2]) return board[i][0];
    if (board[0][i] && board[0][i] === board[1][i] && board[1][i] === board[2][i]) return board[0][i];
  }
  if (board[0][0] && board[0][0] === board[1][1] && board[1][1] === board[2][2]) return board[0][0];
  if (board[0][2] && board[0][2] === board[1][1] && board[1][1] === board[2][0]) return board[0][2];
  if (board.flat().every(cell => cell)) return "draw";
  return null;
}