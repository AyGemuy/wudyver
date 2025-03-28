'use client';

import { useState } from 'react';
import { Button, Card, Container, Row, Col, Spinner, Form, Alert } from 'react-bootstrap';
import { PlayFill, ArrowRight } from 'react-bootstrap-icons';
import Image from 'next/image';

const ChessPage = () => {
  const [gameId, setGameId] = useState(null);
  const [boardImageUrl, setBoardImageUrl] = useState('');
  const [turn, setTurn] = useState('white');
  const [loading, setLoading] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [gameStatus, setGameStatus] = useState('');

  const startGame = async () => {
    setLoading(true);
    const res = await fetch('/api/game/chess?action=create');
    const data = await res.json();
    setGameId(data.gameId);
    setBoardImageUrl(data.boardImageUrl);
    setLoading(false);
    setIsGameOver(false);
    setGameStatus('');
  };

  const movePiece = async () => {
    if (!gameId || isGameOver || !from || !to) return;
    setLoading(true);
    const res = await fetch(`/api/game/chess?action=move&id=${gameId}&from=${from}&to=${to}`);
    const data = await res.json();

    if (data.boardImageUrl) {
      setBoardImageUrl(data.boardImageUrl);
    }

    setTurn(data.currentTurn);
    setGameStatus(getGameStatus(data));
    setIsGameOver(data.isGameOver);
    setLoading(false);
  };

  const getGameStatus = (data) => {
    if (data.isCheckmate) return 'Checkmate!';
    if (data.isStalemate) return 'Stalemate!';
    if (data.isCheck) return 'Check!';
    if (data.isDraw) return 'Draw!';
    return '';
  };

  return (
    <Container className="py-5">
      <Row className="justify-content-center">
        <Col md={8} lg={6}>
          <Card>
            <Card.Body>
              <Card.Title className="text-center mb-4">Chess Game</Card.Title>
              {!gameId ? (
                <Button variant="primary" onClick={startGame} disabled={loading} block>
                  {loading ? <Spinner animation="border" size="sm" /> : <><PlayFill /> Start Game</>}
                </Button>
              ) : (
                <>
                  <div className="text-center mb-4">
                    <Image
                      src={boardImageUrl}
                      alt="Chessboard"
                      width={500}
                      height={500}
                      style={{ maxWidth: '100%' }}
                    />
                  </div>
                  <div className="text-center mb-4">
                    <strong>Turn:</strong> {turn}
                  </div>
                  <div className="text-center mb-4">
                    {gameStatus && <Alert variant="info">{gameStatus}</Alert>}
                    {isGameOver ? (
                      <h4 className="text-danger">Game Over</h4>
                    ) : (
                      <>
                        <Form inline className="mb-3">
                          <Form.Control
                            type="text"
                            placeholder="From (e2)"
                            value={from}
                            onChange={(e) => setFrom(e.target.value)}
                            disabled={loading}
                            className="mr-2"
                          />
                          <Form.Control
                            type="text"
                            placeholder="To (e4)"
                            value={to}
                            onChange={(e) => setTo(e.target.value)}
                            disabled={loading}
                            className="mr-2"
                          />
                          <Button
                            variant="outline-primary"
                            onClick={movePiece}
                            disabled={loading || !from || !to}
                          >
                            <ArrowRight /> Move
                          </Button>
                        </Form>
                      </>
                    )}
                  </div>
                  <div className="text-center">
                    {isGameOver && (
                      <Button variant="primary" onClick={startGame} disabled={loading}>
                        <PlayFill /> Start a New Game
                      </Button>
                    )}
                  </div>
                </>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default ChessPage;
