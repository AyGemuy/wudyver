'use client';

import { useState } from 'react';
import { Row, Col, Card, Form, Button, Image, Spinner, InputGroup, Toast, ToastContainer } from 'react-bootstrap';
import { Eye, EyeSlash, Person, Lock, CheckCircle, ExclamationCircle } from 'react-bootstrap-icons';
import Link from 'next/link';
import Cookies from 'js-cookie';

const SignIn = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', variant: 'success' });

  const handleLogin = async (loginEmail, loginPassword) => {
    setLoading(true);
    setToast({ show: false, message: '', variant: 'success' });

    try {
      const response = await fetch('/api/auth/sign-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Login failed');

      Cookies.set('auth_token', data.token, { expires: 1 });
      setToast({ show: true, message: 'Login Successful! Redirecting...', variant: 'success' });

      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 1000);
    } catch (err) {
      setToast({ show: true, message: err.message, variant: 'danger' });
    } finally {
      setLoading(false);
      setTimeout(() => setToast({ show: false }), 3000);
    }
  };

  return (
    <>
      <Row className="align-items-center justify-content-center min-vh-100 bg-light">
        <Col xxl={4} lg={6} md={8} xs={12} className="py-5">
          <Card className="shadow-lg border-0 rounded-4">
            <Card.Body className="p-5 text-center">
              <Image src="/images/brand/logo/logo-primary.svg" alt="Logo" width={120} className="mb-3" />
              <h4 className="mb-4">Welcome Back!</h4>

              <Form onSubmit={(e) => { e.preventDefault(); handleLogin(email, password); }}>
                {/* Email Input */}
                <Form.Group className="mb-3" controlId="email">
                  <InputGroup>
                    <InputGroup.Text><Person size={20} /></InputGroup.Text>
                    <Form.Control
                      type="email"
                      placeholder="Email Address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
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
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <InputGroup.Text onClick={() => setShowPassword(!showPassword)} style={{ cursor: 'pointer' }}>
                      {showPassword ? <EyeSlash size={20} /> : <Eye size={20} />}
                    </InputGroup.Text>
                  </InputGroup>
                </Form.Group>

                <div className="d-grid gap-2">
                  <Button variant="primary" type="submit" disabled={loading}>
                    {loading ? <><Spinner animation="border" size="sm" /> Signing In...</> : 'Sign In'}
                  </Button>

                  <Button variant="outline-primary" onClick={() => handleLogin('admin@api.com', 'admin')}>
                    Continue as Guest
                  </Button>
                </div>

                <div className="d-md-flex justify-content-between mt-4">
                  <Link href="/authentication/sign-up" className="text-decoration-none">
                    <Button variant="outline-primary" className="w-100">Create an Account</Button>
                  </Link>
                  <Link href="/authentication/forgot-password" className="text-decoration-none">
                    <Button variant="link" className="w-100">Forgot Password?</Button>
                  </Link>
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

export default SignIn;
