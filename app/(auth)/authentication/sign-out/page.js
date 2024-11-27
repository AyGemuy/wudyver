'use client';

// import node module libraries
import { Button } from 'react-bootstrap';

const SignOut = () => {

  const handleSignOut = () => {
    // Hapus data login dari localStorage
    localStorage.removeItem('loggedUserEmail');
    localStorage.removeItem('loginTime');

    // Redirect ke halaman sign-in setelah logout
    window.location.href = '/authentication/sign-in';
  };

  return (
    <div className="d-flex justify-content-center mt-4">
      <Button variant="danger" onClick={handleSignOut}>
        Sign Out
      </Button>
    </div>
  );
};

export default SignOut;
