'use client';

import React, { useState, useEffect } from "react";
import { Button, Card, Container, Row, Col, Modal, Spinner } from "react-bootstrap";
import { HandThumbsUp } from 'react-bootstrap-icons';
import Image from 'next/image';

const DeckPage = () => {
  const [deckID, setDeckID] = useState(null);
  const [playerCards, setPlayerCards] = useState([]);
  const [dealerCards, setDealerCards] = useState([]);
  const [playerSum, setPlayerSum] = useState(0);
  const [dealerSum, setDealerSum] = useState(0);
  const [loading, setLoading] = useState(false);
  const [gameRunning, setGameRunning] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');

  const getValue = (value) => {
    if (value === "ACE") return 11;
    if (value === "JACK" || value === "QUEEN" || value === "KING") return 10;
    return parseInt(value);
  };

  const startNewGame = async () => {
    setLoading(true);
    const response = await fetch('/api/game/deck?action=newGame');
    const data = await response.json();
    setDeckID(data.deckId);
    setGameRunning(true);
    setDealerCards([]);
    setPlayerCards([]);
    setDealerSum(0);
    setPlayerSum(0);
    setLoading(false);
  };

  const drawCard = async () => {
    if (gameRunning) {
      setLoading(true);
      const response = await fetch(`/api/game/deck?action=drawCard&deckId=${deckID}`);
      const data = await response.json();
      const cardValue = getValue(data.value);

      if (data.card) {
        setPlayerCards((prevCards) => [
          ...prevCards,
          <Card key={data.card.code}>
            <Image src={data.card.image} alt={data.card.value} width={100} height={150} />
          </Card>,
        ]);
        setPlayerSum((prevSum) => prevSum + cardValue);
      }
      setLoading(false);
    }
  };

  const stand = () => {
    setGameRunning(false);
    setModalMessage("Game Over. Thanks for playing!");
    setShowModal(true);
  };

  useEffect(() => {
    if (playerSum > 21) {
      setModalMessage("You've gone bust!");
      setShowModal(true);
      setGameRunning(false);
    }
  }, [playerSum]);

  return (
    <Container>
      <Row className="my-4">
        <Col>
          <h3>Dealer</h3>
          <div id="card--container" className="dealer">
            {dealerCards.length === 0 ? (
              <div className="text-center">Waiting for dealer...</div>
            ) : (
              dealerCards
            )}
          </div>
        </Col>
        <Col>
          <h3>You</h3>
          <div id="card--container" className="player">
            {playerCards.length === 0 ? (
              <div className="text-center">No cards yet</div>
            ) : (
              playerCards
            )}
          </div>
          <div className="text-center mt-3">
            <strong>Your Sum: {playerSum}</strong>
          </div>
        </Col>
      </Row>
      <Row className="my-4">
        <Col>
          <Button variant="primary" onClick={startNewGame} disabled={loading}>
            {loading ? <Spinner animation="border" size="sm" /> : 'New Game'}
          </Button>
        </Col>
        <Col>
          <Button variant="success" onClick={drawCard} disabled={loading || !gameRunning}>
            {loading ? <Spinner animation="border" size="sm" /> : 'Hit'} <HandThumbsUp />
          </Button>
        </Col>
        <Col>
          <Button variant="danger" onClick={stand} disabled={!gameRunning}>
            Stand <HandThumbsUp />
          </Button>
        </Col>
      </Row>

      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Game Result</Modal.Title>
        </Modal.Header>
        <Modal.Body>{modalMessage}</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Close <HandThumbsUp />
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}

export default DeckPage;
