"use client";

import { useState, useEffect } from "react";
import { Container, Form, Button, Row, Col, Image } from "react-bootstrap";

export default function EditProfile() {
  const [user, setUser] = useState({
    name: "",
    email: "",
    bio: "",
    avatar: "",
  });

  const [preview, setPreview] = useState(null);

  useEffect(() => {
    // Simulasi fetch data pengguna dari API
    setUser({
      name: "John Doe",
      email: "johndoe@example.com",
      bio: "Web Developer & Designer",
      avatar: "/favicon.png", // Avatar default
    });
    setPreview("/favicon.png");
  }, []);

  const handleChange = (e) => {
    setUser({ ...user, [e.target.name]: e.target.value });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setPreview(imageUrl);
      setUser({ ...user, avatar: file });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    alert("Profile updated successfully!");
  };

  return (
    <Container className="mt-5">
      <Row className="justify-content-center">
        <Col md={6}>
          <h2 className="text-center mb-4">Edit Profile</h2>
          <Form onSubmit={handleSubmit}>
            {/* Avatar */}
            <div className="text-center mb-3">
              <Image src={preview} roundedCircle width={100} height={100} />
            </div>
            <Form.Group controlId="formAvatar" className="mb-3">
              <Form.Label>Profile Picture</Form.Label>
              <Form.Control type="file" accept="image/*" onChange={handleImageChange} />
            </Form.Group>

            {/* Nama */}
            <Form.Group controlId="formName" className="mb-3">
              <Form.Label>Name</Form.Label>
              <Form.Control type="text" name="name" value={user.name} onChange={handleChange} required />
            </Form.Group>

            {/* Email */}
            <Form.Group controlId="formEmail" className="mb-3">
              <Form.Label>Email</Form.Label>
              <Form.Control type="email" name="email" value={user.email} onChange={handleChange} required />
            </Form.Group>

            {/* Bio */}
            <Form.Group controlId="formBio" className="mb-3">
              <Form.Label>Bio</Form.Label>
              <Form.Control as="textarea" rows={3} name="bio" value={user.bio} onChange={handleChange} />
            </Form.Group>

            {/* Tombol Simpan */}
            <Button variant="primary" type="submit" className="w-100">
              Simpan Perubahan
            </Button>
          </Form>
        </Col>
      </Row>
    </Container>
  );
}
