'use client'; // Menandakan komponen ini menggunakan client-side rendering

import { useState } from 'react';
import Link from 'next/link';
import 'styles/theme.scss';

export default function RootLayout({ children }) {
  const [buttonPosition, setButtonPosition] = useState({
    top: 'auto',
    left: 'auto',
    bottom: '20px',
    right: '20px',
  });

  // Fungsi untuk menangani drag tombol dan menjaga agar tetap di dalam batas layar
  const handleDragEnd = (e) => {
    const buttonWidth = 60; // Ukuran tombol
    const buttonHeight = 60; // Ukuran tombol
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;

    // Menghitung posisi baru tombol dan memastikan tombol tetap dalam batas layar
    const newLeft = Math.max(0, Math.min(e.clientX - buttonWidth / 2, screenWidth - buttonWidth));
    const newTop = Math.max(0, Math.min(e.clientY - buttonHeight / 2, screenHeight - buttonHeight));

    setButtonPosition({ top: `${newTop}px`, left: `${newLeft}px`, bottom: 'auto', right: 'auto' });
  };

  return (
    <html lang="en">
      <body className="bg-light">
        {children}

        <Link
          href="https://bit.ly/3YoCCRH"
          target="_blank"
          className="btn btn-dark btn-float-button fs-4"
          style={buttonPosition}
          draggable
          onDragEnd={handleDragEnd}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.25"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="icon icon-tabler icons-tabler-outline icon-tabler-shopping-cart-share"
          >
            <path stroke="none" d="M0 0h24v24H0z" fill="none" />
            <path d="M4 19a2 2 0 1 0 4 0a2 2 0 0 0 -4 0" />
            <path d="M12.5 17h-6.5v-14h-2" />
            <path d="M6 5l14 1l-1 7h-13" />
            <path d="M16 22l5 -5" />
            <path d="M21 21.5v-4.5h-4.5" />
          </svg>{' '}
          Buy Now
        </Link>
      </body>
    </html>
  );
}
