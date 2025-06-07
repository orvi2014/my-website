export function initNewsletterModal() {
  // Handle form submission
  const form = document.getElementById('newsletter-form') as HTMLFormElement;
  const modal = document.querySelector('.newsletter-modal') as HTMLElement | null;
  const closeButton = modal?.querySelector('.close-button');
  console.log('NewsletterModal Script: closeButton element found:', closeButton); // Added log to check element selection
  const noThanksButton = document.querySelector('.no-thanks-button');
  const emailInput = form?.querySelector('input[type="email"]') as HTMLInputElement;

  // Function to show modal
  function showModal() {
    if (modal) {
      modal.dataset.open = 'true';
      // Optional: trap focus inside modal
    }
  }

  // Function to hide modal
  function hideModal() {
    if (modal) {
      modal.dataset.open = 'false';
      // Optional: restore focus
    }
  }

  // Event listener for modal close button
  closeButton?.addEventListener('click', () => {
    console.log('NewsletterModal Script: Close button clicked');
    hideModal();
  });

  // Event listener for No Thanks button
  noThanksButton?.addEventListener('click', () => {
    console.log('NewsletterModal Script: No Thanks button clicked');
    // Set flag in local storage to prevent showing again
    localStorage.setItem('newsletterDeclined', 'true');
    hideModal();
  });

  // Close modal when clicking outside
  modal?.addEventListener('click', (event) => {
    if (event.target === modal) {
      console.log('NewsletterModal Script: Click outside modal');
      hideModal();
    }
  });

  // Close modal on Escape key
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modal?.dataset.open === 'true') {
      console.log('NewsletterModal Script: Escape key pressed');
      hideModal();
    }
  });

  // Handle form submission
  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    console.log('NewsletterModal Script: Form submitted');

    if (emailInput?.value) {
      try {
        const response = await fetch('/api/newsletter', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email: emailInput.value }),
        });

        if (response.ok) {
          alert('Successfully subscribed!');
          localStorage.setItem('newsletterSubscribed', 'true');
          hideModal();
        } else {
          const errorData = await response.json();
          alert(`Subscription failed: ${errorData.message || response.statusText}`);
        }
      } catch (error) {
        console.error('Newsletter subscription error:', error);
        alert('An error occurred during subscription.');
      }
    }
  });

  // Check local storage on page load and potentially show modal
  const newsletterSubscribed = localStorage.getItem('newsletterSubscribed');
  const newsletterDeclined = localStorage.getItem('newsletterDeclined');

  if (!newsletterSubscribed && !newsletterDeclined) {
    // Add a delay before showing the modal (e.g., 5 seconds)
    setTimeout(() => {
      showModal();
    }, 5000); // 5000 milliseconds = 5 seconds
  }
} 