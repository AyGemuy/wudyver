"use client";

import { useEffect, useState } from "react";
import { Card, Button, Container, Row, Col, Form, Modal, Alert } from "react-bootstrap";
import { Trash } from "react-bootstrap-icons";

const PLACEHOLDER_IMAGE = "https://via.placeholder.com/600x400?text=No+Image";

export default function PostPage() {
  const [posts, setPosts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [newPost, setNewPost] = useState({
    title: "",
    content: "",
    author: "",
    description: "",
    slug: "",
    thumbnail: "",
  });
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const res = await fetch("/api/posts/get");
      if (!res.ok) throw new Error("Failed to fetch posts");
      const data = await res.json();
      setPosts(data);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSubmit = async () => {
    try {
      const res = await fetch("/api/posts/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newPost),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create post");

      setPosts((prev) => [...prev, data]);
      setShowModal(false);
      setNewPost({ title: "", content: "", author: "", description: "", slug: "", thumbnail: "" });
      setSuccessMessage("Post created successfully!");
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (slug) => {
    if (window.confirm("Are you sure you want to delete this post?")) {
      try {
        const res = await fetch(`/api/posts/delete?slug=${slug}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Failed to delete post");

        setPosts((prev) => prev.filter((post) => post.slug !== slug));
        setSuccessMessage("Post deleted successfully!");
      } catch (err) {
        setError(err.message);
      }
    }
  };

  return (
    <Container className="mt-5">
      <Row>
        <Col md={8}>
          <h1 className="text-center mb-4" style={{ color: "#007BFF" }}>🚀 Blog Posts</h1>
          {error && <Alert variant="danger">{error}</Alert>}
          {successMessage && <Alert variant="success">{successMessage}</Alert>}
          <Row>
            {posts.map((post) => (
              <Col key={post.slug} md={6} className="mb-4">
                <Card className="shadow-lg rounded-lg border-0" style={{ overflow: "hidden", background: "rgba(255, 255, 255, 0.85)", backdropFilter: "blur(10px)" }}>
                  <Card.Img 
                    variant="top" 
                    src={post.thumbnail || PLACEHOLDER_IMAGE} 
                    alt={post.title} 
                    style={{ height: "200px", objectFit: "cover" }}
                  />
                  <Card.Body>
                    <Card.Title className="text-primary">{post.title}</Card.Title>
                    <Card.Text className="text-muted">{post.description}</Card.Text>
                    <Card.Text>
                      <small className="text-secondary">By {post.author} on {new Date(post.date).toLocaleDateString()}</small>
                    </Card.Text>
                    <div className="d-flex justify-content-between align-items-center">
                      <Button variant="outline-primary" href={`/posts/${post.slug}`} className="shadow-sm">Read More</Button>
                      <Button variant="danger" onClick={() => handleDelete(post.slug)} className="shadow-sm">
                        <Trash /> Delete
                      </Button>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        </Col>

        <Col md={4} className="text-center">
          <Button variant="success" onClick={() => setShowModal(true)} className="w-100 shadow-lg">
            ➕ New Post
          </Button>
        </Col>
      </Row>

      {/* Modal untuk membuat post baru */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Create New Post</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            {["Title", "Content", "Author", "Description", "Slug", "Thumbnail URL"].map((field, index) => (
              <Form.Group key={index} className="mb-3">
                <Form.Label>{field}</Form.Label>
                <Form.Control
                  type={field === "Content" ? "textarea" : "text"}
                  placeholder={`Enter ${field.toLowerCase()}`}
                  value={newPost[field.toLowerCase()]}
                  onChange={(e) => setNewPost({ ...newPost, [field.toLowerCase()]: e.target.value })}
                  className="shadow-sm"
                  as={field === "Content" ? "textarea" : "input"}
                  rows={field === "Content" ? 3 : undefined}
                />
              </Form.Group>
            ))}
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>Close</Button>
          <Button variant="primary" onClick={handleSubmit}>Create Post</Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}
