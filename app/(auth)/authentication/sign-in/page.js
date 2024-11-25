'use client';

// import node module libraries
import { Row, Col, Card, Form, Button, Image } from 'react-bootstrap';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import axios from 'axios';

// import hooks
import useMounted from 'hooks/useMounted';

const SignIn = () => {
  const hasMounted = useMounted();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await axios.get(`/api/auth/signin?email=${email}&password=${password}`);
      setMessage(response.data.message);

      // Mengecek apakah status 200 dan user ada dalam response
      if (response.data.status === 200) {
        // Redirect ke halaman utama setelah login berhasil
        window.location.href = '/';
      } else {
        // Jika login gagal, beri pesan kesalahan
        setError('Login failed. User not found.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'An error occurred');
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
              <p className="mb-6">Please enter your user information.</p>
            </div>
            {/* Form */}
            {hasMounted &&
              <Form onSubmit={handleSubmit}>
                {/* Email */}
                <Form.Group className="mb-3" controlId="username">
                  <Form.Label>Username or email</Form.Label>
                  <Form.Control 
                    type="email" 
                    name="username" 
                    placeholder="Enter address here" 
                    required 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)} 
                  />
                </Form.Group>

                {/* Password */}
                <Form.Group className="mb-3" controlId="password">
                  <Form.Label>Password</Form.Label>
                  <Form.Control 
                    type="password" 
                    name="password" 
                    placeholder="**************" 
                    required 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)} 
                  />
                </Form.Group>

                {/* Checkbox */}
                <div className="d-lg-flex justify-content-between align-items-center mb-4">
                  <Form.Check type="checkbox" id="rememberme">
                    <Form.Check.Input type="checkbox" />
                    <Form.Check.Label>Remember me</Form.Check.Label>
                  </Form.Check>
                </div>
                <div>
                  {/* Button */}
                  <div className="d-grid">
                    <Button variant="primary" type="submit" disabled={loading}>
                      {loading ? 'Signing In...' : 'Sign In'}
                    </Button>
                  </div>
                  {error && <p className="text-danger mt-2">{error}</p>}
                  {message && <p className="text-success mt-2">{message}</p>}
                  <div className="d-md-flex justify-content-between mt-4">
                    <div className="mb-2 mb-md-0">
                      <Link href="/authentication/sign-up" className="fs-5">Create An Account</Link>
                    </div>
                    <div>
                      <Link href="/authentication/forgot-password" className="text-inherit fs-5">Forgot your password?</Link>
                    </div>
                  </div>
                </div>
              </Form>}
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );
};

export default SignIn;
