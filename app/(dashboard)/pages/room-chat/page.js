'use client';

import React, { useState, useEffect } from "react";
import { Form, Button, Card, Alert } from "react-bootstrap";
import { Send, Pencil, Trash } from "react-bootstrap-icons";

const RoomChatPage = () => {
  const [roomName, setRoomName] = useState("");
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [roomCreated, setRoomCreated] = useState(false);
  const [error, setError] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [editIndex, setEditIndex] = useState(null);

  useEffect(() => {
    if (!roomName) return;

    const fetchRoomMessages = async () => {
      try {
        const res = await fetch(`/api/room?roomName=${roomName}`);
        const data = await res.json();
        if (data.success) {
          setMessages(data.data.messages);
        } else {
          setMessages([]);
        }
      } catch {
        setError("Error fetching room data");
      }
    };

    fetchRoomMessages();
  }, [roomName]);

  const handleCreateRoom = async () => {
    if (!roomName || !name) return;

    try {
      const res = await fetch('/api/room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomName, name, message: `${name} joined the room!` })
      });
      const data = await res.json();
      if (data.success) {
        setRoomCreated(true);
        setMessages(data.data.messages);
      } else {
        setError(data.message);
      }
    } catch {
      setError("Error creating room");
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!name || !message || !roomName) return;

    setLoading(true);
    try {
      const res = await fetch('/api/room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomName, name, message })
      });
      const data = await res.json();
      if (data.success) {
        setMessages(data.data.messages);
        setMessage("");
      } else {
        setError(data.message);
      }
    } catch {
      setError("Error sending message");
    }
    setLoading(false);
  };

  const handleEditMessage = (index) => {
    setEditMode(true);
    setEditIndex(index);
    setMessage(messages[index].message.replace(" (edited)", ""));
  };

  const handleUpdateMessage = async () => {
    if (!roomName || editIndex === null || !message) return;

    const updatedMessages = [...messages];
    updatedMessages[editIndex] = {
      ...updatedMessages[editIndex],
      message: `${message} (edited)`,
    };
    setMessages(updatedMessages);

    setEditMode(false);
    setEditIndex(null);
    setMessage("");
  };

  const handleDeleteMessage = (index) => {
    const updatedMessages = [...messages];
    updatedMessages[index].message = "(deleted)";
    setMessages(updatedMessages);
  };

  return (
    <div className="container mt-4">
      {!roomCreated ? (
        <Card className="shadow-lg" style={{ maxWidth: '600px', margin: '0 auto' }}>
          <Card.Body>
            <Card.Title className="text-center">Create or Join a Room</Card.Title>
            <Form onSubmit={(e) => e.preventDefault()}>
              <Form.Group className="mb-3">
                <Form.Label>Room Name</Form.Label>
                <Form.Control
                  type="text"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  placeholder="Enter Room Name"
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Your Name</Form.Label>
                <Form.Control
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter Your Name"
                />
              </Form.Group>
              <Button variant="primary" onClick={handleCreateRoom}>
                Create/Join Room
              </Button>
              {error && <Alert variant="danger" className="mt-3">{error}</Alert>}
            </Form>
          </Card.Body>
        </Card>
      ) : (
        <Card className="shadow-lg" style={{ maxWidth: '600px', margin: '0 auto' }}>
          <Card.Body>
            <Card.Title className="text-center">Room: {roomName}</Card.Title>
            <div
              style={{
                height: '300px',
                overflowY: 'auto',
                backgroundColor: '#f7f7f7',
                padding: '10px',
                borderRadius: '8px',
              }}
            >
              {messages.length > 0 ? (
                messages.map((msg, idx) => (
                  <div key={idx} style={{ marginBottom: '10px' }}>
                    <strong>{msg.name}: </strong>
                    {msg.message}
                    <div>
                      <Button variant="link" onClick={() => handleEditMessage(idx)}>
                        <Pencil />
                      </Button>
                      <Button variant="link" onClick={() => handleDeleteMessage(idx)}>
                        <Trash />
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <Alert variant="info">No messages yet. Start chatting!</Alert>
              )}
            </div>
            <Form onSubmit={editMode ? handleUpdateMessage : handleSendMessage}>
              <Form.Group className="mb-3">
                <Form.Control
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type a message"
                />
              </Form.Group>
              <Button type="submit" variant="primary" disabled={loading}>
                {loading ? "Sending..." : editMode ? "Update" : <Send />}
              </Button>
            </Form>
            {error && <Alert variant="danger" className="mt-3">{error}</Alert>}
          </Card.Body>
        </Card>
      )}
    </div>
  );
};

export default RoomChatPage;
