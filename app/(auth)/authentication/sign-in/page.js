'use client';

import { Row, Col, Card, Form, Button, Image } from 'react-bootstrap';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import Cookies from 'js-cookie';

const SignIn = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const checkLoginStatus = () => {
      const currentUser = Cookies.get('currentUser');
      if (currentUser) {
        window.location.href = '/docs';  // Redirect if already logged in
      }
    };
    checkLoginStatus();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch(`/api/auth/sign-in?email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`);
      if (!res.ok) throw new Error('Failed to sign in');
      const data = await res.json();
      if (data.status === 200) {
        Cookies.set('currentUser', JSON.stringify({ email, loginTime: Date.now() }));
        setMessage(data.message);
        setTimeout(() => {
          window.location.href = '/docs';
        }, 2000);  // Redirect to docs after login
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Row className="align-items-center justify-content-center g-0 min-vh-100">
      <Col xxl={4} lg={6} md={8} xs={12} className="py-8 py-xl-0">
        <Card className="smooth-shadow-md">
          <Card.Body className="p-6">
            <div className="mb-4">
              <Link href="/">
                <Image src="/images/brand/logo/logo-primary.svg" className="mb-2" alt="logo" />
              </Link>
              <p className="mb-6">Please enter your user information.</p>
            </div>
            <Form onSubmit={handleSubmit}>
              <Form.Group className="mb-3" controlId="email">
                <Form.Label>Email</Form.Label>
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
                  placeholder="**************" 
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
              {error && <p className="text-danger mt-2">{error}</p>}
              {message && <p className="text-success mt-2">{message}</p>}
              <div className="d-md-flex justify-content-between mt-4">
                <Link href="/authentication/sign-up" className="fs-5">Don’t have an account? Sign Up</Link>
                <Link href="/authentication/forget-password" className="text-inherit fs-5">Forgot your password?</Link>
              </div>
            </Form>
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );
};

export default SignIn;
