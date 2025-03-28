"use client";

import { useState } from "react";
import { Container, Form, Button, Row, Col, Alert } from "react-bootstrap";

export default function AccountSettings() {
  const [user, setUser] = useState({
    name: "John Doe",
    email: "johndoe@example.com",
    password: "",
    confirmPassword: "",
    notifications: true,
  });

  const [successMessage, setSuccessMessage] = useState("");

  const handleChange = (e) => {
    setUser({ ...user, [e.target.name]: e.target.type === "checkbox" ? e.target.checked : e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (user.password && user.password !== user.confirmPassword) {
      alert("Passwords do not match!");
      return;
    }
    setSuccessMessage("Account settings updated successfully!");
    setUser({ ...user, password: "", confirmPassword: "" });
  };

  return (
    <Container className="mt-5">
      <Row className="justify-content-center">
        <Col md={6}>
          <h2 className="text-center mb-4">Account Settings</h2>

          {successMessage && <Alert variant="success">{successMessage}</Alert>}

          <Form onSubmit={handleSubmit}>
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

            {/* Ganti Password */}
            <Form.Group controlId="formPassword" className="mb-3">
              <Form.Label>New Password</Form.Label>
              <Form.Control type="password" name="password" value={user.password} onChange={handleChange} />
            </Form.Group>

            <Form.Group controlId="formConfirmPassword" className="mb-3">
              <Form.Label>Confirm Password</Form.Label>
              <Form.Control type="password" name="confirmPassword" value={user.confirmPassword} onChange={handleChange} />
            </Form.Group>

            {/* Notifikasi Email */}
            <Form.Group controlId="formNotifications" className="mb-3">
              <Form.Check type="checkbox" label="Receive email notifications" name="notifications" checked={user.notifications} onChange={handleChange} />
            </Form.Group>

            {/* Tombol Simpan */}
            <Button variant="primary" type="submit" className="w-100">
              Save Changes
            </Button>
          </Form>
        </Col>
      </Row>
    </Container>
  );
}
