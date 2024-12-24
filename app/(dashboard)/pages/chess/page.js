'use client';

import { useState } from 'react';
import { Button, Card, Container, Row, Col, Spinner } from 'react-bootstrap';
import { PlayFill } from 'react-bootstrap-icons';
import Image from 'next/image';

const ChessPage = () => {
  const [gameId, setGameId] = useState(null);
  const [boardImageUrl, setBoardImageUrl] = useState('');
  const [turn, setTurn] = useState('white');
  const [loading, setLoading] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);

  const startGame = async () => {
    setLoading(true);
    const res = await fetch('/api/game/chess?action=create');
    const data = await res.json();
    setGameId(data.gameId);
    setBoardImageUrl(data.boardImageUrl);
    setLoading(false);
  };

  const movePiece = async (from, to) => {
    if (!gameId || isGameOver) return;
    setLoading(true);
    const res = await fetch(`/api/game/chess?action=move&id=${gameId}&from=${from}&to=${to}`);
    const data = await res.json();

    if (data.boardImageUrl) {
      setBoardImageUrl(data.boardImageUrl);
    }

    setTurn(data.turn);
    setIsGameOver(data.isGameOver);
    setLoading(false);
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
                    {isGameOver ? (
                      <h4>Game Over</h4>
                    ) : (
                      <Button variant="outline-secondary" onClick={() => movePiece('e2', 'e4')} disabled={loading}>
                        Make a Move (e2 to e4)
                      </Button>
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
