'use client';

import React from 'react';
import { Card, Container } from 'react-bootstrap';

const RoomChatPage = () => {
  return (
    <Container fluid className="p-0" style={{ paddingLeft: '2rem', paddingRight: '2rem' }}>
      <h2 className="text-center mb-4 text-primary fw-bold">Chat Room</h2>

      <Card className="shadow-lg w-100" style={{ height: '100vh', maxWidth: '1200px', margin: '0 auto' }}>
        <Card.Body className="p-0 d-flex flex-column">
          <Card.Title className="text-center text-success mb-3">Live Chat</Card.Title>

          {/* Embedding the chat box frame */}
          <div className="flex-grow-1" style={{ position: 'relative', overflow: 'hidden' }}>
            <iframe
              src="https://www3.cbox.ws/box/?boxid=3542378&boxtag=hnGq0X"
              width="100%"
              height="100%"
              frameBorder="0"
              scrolling="auto"
              title="CBox Chat Room"
              aria-label="Live Chat Room"
              style={{
                borderRadius: '8px',
                boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)',
                border: '1px solid #ddd',
              }}
            />
          </div>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default RoomChatPage;
