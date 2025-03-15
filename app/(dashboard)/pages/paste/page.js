'use client';

import React, { useState } from 'react';
import { Button, Container, Form, Alert, Card, Row, Col, Modal, ListGroup } from 'react-bootstrap';
import { Trash, FileText, Save, List, XCircle } from 'react-bootstrap-icons';
import axios from 'axios';

const PastePage = () => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [key, setKey] = useState('');
  const [syntax, setSyntax] = useState('text');
  const [expireIn, setExpireIn] = useState('');
  const [message, setMessage] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [pastelist, setPasteList] = useState([]);

  const apiRequest = async (params) => {
    try {
      const response = await axios.post('/api/tools/paste/v1', params);
      return response.data;
    } catch (error) {
      setMessage(`Error: ${error.response?.data?.error || error.message}`);
      return null;
    }
  };

  const handleCreatePaste = async () => {
    const data = await apiRequest({ action: 'create', title, content, syntax, expireIn });
    if (data) {
      setMessage(`Paste created! Key: ${data.key}`);
      handleClearForm(); // Clear form after creating
      handleListPastes(); // Refresh the list of pastes
    }
  };

  const handleGetPaste = async () => {
    const data = await apiRequest({ action: 'get', key });
    if (data) {
      setTitle(data.title);
      setContent(data.content);
      setSyntax(data.syntax);
      setMessage('Paste fetched successfully!');
      setShowModal(true);
    }
  };

  const handleListPastes = async () => {
    const data = await apiRequest({ action: 'list' });
    if (data) {
      setPasteList(data);
      setMessage('Pastes listed successfully!');
    }
  };

  const handleDeletePaste = async () => {
    const data = await apiRequest({ action: 'delete', key });
    if (data) {
      setMessage(`Paste with key ${key} has been deleted.`);
      setKey('');
      handleListPastes(); // Refresh the list after deletion
    }
  };

  const handleClearPastes = async () => {
    const data = await apiRequest({ action: 'clear' });
    if (data) {
      setPasteList([]); // Clear the local paste list
      setMessage('All pastes have been cleared successfully!');
    }
  };

  const handleClearForm = () => {
    setTitle('');
    setContent('');
    setKey('');
    setSyntax('text');
    setExpireIn('');
    setMessage('');
  };

  return (
    <Container className="mt-4">
      <h2 className="text-center mb-4">Paste Manager</h2>
      <Row className="g-4">
        <Col lg={6} md={12}>
          <Card>
            <Card.Body>
              <h4>Create a New Paste</h4>
              <Form>
                <Form.Group>
                  <Form.Control type="text" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
                </Form.Group>
                <Form.Group className="mt-2">
                  <Form.Control as="textarea" rows={4} placeholder="Content" value={content} onChange={(e) => setContent(e.target.value)} />
                </Form.Group>
                <Row className="mt-2 g-2">
                  <Col>
                    <Form.Select value={syntax} onChange={(e) => setSyntax(e.target.value)}>
                      <option value="text">Text</option>
                      <option value="javascript">JavaScript</option>
                      <option value="python">Python</option>
                    </Form.Select>
                  </Col>
                  <Col>
                    <Form.Control type="number" placeholder="Expire (sec)" value={expireIn} onChange={(e) => setExpireIn(e.target.value)} />
                  </Col>
                </Row>
                <Button variant="primary" className="w-100 mt-3" onClick={handleCreatePaste}><Save /> Save Paste</Button>
                <Button variant="secondary" className="w-100 mt-3" onClick={handleClearForm}><XCircle /> Clear</Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={6} md={12}>
          <Card>
            <Card.Body>
              <h4>Manage Pastes</h4>
              <Form>
                <Form.Group>
                  <Form.Control type="text" placeholder="Paste Key" value={key} onChange={(e) => setKey(e.target.value)} />
                </Form.Group>
                <Row className="mt-2 g-2">
                  <Col><Button variant="success" className="w-100" onClick={handleGetPaste}><FileText /> Fetch</Button></Col>
                  <Col><Button variant="danger" className="w-100" onClick={handleDeletePaste}><Trash /> Delete</Button></Col>
                </Row>
                <Button variant="info" className="w-100 mt-3" onClick={handleListPastes}><List /> List Pastes</Button>
                <Button variant="warning" className="w-100 mt-3" onClick={handleClearPastes}>Clear All Pastes</Button>
              </Form>
              {message && <Alert className="mt-3" variant={message.includes('Error') ? 'danger' : 'success'}>{message}</Alert>}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Modal for showing the fetched paste content */}
      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Fetched Paste</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <h5>{title}</h5>
          <pre className="bg-light p-3" style={{ whiteSpace: "pre-wrap" }}>{content}</pre>
          <p><strong>Syntax:</strong> {syntax}</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>Close</Button>
        </Modal.Footer>
      </Modal>

      {/* List of pastes */}
      <Row className="mt-4">
        <Col>
          {pastelist.length > 0 && (
            <Card>
              <Card.Body>
                <h4>List of Pastes</h4>
                <ListGroup>
                  {pastelist.map((paste) => (
                    <ListGroup.Item key={paste.key}>
                      <strong>{paste.title}</strong> <small>({paste.syntax})</small>
                      <Button variant="danger" size="sm" className="float-end" onClick={() => setKey(paste.key)}>Delete</Button>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              </Card.Body>
            </Card>
          )}
        </Col>
      </Row>
    </Container>
  );
};

export default PastePage;