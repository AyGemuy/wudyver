'use client';

import React, { Fragment } from 'react';
import { Card } from 'react-bootstrap';

const RoomChatPage = () => {
  return (
    <Fragment>
      <div className="container mt-5 d-flex justify-content-center align-items-center flex-column">
        <h2 className="text-center mb-4 text-primary font-weight-bold">Chat Room</h2>

        <Card className="shadow-lg w-75">
          <Card.Body>
            <Card.Title className="text-center text-success mb-3">Live Chat</Card.Title>

            {/* Embedding the chat box frame */}
            <div style={{ width: '100%', height: '500px', border: 'none' }}>
              <iframe
                src="https://my.cbox.ws/WudysoftBox"
                width="100%"
                height="100%"
                frameBorder="0"
                scrolling="auto"
                title="CBox Chat Room"
                style={{
                  borderRadius: '8px',  // Rounded corners for the frame
                  boxShadow: '0 0 10px rgba(0, 0, 0, 0.1)',  // Shadow for the iframe
                }}
              />
            </div>
          </Card.Body>
        </Card>
      </div>
    </Fragment>
  );
};

export default RoomChatPage;
