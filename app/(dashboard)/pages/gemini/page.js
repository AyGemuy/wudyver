"use client";

import React, { useState } from "react";
import { Card, Form, Button, Alert } from "react-bootstrap";
import { Send, PersonCircle } from "react-bootstrap-icons";
import useMounted from "hooks/useMounted";

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

const GptPage = () => {
  const hasMounted = useMounted();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [mode, setMode] = useState("default");
  const [imgUrl, setImgUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = { text: input, sender: "user", time: new Date().toLocaleTimeString() };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    setLoading(true);

    try {
      const response = await fetch("/api/ai/gemini/v2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: input,
          ...(mode && { mode }),
          ...(imgUrl && { imgUrl }),
        }),
      });

      if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);

      const data = await response.json();

      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            text: data.response || "Gpt tidak memiliki respons.",
            sender: "bot",
            fileUrl: data.file_url || null,
            time: new Date().toLocaleTimeString(),
          },
        ]);
      }, 500);
    } catch (error) {
      console.error("Error fetching response:", error.message);
      setMessages((prev) => [
        ...prev,
        { text: "Terjadi kesalahan. Coba lagi nanti.", sender: "bot", time: new Date().toLocaleTimeString() },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {hasMounted && (
        <Card className="m-5 shadow-lg" style={{ maxWidth: "600px", margin: "0 auto" }}>
          <Card.Body>
            <Card.Title className="text-center mb-3">
              <PersonCircle size={30} className="me-2" />
              Chat dengan AI
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
                  <ChatBubble key={idx} message={msg.text} isUser={msg.sender === "user"} />
                ))
              ) : (
                <Alert variant="info" className="text-center">
                  <PersonCircle size={20} className="me-2" />
                  Mulai percakapan dengan AI!
                </Alert>
              )}
              {loading && <div className="text-center">AI sedang menjawab...</div>}
            </div>
            <Form onSubmit={handleSend}>
              <Form.Group className="mb-2">
                <Form.Control
                  type="text"
                  placeholder="Masukkan gambar URL (opsional)..."
                  value={imgUrl}
                  onChange={(e) => setImgUrl(e.target.value)}
                  style={{ borderRadius: "10px" }}
                />
              </Form.Group>
              <Form.Group className="mb-2">
                <Form.Select value={mode} onChange={(e) => setMode(e.target.value)} style={{ borderRadius: "10px" }}>
                  <option value="default">Mode Default</option>
                  <option value="creative">Mode Kreatif</option>
                  <option value="concise">Mode Singkat</option>
                </Form.Select>
              </Form.Group>
              <div className="d-flex">
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
              </div>
            </Form>
          </Card.Body>
        </Card>
      )}
    </>
  );
};

export default GptPage;
