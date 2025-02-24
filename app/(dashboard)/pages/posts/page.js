"use client";

import { useEffect, useState } from "react";
import { Card, Button, Container, Row, Col, Form, Modal, Alert } from "react-bootstrap";
import { Trash } from "react-bootstrap-icons";

export default function PostPage() {
  const [posts, setPosts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [newPost, setNewPost] = useState({ title: "", content: "", author: "", description: "", date: "", thumbnail: "" });
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
      setNewPost({ title: "", content: "", author: "", description: "", date: "", thumbnail: "" });
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
          <h1 className="text-center mb-4 text-primary">Blog Posts</h1>
          {error && <Alert variant="danger">{error}</Alert>}
          {successMessage && <Alert variant="success">{successMessage}</Alert>}
          <Row>
            {posts.map((post) => (
              <Col key={post.slug} md={6} className="mb-4">
                <Card className="shadow-lg rounded-lg">
                  <Card.Img variant="top" src={post.thumbnail} alt={post.title} />
                  <Card.Body>
                    <Card.Title className="text-success">{post.title}</Card.Title>
                    <Card.Text>{post.description}</Card.Text>
                    <Card.Text className="text-muted">
                      <small>By {post.author} on {new Date(post.date).toLocaleDateString()}</small>
                    </Card.Text>
                    <Button variant="link" href={`/posts/${post.slug}`}>
                      Read More
                    </Button>
                    <div className="d-flex justify-content-between">
                      <Button variant="danger" onClick={() => handleDelete(post.slug)}>
                        <Trash /> Delete
                      </Button>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        </Col>

        <Col md={4}>
          <h2 className="text-center text-info">Create Post</h2>
          <Button variant="success" onClick={() => setShowModal(true)} className="w-100 shadow-sm">
            New Post
          </Button>
        </Col>
      </Row>

      {/* Modal for creating new post */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Create New Post</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Title</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter post title"
                value={newPost.title}
                onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                className="shadow-sm"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Content</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                placeholder="Enter post content"
                value={newPost.content}
                onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                className="shadow-sm"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Author</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter author's name"
                value={newPost.author}
                onChange={(e) => setNewPost({ ...newPost, author: e.target.value })}
                className="shadow-sm"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter short description"
                value={newPost.description}
                onChange={(e) => setNewPost({ ...newPost, description: e.target.value })}
                className="shadow-sm"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Date</Form.Label>
              <Form.Control
                type="date"
                value={newPost.date}
                onChange={(e) => setNewPost({ ...newPost, date: e.target.value })}
                className="shadow-sm"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Thumbnail URL</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter thumbnail image URL"
                value={newPost.thumbnail}
                onChange={(e) => setNewPost({ ...newPost, thumbnail: e.target.value })}
                className="shadow-sm"
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)} className="w-100">
            Cancel
          </Button>
          <Button variant="success" onClick={handleSubmit} className="w-100">
            Save Post
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}