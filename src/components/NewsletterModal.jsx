// src/components/NewsletterModal.jsx
import React, { useEffect, useState } from 'react';
import './newsletter.css';

export default function NewsletterModal({ isOpen = false }) {
  const [open, setOpen] = useState(isOpen);
  const [email, setEmail] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (localStorage.getItem('newsletterSubscribed') || localStorage.getItem('newsletterDeclined')) {
      setOpen(false);
    }
  }, []);

  const closeModal = () => setOpen(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      if (response.ok) {
        localStorage.setItem('newsletterSubscribed', 'true');
        alert('Thanks for subscribing!');
        closeModal();
      } else {
        throw new Error('Failed');
      }
    } catch {
      alert('Something went wrong. Try again later.');
    }
  };

  // Don't render anything on the server
  if (!mounted) return null;
  if (!open) return null;

  return (
    <div className="newsletter-modal" data-open={open} role="dialog">
      <div className="modal-content">
        <button className="close-button" onClick={closeModal} aria-label="Close">
          ✕
        </button>
        <h2 id="newsletter-title">Join The Book of Life Journey</h2>
        <p id="newsletter-description">Subscribe to receive new chapters and updates in your inbox.</p>
        <form onSubmit={handleSubmit} className="newsletter-form">
          <div className="input-group">
            <input
              type="email"
              name="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <button type="submit" className="submit-button">Subscribe</button>
          </div>
        </form>
        <p className="privacy-note">We respect your privacy. You can unsubscribe anytime.</p>
        <button className="no-thanks-button" onClick={() => {
          localStorage.setItem('newsletterDeclined', 'true');
          closeModal();
        }}>No Thanks</button>
      </div>
    </div>
  );
}
