'use client';

import React, { useState } from "react";
import { Card, Button, Form, Modal } from "react-bootstrap";
import { Send, Pencil, Trash } from "react-bootstrap-icons";

const CommentPage = () => {
  const [comments, setComments] = useState([]);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editIndex, setEditIndex] = useState(null);
  const [modalShow, setModalShow] = useState(false);
  const [deleteIndex, setDeleteIndex] = useState(null);

  const handleSend = (e) => {
    e.preventDefault();
    if (!name || !message) return;
    const newComment = replyTo
      ? {
          name,
          message,
          replies: [],
        }
      : {
          name,
          message,
          replies: [],
        };
    if (replyTo !== null) {
      const updatedComments = [...comments];
      updatedComments[replyTo].replies.push(newComment);
      setComments(updatedComments);
      setReplyTo(null);
    } else {
      setComments([...comments, newComment]);
    }
    setName("");
    setMessage("");
  };

  const handleEdit = (index) => {
    setEditMode(true);
    setEditIndex(index);
    setName(comments[index].name);
    setMessage(comments[index].message);
  };

  const handleUpdate = () => {
    const updatedComments = [...comments];
    updatedComments[editIndex] = {
      ...updatedComments[editIndex],
      name,
      message: `${message} (edited)`,
    };
    setComments(updatedComments);
    setEditMode(false);
    setEditIndex(null);
    setName("");
    setMessage("");
  };

  const handleDelete = (index) => {
    setDeleteIndex(index);
    setModalShow(true);
  };

  const confirmDelete = () => {
    const updatedComments = [...comments];
    updatedComments[deleteIndex].message = "(deleted)";
    setComments(updatedComments);
    setModalShow(false);
    setDeleteIndex(null);
  };

  const handleReply = (index) => {
    setReplyTo(index);
  };

  const refreshPage = () => {
    setComments([]);
    setName("");
    setMessage("");
  };

  return (
    <Card>
      <Card.Body>
        <h4>Komentar</h4>
        <div>
          {comments.map((comment, index) => (
            <div key={index} className="mb-3">
              <strong>{comment.name}</strong>: {comment.message}
              <div>
                <Button variant="link" onClick={() => handleReply(index)}>
                  Balas
                </Button>
                <Button variant="link" onClick={() => handleEdit(index)}>
                  <Pencil />
                </Button>
                <Button variant="link" onClick={() => handleDelete(index)}>
                  <Trash />
                </Button>
              </div>
              {comment.replies.map((reply, i) => (
                <div key={i} style={{ marginLeft: "20px" }}>
                  <strong>{reply.name}</strong>: {reply.message}
                </div>
              ))}
            </div>
          ))}
        </div>
        <Form>
          <Form.Control
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nama"
          />
        </Form>
        {editMode ? (
          <div className="d-flex mt-2">
            <Form.Control
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tulis komentar..."
            />
            <Button variant="primary" className="ms-2" onClick={handleUpdate}>
              Perbarui
            </Button>
          </div>
        ) : (
          <Form onSubmit={handleSend} className="d-flex mt-2">
            <Form.Control
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tulis komentar..."
            />
            <Button variant="primary" type="submit" className="ms-2">
              Kirim <Send size={14} />
            </Button>
          </Form>
        )}
        <Button variant="secondary" className="mt-3" onClick={refreshPage}>
          Refresh
        </Button>
      </Card.Body>

      <Modal show={modalShow} onHide={() => setModalShow(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Hapus Komentar</Modal.Title>
        </Modal.Header>
        <Modal.Body>Apakah Anda yakin ingin menghapus komentar ini?</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setModalShow(false)}>
            Batal
          </Button>
          <Button variant="danger" onClick={confirmDelete}>
            Hapus
          </Button>
        </Modal.Footer>
      </Modal>
    </Card>
  );
};

export default CommentPage;
