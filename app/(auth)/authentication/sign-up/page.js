'use client';

import { useState } from 'react';
import { Row, Col, Card, Form, Button, Image, Spinner, InputGroup, Toast, ToastContainer } from 'react-bootstrap';
import { Eye, EyeSlash, Envelope, Lock, CheckCircle, ExclamationCircle } from 'react-bootstrap-icons';
import Link from 'next/link';

const SignUp = () => {
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', variant: 'success' });

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSignUp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setToast({ show: false });

    try {
      const response = await fetch('/api/auth/sign-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Sign Up failed');

      setToast({ show: true, message: 'Account created! Redirecting...', variant: 'success' });

      // Redirect ke Sign In dalam 1.5 detik
      setTimeout(() => window.location.href = '/authentication/sign-in', 1500);
    } catch (err) {
      setToast({ show: true, message: err.message, variant: 'danger' });
    } finally {
      setLoading(false);
      setTimeout(() => setToast({ show: false }), 3000);
    }
  };

  const handleGuestLogin = () => {
    setToast({ show: true, message: 'Logging in as Guest...', variant: 'success' });
    setTimeout(() => window.location.href = '/dashboard', 1000);
  };

  return (
    <>
      <Row className="align-items-center justify-content-center min-vh-100 bg-light">
        <Col xxl={4} lg={6} md={8} xs={12} className="py-5">
          <Card className="shadow-lg border-0 rounded-4">
            <Card.Body className="p-5 text-center">
              <Image src="/images/brand/logo/logo-primary.svg" alt="Logo" width={120} className="mb-3" />
              <h4 className="mb-4">Create an Account</h4>

              <Form onSubmit={handleSignUp}>
                {/* Email Input */}
                <Form.Group className="mb-3" controlId="email">
                  <InputGroup>
                    <InputGroup.Text><Envelope size={20} /></InputGroup.Text>
                    <Form.Control
                      type="email"
                      name="email"
                      placeholder="Email Address"
                      value={form.email}
                      onChange={handleChange}
                      required
                    />
                  </InputGroup>
                </Form.Group>

                {/* Password Input */}
                <Form.Group className="mb-3" controlId="password">
                  <InputGroup>
                    <InputGroup.Text><Lock size={20} /></InputGroup.Text>
                    <Form.Control
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      placeholder="Password"
                      value={form.password}
                      onChange={handleChange}
                      required
                    />
                    <InputGroup.Text onClick={() => setShowPassword(!showPassword)} style={{ cursor: 'pointer' }}>
                      {showPassword ? <EyeSlash size={20} /> : <Eye size={20} />}
                    </InputGroup.Text>
                  </InputGroup>
                </Form.Group>

                <div className="d-grid gap-2">
                  <Button variant="primary" type="submit" disabled={loading}>
                    {loading ? <><Spinner animation="border" size="sm" /> Signing Up...</> : 'Sign Up'}
                  </Button>

                  <Button variant="outline-primary" onClick={handleGuestLogin}>
                    Continue as Guest
                  </Button>
                </div>

                <div className="mt-4">
                  <span>Already have an account? </span>
                  <Link href="/authentication/sign-in" className="text-decoration-none">Sign In</Link>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Toast Notification */}
      <ToastContainer position="top-end" className="p-3" style={{ zIndex: 1050, position: 'fixed' }}>
        <Toast show={toast.show} bg={toast.variant} onClose={() => setToast({ ...toast, show: false })} delay={3000} autohide>
          <Toast.Body className="d-flex align-items-center text-white">
            {toast.variant === 'success' ? <CheckCircle size={20} className="me-2" /> : <ExclamationCircle size={20} className="me-2" />}
            {toast.message}
          </Toast.Body>
        </Toast>
      </ToastContainer>
    </>
  );
};

export default SignUp;
