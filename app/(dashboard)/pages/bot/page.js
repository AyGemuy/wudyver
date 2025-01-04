'use client';

import { useEffect, useState } from 'react';
import { Button, Container, Row, Col, Card, ListGroup } from 'react-bootstrap';
import { io } from 'socket.io-client';

let socket;

const BotPage = () => {
  const [logs, setLogs] = useState([]);
  const [isBotRunning, setIsBotRunning] = useState(false);

  useEffect(() => {
    socket = io();

    socket.on('log', (log) => {
      setLogs((prevLogs) => [...prevLogs, log]);
    });

    return () => socket.disconnect();
  }, []);

  const startBot = async () => {
    setIsBotRunning(true);
    await fetch('/api/user/bot');
  };

  const stopBot = () => {
    setIsBotRunning(false);
    socket.disconnect();
    setLogs((prevLogs) => [...prevLogs, 'Bot stopped.']);
  };

  const restartBot = async () => {
    stopBot();
    setTimeout(() => startBot(), 1000);
  };

  return (
    <Container className="py-5">
      <Row className="mb-4">
        <Col>
          <Card className="text-center shadow">
            <Card.Body>
              <Card.Title>WhatsApp Bot</Card.Title>
              <Card.Text>
                Control the bot and view real-time logs below.
              </Card.Text>
              <Button
                variant="success"
                onClick={startBot}
                disabled={isBotRunning}
                className="me-2"
              >
                Start
              </Button>
              <Button
                variant="warning"
                onClick={restartBot}
                disabled={!isBotRunning}
                className="me-2"
              >
                Restart
              </Button>
              <Button
                variant="danger"
                onClick={stopBot}
                disabled={!isBotRunning}
              >
                Stop
              </Button>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      <Row>
        <Col>
          <Card className="shadow">
            <Card.Header className="bg-dark text-white">
              <strong>Logs</strong>
            </Card.Header>
            <ListGroup
              style={{
                height: '400px',
                overflowY: 'scroll',
                fontFamily: 'monospace',
                background: '#000',
                color: '#0f0',
              }}
            >
              {logs.map((log, idx) => (
                <ListGroup.Item
                  key={idx}
                  style={{
                    background: '#000',
                    border: 'none',
                    color: '#0f0',
                  }}
                >
                  {log}
                </ListGroup.Item>
              ))}
            </ListGroup>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default BotPage;
