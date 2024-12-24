import dbConnect from '../../../lib/mongoose';
import { Chess } from 'chess.js';
import chessSession from '../../../models/Chess';

const DEFAULT_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

export default async function handler(req, res) {
  const { method } = req;
  const { action, id, from, to } = req.query;

  await dbConnect();

  if (method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  if (!action) {
    return res.status(400).json({ message: 'Action parameter is required' });
  }

  if (action === 'create') {
    try {
      const newGame = await chessSession.create({
        boardConfiguration: DEFAULT_FEN,
        turn: 'white',
        isFinished: false,
      });

      const flipParam = ""; 
      const encodedFen = encodeURIComponent(DEFAULT_FEN);
      const boardImageUrl = `https://www.chess.com/dynboard?fen=${encodedFen}&board=graffiti&piece=graffiti&size=3&coordinates=inside${flipParam}`;

      return res.status(201).json({ 
        message: 'Game created successfully', 
        gameId: newGame._id, 
        boardImageUrl,
        currentTurn: 'white' 
      });
    } catch (error) {
      return res.status(500).json({ message: 'Error creating game', error });
    }
  }

  if (action === 'move') {
    if (!id || !from || !to) {
      return res.status(400).json({ message: 'Missing parameters for move action (id, from, to are required)' });
    }

    try {
      const gameData = await chessSession.findOne({ _id: id });
      if (!gameData) {
        return res.status(404).json({ message: 'Game not found' });
      }

      const chess = new Chess(gameData.boardConfiguration || DEFAULT_FEN);
      const move = chess.move({ from, to });
      if (!move) {
        return res.status(400).json({ message: 'Invalid move' });
      }

      const isFinished = chess.isGameOver();
      const updatedGame = await chessSession.updateOne(
        { _id: id },
        {
          $set: {
            boardConfiguration: chess.fen(),
            turn: chess.turn() === 'w' ? 'white' : 'black',
            isFinished,
          },
        }
      );

      const flipParam = chess.turn() === 'w' ? "" : "&flip=true";
      const encodedFen = encodeURIComponent(chess.fen());
      const boardImageUrl = `https://www.chess.com/dynboard?fen=${encodedFen}&board=graffiti&piece=graffiti&size=3&coordinates=inside${flipParam}`;

      return res.status(200).json({ 
        gameId: id, 
        boardImageUrl, 
        currentTurn: chess.turn() === 'w' ? 'white' : 'black',
        inCheck: chess.inCheck(), 
        isAttacked: chess.isAttacked(from, gameData.turn === 'white' ? 'b' : 'w'),
        isCheckmate: chess.isCheckmate(), 
        isStalemate: chess.isStalemate(), 
        isDraw: chess.isDraw(),
        isInsufficientMaterial: chess.isInsufficientMaterial(),
        isGameOver: chess.isGameOver(),
        isThreefoldRepetition: chess.isThreefoldRepetition(),
      });
    } catch (error) {
      return res.status(500).json({ message: 'Error processing move', error });
    }
  }

  if (action === 'list') {
    try {
      const games = await chessSession.find();
      const gameIds = games.map(game => game._id);
      return res.status(200).json({ gameIds });
    } catch (error) {
      return res.status(500).json({ message: 'Error fetching game list', error });
    }
  }

  if (action === 'delete') {
    if (!id) {
      return res.status(400).json({ message: 'Game ID is required for deletion' });
    }

    try {
      const result = await chessSession.deleteOne({ _id: id });
      if (result.deletedCount === 0) {
        return res.status(404).json({ message: 'Game not found' });
      }

      return res.status(200).json({ message: 'Game deleted successfully' });
    } catch (error) {
      return res.status(500).json({ message: 'Error deleting game', error });
    }
  }

  return res.status(400).json({ message: 'Invalid action. Valid actions are "create", "move", "list", and "delete".' });
}
