'use client';

import { useState } from 'react';
import { Row, Col, Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import Link from 'next/link';

const ResetPassword = () => {
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);

    try {
      const response = await fetch(`/api/auth/reset-password?email=${encodeURIComponent(email)}&newPassword=${encodeURIComponent(newPassword)}`, {
        method: 'GET',
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.message || 'An error occurred.');
      } else {
        setSuccess(true);
      }
    } catch {
      setError('Failed to connect to the server.');
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
              <h3 className="mb-2">Reset Password</h3>
              <p className="mb-6">Enter your email and new password.</p>
            </div>
            <Form onSubmit={handleResetPassword}>
              {error && <Alert variant="danger">{error}</Alert>}
              {success && (
                <Alert variant="success">
                  Your password has been reset successfully. You can now{' '}
                  <Link href="/authentication/sign-in">sign in</Link>.
                </Alert>
              )}
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
              <Form.Group className="mb-3" controlId="newPassword">
                <Form.Label>New Password</Form.Label>
                <Form.Control
                  type="password"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </Form.Group>
              <div className="d-grid">
                <Button variant="primary" type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      Resetting Password...
                    </>
                  ) : (
                    'Reset Password'
                  )}
                </Button>
              </div>
              <div className="d-md-flex justify-content-between mt-4">
                <div>
                  <Link href="/authentication/sign-in" className="fs-5">
                    Back to Sign In
                  </Link>
                </div>
              </div>
            </Form>
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );
};

export default ResetPassword;
