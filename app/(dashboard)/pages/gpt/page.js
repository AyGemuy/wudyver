'use client';

import React, { useState } from "react";
import { Card, Form, Button, Alert } from "react-bootstrap";
import { Send, PersonCircle } from "react-bootstrap-icons";
import useMounted from 'hooks/useMounted';

const ChatBubble = ({ message, isUser }) => (
  <div className={`d-flex ${isUser ? "justify-content-end" : "justify-content-start"} mb-2`}>
    {!isUser && (
      <div className="me-2">
        <PersonCircle size={30} style={{ color: "#007bff", marginTop: "5px" }} />
      </div>
    )}
    <div
      style={{
        maxWidth: "75%",
        padding: "10px 15px",
        borderRadius: "15px",
        backgroundColor: isUser ? "#dcf8c6" : "#fff",
        color: "#000",
        boxShadow: "0 2px 3px rgba(0, 0, 0, 0.2)",
        animation: "fadeIn 0.5s",
      }}
    >
      {message}
    </div>
  </div>
);

const fetchGptResponse = async (message) => {
  try {
    const res = await fetch(`/api/ai/gpt4v?prompt=${encodeURIComponent(message)}`);
    if (!res.ok) {
      throw new Error(`Failed to fetch: ${res.status}`);
    }

    const data = (await res.json())?.result;
    return data || "Gpt tidak memiliki respons.";
  } catch (error) {
    console.error("Error fetching Gpt response:", error.message);
    return "Terjadi kesalahan. Coba lagi nanti.";
  }
};

const GptPage = () => {
  const hasMounted = useMounted();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = { message: input, isUser: true };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    setLoading(true);
    const gptResponse = await fetchGptResponse(input);
    const gptMessage = { message: gptResponse, isUser: false };
    setMessages((prev) => [...prev, gptMessage]);
    setLoading(false);
  };

  return (
    <>
      {hasMounted && (
        <Card className="m-5 shadow-lg" style={{ maxWidth: "600px", margin: "0 auto" }}>
          <Card.Body>
            <Card.Title className="text-center mb-3">
              <PersonCircle size={30} className="me-2" />
              Chat dengan Gpt
            </Card.Title>
            <div
              style={{
                height: "400px",
                overflowY: "auto",
                padding: "10px",
                backgroundColor: "#ece5dd",
                borderRadius: "10px",
                marginBottom: "10px",
              }}
            >
              {messages.length > 0 ? (
                messages.map((msg, idx) => (
                  <ChatBubble key={idx} message={msg.message} isUser={msg.isUser} />
                ))
              ) : (
                <Alert variant="info" className="text-center">
                  <PersonCircle size={20} className="me-2" />
                  Mulai percakapan dengan Gpt!
                </Alert>
              )}
              {loading && <div className="text-center">Gpt sedang menjawab...</div>}
            </div>
            <Form onSubmit={handleSend} className="d-flex">
              <Form.Control
                type="text"
                placeholder="Ketik pesan..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                style={{
                  borderRadius: "20px",
                  borderTopRightRadius: "0",
                  borderBottomRightRadius: "0",
                }}
              />
              <Button
                type="submit"
                style={{
                  borderRadius: "20px",
                  borderTopLeftRadius: "0",
                  borderBottomLeftRadius: "0",
                  backgroundColor: "#34b7f1",
                  border: "none",
                }}
                disabled={loading}
              >
                <Send size={20} />
              </Button>
            </Form>
          </Card.Body>
        </Card>
      )}
    </>
  );
};

export default GptPage;
