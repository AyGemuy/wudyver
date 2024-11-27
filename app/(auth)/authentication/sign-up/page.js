'use client';

// import node module libraries
import { Row, Col, Card, Form, Button, Image } from 'react-bootstrap';
import Link from 'next/link';
import { useState, useEffect } from 'react';

// import hooks
import useMounted from 'hooks/useMounted';

const SignUp = () => {
  const hasMounted = useMounted();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Middleware untuk cek status login
  useEffect(() => {
    const checkLoginStatus = async () => {
      const loggedUserEmail = localStorage.getItem('loggedUserEmail');
      const loginTime = localStorage.getItem('loginTime');
      
      if (loggedUserEmail && loginTime) {
        const currentTime = new Date().getTime();
        const timeDifference = currentTime - loginTime;

        // Jika sudah lebih dari 1 hari, logout
        if (timeDifference > 24 * 60 * 60 * 1000) {
          localStorage.removeItem('loggedUserEmail');
          localStorage.removeItem('loginTime');
          window.location.href = '/authentication/sign-in';
          return;
        }

        // Redirect ke halaman yang diminta sebelumnya
        const redirectUrl = localStorage.getItem('redirectUrl') || '/';
        window.location.href = redirectUrl;
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
      // Menggunakan metode GET untuk mengirimkan data
      const response = await fetch(`/api/auth/sign-up?email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error('Failed to sign up');
      }

      const data = await response.json();
      setMessage(data.message);

      // Jika berhasil sign up, arahkan ke halaman sign-in
      if (data.status === 201) {
        setTimeout(() => {
          window.location.href = '/authentication/sign-in'; // Redirect ke halaman sign-in setelah sign-up berhasil
        }, 2000); // Menunggu 2 detik sebelum redirect
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
              <Form.Group className="mb-3" controlId="email">
                <Form.Label>Email</Form.Label>
                <Form.Control 
                  type="email" 
                  name="email" 
                  placeholder="Enter your email" 
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

              <div>
                {/* Button */}
                <div className="d-grid">
                  <Button variant="primary" type="submit" disabled={loading}>
                    {loading ? 'Creating Account...' : 'Create Free Account'}
                  </Button>
                </div>
                {error && <p className="text-danger mt-2">{error}</p>}
                {message && <p className="text-success mt-2">{message}</p>}
                <div className="d-md-flex justify-content-between mt-4">
                  <div className="mb-2 mb-md-0">
                    <Link href="/authentication/sign-in" className="fs-5">Already a member? Login</Link>
                  </div>
                  <div>
                    <Link href="/authentication/forget-password" className="text-inherit fs-5">Forgot your password?</Link>
                  </div>
                </div>
              </div>
            </Form>
            }
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );
};

export default SignUp;
