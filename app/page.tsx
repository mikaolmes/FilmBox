// It's good practice to use client components for interactivity in Next.js App Router
"use client";

import { useState } from 'react';

export default function HomePage() {
  const [message, setMessage] = useState("Welcome! Click the button.");

  const handleClick = () => {
    alert("Button clicked!");
    setMessage("You clicked the button! Great job with basic JavaScript interaction.");
  };

  return (
    <main style={{ padding: '20px', fontFamily: 'Arial, sans-serif', textAlign: 'center' }}>
      <h1>Basic JavaScript Frontend Page</h1>
      <p>{message}</p>
      <button 
        onClick={handleClick}
        style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer' }}
      >
        Click Me
      </button>
    </main>
  );
}