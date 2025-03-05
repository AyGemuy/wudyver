'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, Button, Form, Modal, Container, Row, Col, Spinner } from 'react-bootstrap';
import { Send, Pencil, Trash, ChatLeftText, PersonCircle, XCircle } from 'react-bootstrap-icons';

const CommentPage = () => {
  const [comments, setComments] = useState([]);
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editId, setEditId] = useState(null);
  const [modalShow, setModalShow] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [modalAction, setModalAction] = useState(null); // Store the action (edit, delete, reply)
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchComments();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [comments]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchComments = async () => {
    setLoading(true);
    const res = await fetch('/api/comments');
    const data = await res.json();
    if (data.success) setComments(data.data);
    setLoading(false);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!name || !message) return;

    const payload = replyTo
      ? { name, message, parentId: replyTo }
      : { name, message };

    const res = await fetch('/api/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (data.success) {
      fetchComments();
      setName('');
      setMessage('');
      setReplyTo(null);
    }
  };

  const handleEdit = (id, currentMessage) => {
    setModalAction('edit');
    setEditMode(true);
    setEditId(id);
    setMessage(currentMessage);
    setModalShow(true);
  };

  const handleReply = (id) => {
    setModalAction('reply');
    setReplyTo(id);
    setMessage('');
    setModalShow(true);
  };

  const handleUpdate = async () => {
    const res = await fetch('/api/comments', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commentId: editId, message }),
    });

    const data = await res.json();
    if (data.success) {
      fetchComments();
      setModalShow(false);
      setEditMode(false);
      setEditId(null);
      setMessage('');
    }
  };

  const handleDelete = (id) => {
    setModalAction('delete');
    setDeleteId(id);
    setModalShow(true);
  };

  const confirmDelete = async () => {
    const res = await fetch('/api/comments', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commentId: deleteId }),
    });

    const data = await res.json();
    if (data.success) {
      fetchComments();
      setModalShow(false);
      setDeleteId(null);
    }
  };

  return (
    <Container>
      <h2 className="my-4 text-center">Komentar</h2>
      <Row>
        <Col md={8} className="mx-auto">
          <div style={{ maxHeight: '60vh', overflowY: 'auto', marginBottom: '1rem' }}>
            {loading ? (
              <div className="text-center my-3">
                <Spinner animation="border" />
              </div>
            ) : (
              comments.map((comment) => (
                <Card className="mb-3" key={comment._id}>
                  <Card.Body>
                    <Row>
                      <Col md={2} className="d-flex align-items-center justify-content-center">
                        {/* Profile Icon */}
                        <PersonCircle size={50} />
                      </Col>
                      <Col md={10}>
                        <h5>{comment.name}</h5>
                        <p>{comment.message}</p>
                        <small className="text-muted">
                          {new Date(comment.timestamp).toLocaleString()}
                        </small>
                        <div className="mt-2">
                          <Button
                            variant="link"
                            onClick={() => handleReply(comment._id)}
                            className={`me-2 ${replyTo === comment._id ? 'text-primary' : ''}`}
                          >
                            <ChatLeftText /> Balas
                          </Button>
                          <Button variant="link" onClick={() => handleEdit(comment._id, comment.message)} className="me-2">
                            <Pencil /> Edit
                          </Button>
                          <Button variant="link" onClick={() => handleDelete(comment._id)} className="me-2">
                            <Trash /> Hapus
                          </Button>
                        </div>
                        {comment.replies.map((reply) => (
                          <Card className="mt-3 ms-3" key={reply._id}>
                            <Card.Body>
                              <Row>
                                <Col md={2} className="d-flex align-items-center justify-content-center">
                                  {/* Profile Icon for Replies */}
                                  <PersonCircle size={40} />
                                </Col>
                                <Col md={10}>
                                  <h6>{reply.name}</h6>
                                  <p>{reply.message}</p>
                                  <small className="text-muted">
                                    {new Date(reply.timestamp).toLocaleString()}
                                  </small>
                                </Col>
                              </Row>
                            </Card.Body>
                          </Card>
                        ))}
                      </Col>
                    </Row>
                  </Card.Body>
                </Card>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          <Card className="shadow-sm">
            <Card.Body>
              <Form onSubmit={editMode ? handleUpdate : handleSend}>
                <Form.Group className="mb-3">
                  <Form.Control
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nama"
                    disabled={editMode}
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Control
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={modalAction === 'reply' ? 'Balas komentar...' : 'Tulis komentar...'}
                  />
                </Form.Group>
                <Button variant="primary" type="submit" disabled={loading}>
                  {editMode ? 'Perbarui' : 'Kirim'} <Send size={14} />
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Modal for Edit/Reply/Delete */}
      <Modal show={modalShow} onHide={() => setModalShow(false)} aria-labelledby="contained-modal-title-vcenter" centered>
        <Modal.Header closeButton>
          <Modal.Title>
            {modalAction === 'edit' && 'Edit Komentar'}
            {modalAction === 'reply' && 'Balas Komentar'}
            {modalAction === 'delete' && 'Hapus Komentar'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {modalAction === 'edit' || modalAction === 'reply' ? (
            <Form.Group>
              <Form.Control
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={modalAction === 'reply' ? 'Balas komentar...' : 'Edit komentar...'}
              />
            </Form.Group>
          ) : (
            <p>Apakah Anda yakin ingin menghapus komentar ini?</p>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setModalShow(false)}>
            Batal
          </Button>
          {modalAction === 'delete' ? (
            <Button variant="danger" onClick={confirmDelete}>
              Hapus <XCircle size={14} />
            </Button>
          ) : (
            <Button variant="primary" onClick={modalAction === 'edit' ? handleUpdate : handleSend}>
              {modalAction === 'edit' ? 'Perbarui' : 'Kirim'} <Send size={14} />
            </Button>
          )}
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default CommentPage;
