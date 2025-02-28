'use client';

import React from 'react';
import { Card } from 'react-bootstrap';
import useMounted from 'hooks/useMounted';
import { PersonCircle } from 'react-bootstrap-icons';

const RoomChatPage = () => {
  const hasMounted = useMounted();

  return (
    <>
      {hasMounted && (
        <Card className="m-5 shadow-lg" style={{ maxWidth: '600px', margin: '0 auto' }}>
          <Card.Body>
            <Card.Title className="text-center mb-3">
              <PersonCircle size={30} className="me-2" />
              Chat Box
            </Card.Title>
            <div
              style={{
                height: '400px',
                overflow: 'hidden',
                padding: '10px',
                backgroundColor: '#ece5dd',
                borderRadius: '10px',
                marginBottom: '10px',
              }}
            >
              <iframe
                src="https://www3.cbox.ws/box/?boxid=3542378&boxtag=hnGq0X"
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                }}
                title="Chat Box"
              ></iframe>
            </div>
          </Card.Body>
        </Card>
      )}
    </>
  );
};

export default RoomChatPage;
