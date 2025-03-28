"use client";

import { useState } from "react";
import Image from "next/image";
import { Button, Form, Container, Card, Spinner, Modal, InputGroup } from "react-bootstrap";
import { Image as ImageIcon, Send } from "react-bootstrap-icons";

export default function PhotoToAnime() {
  const [imageUrl, setImageUrl] = useState("");
  const [strength, setStrength] = useState(null);
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [requestFrom, setRequestFrom] = useState(null);
  const [loading, setLoading] = useState(false);
  const [resultUrl, setResultUrl] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!imageUrl) return alert("Masukkan URL gambar");

    setLoading(true);
    setResultUrl(null);

    try {
      const response = await fetch("/api/ai/image/pixnova", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: imageUrl,
          strength,
          prompt: prompt || undefined,
          negative_prompt: negativePrompt || undefined,
          request_from: requestFrom || undefined,
        }),
      });

      const data = await response.json();
      if (data.result) {
        setResultUrl(data.result);
        setShowModal(true);
      } else {
        alert("Gagal mendapatkan hasil.");
      }
    } catch (error) {
      alert("Terjadi kesalahan. Coba lagi.");
    }

    setLoading(false);
  };

  return (
    <Container className="text-center mt-4 max-w-4xl mx-auto p-6">
    <Card className="shadow-lg border-0 p-4">
      <div className="max-w-lg mx-auto bg-white rounded-lg shadow-xl p-6">
        <h1 className="text-4xl font-bold text-indigo-600 mb-4">Photo to Anime</h1>
        <Form onSubmit={handleSubmit} className="space-y-6">
          <InputGroup className="mb-3">
            <InputGroup.Text className="bg-gray-200 text-black"><ImageIcon /></InputGroup.Text>
            <Form.Control
              type="text"
              placeholder="Masukkan URL Gambar"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              required
              className="rounded-lg"
            />
          </InputGroup>

          <div className="space-y-2">
            <Form.Group>
              <Form.Label className="text-gray-700">Strength ({strength}%)</Form.Label>
              <Form.Range
                value={strength}
                onChange={(e) => setStrength(e.target.value)}
                min={1}
                max={100}
                className="w-full"
              />
            </Form.Group>

            <Form.Group>
              <Form.Label className="text-gray-700">Prompt (Opsional)</Form.Label>
              <Form.Control
                type="text"
                placeholder="Deskripsi tambahan"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="rounded-lg"
              />
            </Form.Group>

            <Form.Group>
              <Form.Label className="text-gray-700">Negative Prompt (Opsional)</Form.Label>
              <Form.Control
                type="text"
                placeholder="Deskripsi untuk dihindari"
                value={negativePrompt}
                onChange={(e) => setNegativePrompt(e.target.value)}
                className="rounded-lg"
              />
            </Form.Group>

            <Form.Group>
              <Form.Label className="text-gray-700">Request From</Form.Label>
              <Form.Select
                value={requestFrom}
                onChange={(e) => setRequestFrom(e.target.value)}
                className="rounded-lg"
              >
                <option value="web">Web</option>
                <option value="mobile">Mobile</option>
                <option value="api">API</option>
              </Form.Select>
            </Form.Group>
          </div>

          <Button
            type="submit"
            variant="primary"
            disabled={loading}
            className="w-full py-3 text-lg font-semibold bg-indigo-600 hover:bg-indigo-700 rounded-lg"
          >
            {loading ? (
              <Spinner animation="border" size="sm" />
            ) : (
              <Send />
            )}
            Convert
          </Button>
        </Form>

        {/* Display result inside the same card */}
        {resultUrl && (
          <div className="mt-6">
            <h3 className="text-2xl font-semibold text-indigo-600 mb-4">Hasil Konversi</h3>
            <div className="text-center">
              <Image
                src={resultUrl}
                alt="Anime Version"
                width={300}
                height={300}
                priority
                className="rounded-lg shadow-md mb-4"
              />
              <p><strong>Result URL:</strong> <a href={resultUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-500">{resultUrl}</a></p>
              <p><strong>Original URL:</strong> <a href={imageUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-500">{imageUrl}</a></p>
              {prompt && <p><strong>Prompt:</strong> {prompt}</p>}
              {negativePrompt && <p><strong>Negative Prompt:</strong> {negativePrompt}</p>}
              <p><strong>Strength:</strong> {strength}%</p>
              <p><strong>Request From:</strong> {requestFrom}</p>
            </div>
          </div>
        )}
      </div>

      {/* Modal for showing results */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered className="max-w-2xl mx-auto">
        <Modal.Header closeButton className="bg-indigo-600 text-white">
          <Modal.Title>Hasil Konversi</Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center">
          {resultUrl ? (
            <>
              <Image
                src={resultUrl}
                alt="Anime Version"
                width={300}
                height={300}
                priority
                className="rounded-lg shadow-md"
              />
              <div className="mt-3">
                <p className="text-gray-700"><strong>Original URL:</strong> <a href={imageUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-500">{imageUrl}</a></p>
                {prompt && <p className="text-gray-700"><strong>Prompt:</strong> {prompt}</p>}
                {negativePrompt && <p className="text-gray-700"><strong>Negative Prompt:</strong> {negativePrompt}</p>}
                <p className="text-gray-700"><strong>Strength:</strong> {strength}%</p>
                <p className="text-gray-700"><strong>Request From:</strong> {requestFrom}</p>
              </div>
            </>
          ) : (
            <p className="text-red-500">Gagal mendapatkan hasil.</p>
          )}
        </Modal.Body>
      </Modal>
      </Card>
    </Container>
  );
}
