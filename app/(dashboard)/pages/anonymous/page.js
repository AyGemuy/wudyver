'use client';

import { useState, useEffect } from 'react';
import io from 'socket.io-client';
import { Button, Form, Card, ListGroup, InputGroup, FormControl } from 'react-bootstrap';

let socket;

export default function AnonymousPage() {
  const [nickname, setNickname] = useState('');
  const [message, setMessage] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [partner, setPartner] = useState(null);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    socket = io();

    socket.on('partnerFound', ({ partner }) => {
      setPartner(partner);
      setIsSearching(false);
    });

    socket.on('noPartner', ({ message }) => {
      alert(message);
      setIsSearching(false);
    });

    socket.on('message', ({ message, from }) => {
      setChatMessages((prev) => [...prev, { from, message }]);
    });

    socket.on('chatSkipped', ({ message }) => {
      alert(message);
      setPartner(null);
      setChatMessages([]);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const startChat = () => {
    setIsSearching(true);
    socket.emit('startChat', { nickname: nickname || 'Anonymous' });

    // Timer untuk 60 detik agar bisa mencoba lagi
    setTimeout(() => setIsSearching(false), 60000);
  };

  const sendMessage = () => {
    if (!message.trim()) return;

    setChatMessages((prev) => [...prev, { from: 'You', message }]);
    socket.emit('sendMessage', { message });
    setMessage('');
  };

  const skipChat = () => {
    socket.emit('skipChat');
    setPartner(null);
    setChatMessages([]);
  };

  return (
    <div className="container my-5">
      <Card>
        <Card.Header className="text-center">
          <h3>Anonymous Chat</h3>
        </Card.Header>
        <Card.Body>
          {!partner ? (
            <div className="text-center">
              <Form>
                <Form.Group controlId="nickname">
                  <Form.Label>Masukkan Nama Samaran</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Nama samaran (opsional)"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                  />
                </Form.Group>
                <Button
                  variant="primary"
                  onClick={startChat}
                  disabled={isSearching}
                  block
                >
                  {isSearching ? 'Mencari Pasangan...' : 'Mulai Chat'}
                </Button>
              </Form>
            </div>
          ) : (
            <div>
              <h5>Chat dengan: {partner}</h5>
              <ListGroup variant="flush" className="my-3" style={{ height: '300px', overflowY: 'scroll' }}>
                {chatMessages.map((msg, index) => (
                  <ListGroup.Item key={index} className={msg.from === 'You' ? 'text-right' : ''}>
                    <strong>{msg.from}:</strong> {msg.message}
                  </ListGroup.Item>
                ))}
              </ListGroup>
              <InputGroup>
                <FormControl
                  type="text"
                  placeholder="Ketik pesan..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
                <Button variant="outline-secondary" onClick={sendMessage}>
                  Kirim
                </Button>
              </InputGroup>
              <Button variant="danger" className="mt-3" block onClick={skipChat}>
                Skip Chat
              </Button>
            </div>
          )}
        </Card.Body>
      </Card>
    </div>
  );
}
