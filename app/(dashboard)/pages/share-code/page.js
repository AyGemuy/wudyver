"use client";

import { useState, useEffect } from "react";
import { Container, Form, Button, Card, Badge, Modal, Spinner } from "react-bootstrap";
import { Clipboard, CodeSquare, Trash } from "react-bootstrap-icons";

export default function ShareCode() {
  const [author, setAuthor] = useState("");
  const [fileName, setFileName] = useState("");
  const [code, setCode] = useState("");
  const [tag, setTag] = useState("");
  const [codes, setCodes] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedCode, setSelectedCode] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchCodes = async () => {
      setLoading(true);
      try {
        const query = new URLSearchParams({ tag, search });
        const res = await fetch(`/api/share-code?${query}`);
        const data = await res.json();
        setCodes(data);
      } catch (error) {
        console.error("Error fetching codes:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCodes();
  }, [tag, search]); // Bergantung pada tag dan search

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/share-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ author, fileName, code, tag }),
      });
      if (res.ok) {
        setAuthor("");
        setFileName("");
        setCode("");
        setTag("Unknown");
        setSearch(""); // Reset pencarian
        setCodes(await res.json());
      }
    } catch (error) {
      console.error("Error submitting code:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure?")) return;
    try {
      const res = await fetch(`/api/share-code`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setCodes(codes.filter((code) => code._id !== id));
        setShowModal(false);
      }
    } catch (error) {
      console.error("Error deleting code:", error);
    }
  };

  return (
    <Container className="mt-5">
      <Card className="p-4 shadow-lg border-primary">
        <div className="text-center mb-4">
            <h2 className="fw-bold text-primary">
              <CodeSquare className="me-2" />
              GitHub API Explorer
            </h2>
            <p className="text-muted">Jelajahi dan akses file API dengan mudah</p>
          </div>
        <Form onSubmit={handleSubmit}>
          <Form.Group>
            <Form.Label>Author</Form.Label>
            <Form.Control value={author} onChange={(e) => setAuthor(e.target.value)} required />
          </Form.Group>
          <Form.Group className="mt-2">
            <Form.Label>File Name</Form.Label>
            <Form.Control value={fileName} onChange={(e) => setFileName(e.target.value)} required />
          </Form.Group>
          <Form.Group className="mt-2">
            <Form.Label>Code</Form.Label>
            <Form.Control as="textarea" rows={4} value={code} onChange={(e) => setCode(e.target.value)} required />
          </Form.Group>
          <Form.Group className="mt-2">
            <Form.Label>Tag</Form.Label>
            <Form.Control value={tag} onChange={(e) => setTag(e.target.value)} placeholder="e.g. JavaScript" />
          </Form.Group>
          <Button type="submit" className="mt-3 w-100" variant="primary" disabled={submitting}>
            {submitting ? <Spinner size="sm" animation="border" /> : "Submit"}
          </Button>
        </Form>

        <hr />

        <Form.Control
          className="mt-2"
          placeholder="Search Code..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {loading && <Spinner animation="border" className="mt-3" />}

        {!loading && codes.length > 0 && (
          <div className="mt-3">
            {codes.map((item) => (
              <Card key={item._id} className="mt-2 p-3 border-info bg-light shadow-sm" onClick={() => setSelectedCode(item)}>
                <h6>
                  {item.fileName} <Badge bg="info">{item.tag}</Badge>
                </h6>
                <pre className="bg-secondary text-light p-2 rounded">{item.code.substring(0, 50)}...</pre>
              </Card>
            ))}
          </div>
        )}

        {!loading && codes.length === 0 && <div className="text-center text-warning mt-3">No codes found.</div>}
      </Card>

      <Modal show={!!selectedCode} onHide={() => setSelectedCode(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title>{selectedCode?.fileName}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <pre className="bg-light text-dark p-3 rounded">{selectedCode?.code}</pre>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="info" onClick={() => navigator.clipboard.writeText(selectedCode?.code || "")}>
            <Clipboard className="me-2" /> Copy
          </Button>
          <Button variant="danger" onClick={() => handleDelete(selectedCode?._id)}>
            <Trash className="me-2" /> Delete
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}
