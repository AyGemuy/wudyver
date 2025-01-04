'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button, Card, Container, Row, Col, Spinner } from 'react-bootstrap';
import { QuestionCircle, CheckCircle, XCircle, ArrowCounterclockwise } from 'react-bootstrap-icons';
import Image from 'next/image';

const AkinatorPage = () => {
  const [sessionId, setSessionId] = useState(null);
  const [question, setQuestion] = useState('');
  const [progress, setProgress] = useState(0);
  const [isWin, setIsWin] = useState(false);
  const [suggestion, setSuggestion] = useState(null);
  const [loading, setLoading] = useState(false);

  const startSession = async () => {
    setLoading(true);
    const res = await fetch('/api/game/akinator/v1?action=start');
    const data = await res.json();
    setSessionId(data.sessionId);
    setQuestion(data.question);
    setProgress(0);
    setIsWin(false);
    setSuggestion(null);
    setLoading(false);
  };

  const answerQuestion = useCallback(
    async (answer) => {
      setLoading(true);
      const res = await fetch(`/api/game/akinator/v1?action=answer&id=${sessionId}&answer=${answer}`);
      const data = await res.json();
      setQuestion(data.question);
      setProgress(data.progress);
      setIsWin(data.isWin);
      if (data.isWin) {
        setSuggestion(data.suggestion);
      }
      setLoading(false);
    },
    [sessionId]
  );

  const cancelAnswer = async () => {
    setLoading(true);
    const res = await fetch(`/api/game/akinator/v1?action=cancel&id=${sessionId}`);
    const data = await res.json();
    setQuestion(data.question);
    setProgress(data.progress);
    setLoading(false);
  };

  const restartGame = async () => {
    setSessionId(null);
    setQuestion('');
    setProgress(0);
    setIsWin(false);
    setSuggestion(null);
    startSession();  // Start a new session
  };

  return (
    <Container className="py-5">
      <Row className="justify-content-center">
        <Col md={8} lg={6}>
          <Card>
            <Card.Body>
              <Card.Title className="text-center mb-4">Akinator Game</Card.Title>
              {!sessionId ? (
                <Button variant="primary" onClick={startSession} disabled={loading} block>
                  {loading ? <Spinner animation="border" size="sm" /> : 'Start Game'}
                </Button>
              ) : (
                <>
                  <Card.Text className="text-center mb-4">{question}</Card.Text>
                  <div className="text-center mb-4">
                    <strong>Progress:</strong> {progress}%
                  </div>
                  {isWin ? (
                    <div className="text-center">
                      <CheckCircle size={50} color="green" />
                      <h4>We guessed it!</h4>
                      <p>
                        <strong>Name:</strong> {suggestion?.name}
                      </p>
                      <p>
                        <strong>Description:</strong> {suggestion?.description}
                      </p>
                      <Image
                        src={suggestion?.photo}
                        alt={suggestion?.name}
                        width={200}
                        height={200}
                        className="img-fluid"
                      />
                      <Button variant="primary" onClick={restartGame} className="mt-4">
                        Restart Game
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center">
                      {loading ? (
                        <Spinner animation="border" size="sm" />
                      ) : (
                        <>
                          <Button variant="success" onClick={() => answerQuestion(0)} disabled={loading} className="m-2">
                            Yes <QuestionCircle />
                          </Button>
                          <Button variant="danger" onClick={() => answerQuestion(1)} disabled={loading} className="m-2">
                            No <XCircle />
                          </Button>
                          <Button variant="warning" onClick={() => answerQuestion(2)} disabled={loading} className="m-2">
                            Don&apos;t Know
                          </Button>
                          <Button variant="info" onClick={() => answerQuestion(3)} disabled={loading} className="m-2">
                            Probably
                          </Button>
                          <Button variant="secondary" onClick={() => answerQuestion(4)} disabled={loading} className="m-2">
                            Probably Not
                          </Button>
                          <Button variant="outline-secondary" onClick={cancelAnswer} disabled={loading} className="mt-3">
                            <ArrowCounterclockwise /> Cancel Last Answer
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default AkinatorPage;
