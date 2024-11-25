'use client';

// import node module libraries
import { Row, Col, Card, Form, Button, Image } from 'react-bootstrap';
import Link from 'next/link';
import { useState } from 'react';

// import hooks
import useMounted from 'hooks/useMounted';

const ForgetPassword = () => {
  const hasMounted = useMounted();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      // Menggunakan metode GET untuk mengirimkan email
      const response = await fetch(`/api/auth/forgot-password?email=${encodeURIComponent(email)}`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error('Failed to send reset email');
      }

      const data = await response.json();
      setMessage(data.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Row className="align-items-center justify-content-center g-0 min-vh-100">
      <Col xxl={4} lg={6} md={8} xs={12} className="py-8 py-xl-0">
        {/* Card */}
        <Card className="smooth-shadow-md">
          {/* Card body */}
          <Card.Body className="p-6">
            <div className="mb-4">
              <Link href="/"><Image src="/images/brand/logo/logo-primary.svg" className="mb-2" alt="" /></Link>
              <p className="mb-6">Don&apos;t worry, we&apos;ll send you an email to reset your password.</p>
            </div>
            {/* Form */}
            {hasMounted && 
            <Form onSubmit={handleSubmit}>
              {/* Email */}
              <Form.Group className="mb-3" controlId="email">
                <Form.Label>Email</Form.Label>
                <Form.Control 
                  type="email" 
                  name="email" 
                  placeholder="Enter Your Email" 
                  required 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)} 
                />
              </Form.Group>
              {/* Button */}
              <div className="mb-3 d-grid">
                <Button variant="primary" type="submit" disabled={loading}>
                  {loading ? 'Sending...' : 'Reset Password'}
                </Button>
              </div>
              {error && <p className="text-danger mt-2">{error}</p>}
              {message && <p className="text-success mt-2">{message}</p>}
              <span>Don&apos;t have an account? <Link href="/authentication/sign-in">Sign In</Link></span>
            </Form>
            }
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );
};

export default ForgetPassword;