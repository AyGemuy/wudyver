'use client';

// import node module libraries
import { Row, Col, Card, Form, Button, Image } from 'react-bootstrap';
import Link from 'next/link';
import { useState } from 'react';

// import hooks
import useMounted from 'hooks/useMounted';

const ResetPassword = () => {
  const hasMounted = useMounted();
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      // Menggunakan metode GET untuk mengatur ulang password
      const response = await fetch(`/api/auth/reset-password?email=${encodeURIComponent(email)}&newPassword=${encodeURIComponent(newPassword)}`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error('Failed to reset password');
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
              <p className="mb-6">Please enter your new password.</p>
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
              {/* New Password */}
              <Form.Group className="mb-3" controlId="newPassword">
                <Form.Label>New Password</Form.Label>
                <Form.Control 
                  type="password" 
                  name="newPassword" 
                  placeholder="Enter New Password" 
                  required 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)} 
                />
              </Form.Group>
              {/* Button */}
              <div className="mb-3 d-grid">
                <Button variant="primary" type="submit" disabled={loading}>
                  {loading ? 'Resetting...' : 'Reset Password'}
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

export default ResetPassword;