'use client';

import { useState } from 'react';
import { Row, Col, Card, Form, Button, Image, Alert } from 'react-bootstrap';
import Link from 'next/link';
import Cookies from 'js-cookie';

const SignIn = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/sign-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Something went wrong');
      }

      Cookies.set('auth_token', data.token, { expires: 1, path: '' });
      window.location.href = '/dashboard';
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Row className="align-items-center justify-content-center g-0 min-vh-100" style={{ background: '#f0f2f5' }}>
      <Col xxl={4} lg={6} md={8} xs={12} className="py-8 py-xl-0">
        <Card className="shadow-lg rounded-4">
          <Card.Body className="p-4">
            <div className="text-center mb-4">
              <Link href="/">
                <Image src="/images/brand/logo/logo-primary.svg" className="mb-3" alt="Logo" width={120} />
              </Link>
              <h5 className="mb-4">Welcome Back! Please sign in to your account.</h5>
            </div>
            {error && <Alert variant="danger">{error}</Alert>}
            <Form onSubmit={handleSubmit}>
              <Form.Group className="mb-3" controlId="email">
                <Form.Label>Email Address</Form.Label>
                <Form.Control
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </Form.Group>

              <Form.Group className="mb-3" controlId="password">
                <Form.Label>Password</Form.Label>
                <Form.Control
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </Form.Group>

              <div className="d-grid">
                <Button variant="primary" type="submit" disabled={loading}>
                  {loading ? 'Signing In...' : 'Sign In'}
                </Button>
              </div>

              <div className="d-md-flex justify-content-between mt-4">
                <Link href="/authentication/sign-up" className="fs-5 text-primary">
                  Create an Account
                </Link>
                <Link href="/authentication/forget-password" className="text-inherit fs-5">
                  Forgot Password?
                </Link>
              </div>
            </Form>
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );
};

export default SignIn;
