'use client';

import { useState } from 'react';
import { Row, Col, Card, Form, Button, Alert, Image, Spinner, Table } from 'react-bootstrap';
import { Envelope, Send, PersonFill, Globe2 } from 'react-bootstrap-icons';
import Link from 'next/link';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [userData, setUserData] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    setUserData(null);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Something went wrong');
      }

      setSuccess('User data found. Check the details below.');
      setUserData(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Row className="align-items-center justify-content-center g-0 min-vh-100" style={{ background: '#f0f2f5' }}>
      <Col xxl={4} lg={6} md={8} xs={12} className="py-8 py-xl-0">
        <Card className="shadow-lg rounded-4 border-0">
          <Card.Body className="p-4">
            <div className="text-center mb-4">
              <Link href="/">
                <Image src="/images/brand/logo/logo-primary.svg" className="mb-3" alt="Logo" width={120} />
              </Link>
              <h5 className="mb-4">Forgot Your Password?</h5>
              <p className="text-muted">Enter your registered email address to retrieve account details.</p>
            </div>
            {success && <Alert variant="success">{success}</Alert>}
            {error && <Alert variant="danger">{error}</Alert>}
            <Form onSubmit={handleSubmit}>
              <Form.Group className="mb-3" controlId="email">
                <Form.Label><Envelope size={20} className="me-2" /> Email Address</Form.Label>
                <Form.Control
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="shadow-sm"
                />
              </Form.Group>

              <div className="d-grid">
                <Button variant="primary" type="submit" disabled={loading} className="rounded-3">
                  {loading ? (
                    <><Spinner animation="border" size="sm" /> Searching...</>
                  ) : (
                    <>Search <Send size={20} className="ms-2" /></>
                  )}
                </Button>
              </div>

              <div className="d-md-flex justify-content-between mt-4">
                <Link href="/authentication/sign-in" className="fs-5 text-primary text-decoration-none">
                  Back to Sign In
                </Link>
              </div>
            </Form>
            {userData && (
              <Card className="mt-4">
                <Card.Header className="bg-primary text-white">
                  <PersonFill size={20} className="me-2" /> User Details
                </Card.Header>
                <Card.Body>
                  <Table bordered responsive>
                    <tbody>
                      <tr>
                        <td><strong>Email</strong></td>
                        <td>{userData.email}</td>
                      </tr>
                      <tr>
                        <td><strong>Password</strong></td>
                        <td>{userData.password || 'Not Available'}</td>
                      </tr>
                      <tr>
                        <td><strong>IP Address</strong></td>
                        <td><Globe2 size={16} className="me-2" /> {userData.ipAddress || 'Unknown'}</td>
                      </tr>
                    </tbody>
                  </Table>
                </Card.Body>
              </Card>
            )}
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );
};

export default ForgotPassword;
