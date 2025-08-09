import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

export default function NewsletterModal() {
  const [showModal, setShowModal] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [status, setStatus] = useState(null); // null, 'success', 'error'
  const [showToast, setShowToast] = useState(false);
  const [subscriberCount, setSubscriberCount] = useState(0);
  const [error, setError] = useState(null);

  useEffect(() => {
    setMounted(true);
    // Newsletter modal no longer auto-opens from homepage CTA
  }, []);

  useEffect(() => {
    const fetchSubscriberCount = async () => {
      try {
        const res = await fetch('/api/subscriber-count');
        const data = await res.json();
        if (res.ok) {
          setSubscriberCount(data.count);
        } else {
          console.error('Failed to fetch subscriber count:', data.error);
        }
      } catch (err) {
        console.error('Error fetching subscriber count:', err);
      }
    };

    fetchSubscriberCount();
  }, []);

  const handleCloseModal = () => {
    setIsRedirecting(true);
    localStorage.setItem('hasInteractedWithNewsletter', 'true');
    window.location.href = '/chapters';
  };

  const handleSubscribe = async (e) => {
    e.preventDefault();
    if (!email) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/newsletter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to subscribe');
      }

      // Set localStorage before closing modal
      localStorage.setItem('newsletterSubscribed', 'true');
      localStorage.setItem('subscriberEmail', email);
      
      // Update subscriber count
      setSubscriberCount(prev => prev + 1);
      
      // Close modal after successful subscription
      handleCloseModal();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNoThanks = () => {
    // Set localStorage before redirecting
    localStorage.setItem('newsletterSubscribed', 'false');
    localStorage.setItem('subscriberEmail', '');
    
    // Redirect to chapters
    window.location.href = '/chapters';
  };

  const getMessageClass = () =>
    status === 'success' ? 'text-green-600' : status === 'error' ? 'text-red-500' : '';

  if (!mounted) return null;

  return (
    <>
      {showToast && (
        <div style={{
          position: 'fixed',
          top: '2rem',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'var(--color-success, #16a34a)',
          color: '#fff',
          padding: '1rem 2rem',
          borderRadius: '0.75rem',
          boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
          zIndex: 10000,
          fontWeight: 600,
          fontSize: '1.1rem',
        }}>
          ✅ You're in! Welcome aboard.
        </div>
      )}
      {createPortal(
        showModal && (
          <div
            style={{
              position: 'fixed',
              top: '0',
              left: '0',
              right: '0',
              bottom: '0',
              width: '100vw',
              height: '100vh',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(0, 0, 0, 0.4)',
              backdropFilter: 'blur(3px)',
              zIndex: 9999
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              style={{
                fontFamily: 'var(--font-body)',
                background: 'var(--color-bg-card, #fff)',
                color: 'var(--color-text-main, #222)',
                borderRadius: '1.25rem',
                border: '1.5px solid var(--color-border, #e5e7eb)',
                boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
                padding: '2.5rem 1.5rem',
                width: '100%',
                maxWidth: '370px',
                margin: '0 auto',
                textAlign: 'center',
                position: 'relative',
              }}
            >
              <button
                onClick={handleCloseModal}
                disabled={isRedirecting}
                style={{
                  position: 'absolute',
                  top: '1.2rem',
                  right: '1.2rem',
                  color: 'var(--color-border, #b0b0b0)',
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: isRedirecting ? 'not-allowed' : 'pointer',
                  transition: 'color 0.2s',
                  opacity: isRedirecting ? 0.5 : 1,
                }}
                aria-label="Close newsletter modal"
              >
                ×
              </button>

              <h2 style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.6rem',
                fontWeight: 700,
                margin: '1.2rem 0 0.7rem 0',
                color: 'var(--color-text-main, #222)',
                letterSpacing: '-0.01em',
              }}>
                Join the Journey
              </h2>
              <p style={{
                fontSize: '1rem',
                marginBottom: '1.5rem',
                color: 'var(--color-text-secondary, #555)',
                lineHeight: 1.6,
              }}>
                Beautiful ideas. Secret chapters. Unsent letters from a thinking mind. Delivered (just) when you need them most.
              </p>
              <p style={{
                fontSize: '0.9rem',
                marginBottom: '1.5rem',
                color: 'var(--color-text-secondary, #555)',
                fontStyle: 'italic',
              }}>
                Join {subscriberCount}+ readers
              </p>

              <form onSubmit={handleSubscribe} style={{ width: '100%', textAlign: 'left' }}>
                <label htmlFor="email" style={{
                  display: 'block',
                  fontSize: '0.97rem',
                  fontWeight: 500,
                  color: 'var(--color-text-main, #222)',
                  marginBottom: '0.3rem',
                }}>
                  Where should I send your next chapter?
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSubmitting || isRedirecting}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '0.6rem 0.9rem',
                    marginBottom: '1rem',
                    border: status === 'error' ? '1.5px solid #f87171' : '1.5px solid var(--color-border, #e5e7eb)',
                    borderRadius: '0.5rem',
                    fontSize: '1rem',
                    color: 'var(--color-text-main, #222)',
                    background: 'var(--color-bg, #fafbfc)',
                    outline: 'none',
                    boxShadow: '0 1px 2px 0 rgba(0,0,0,0.01)',
                    transition: 'border 0.2s',
                    opacity: isRedirecting ? 0.5 : 1,
                  }}
                />

                <button
                  type="submit"
                  disabled={isSubmitting || !email || isRedirecting}
                  style={{
                    width: '100%',
                    padding: '0.7rem 0',
                    fontSize: '1rem',
                    fontWeight: 600,
                    borderRadius: '0.5rem',
                    border: 'none',
                    background: isSubmitting || isRedirecting ? 'var(--color-border, #e5e7eb)' : 'var(--accent-color, #e53e3e)',
                    color: isSubmitting || isRedirecting ? 'var(--color-text-secondary, #888)' : '#fff',
                    cursor: isSubmitting || isRedirecting ? 'not-allowed' : 'pointer',
                    transition: 'background 0.2s',
                    marginBottom: '0.5rem',
                  }}
                >
                  {isSubmitting ? 'Subscribing...' : 'Subscribe & Continue'}
                </button>

                {status === 'error' && message && (
                  <p
                    style={{
                      marginTop: '0.7rem',
                      textAlign: 'center',
                      fontSize: '0.97rem',
                      color: 'var(--color-error, #dc2626)',
                      transition: 'color 0.2s',
                    }}
                    role="alert"
                  >
                    {message}
                  </p>
                )}
              </form>

              <button
                onClick={handleNoThanks}
                disabled={isRedirecting}
                style={{
                  marginTop: '1.2rem',
                  fontSize: '0.97rem',
                  color: 'var(--color-text-secondary, #888)',
                  background: 'none',
                  border: 'none',
                  cursor: isRedirecting ? 'not-allowed' : 'pointer',
                  textDecoration: 'underline',
                  transition: 'color 0.2s',
                  opacity: isRedirecting ? 0.5 : 1,
                }}
              >
                {isRedirecting ? 'Redirecting...' : 'No thanks, I prefer the mystery'}
              </button>
            </div>
          </div>
        ),
        document.getElementById('modal-root') || document.body
      )}
    </>
  );
}
