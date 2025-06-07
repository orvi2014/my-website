export function initShareButtons() {
  document.addEventListener('click', async (event) => {
    const target = event.target as HTMLElement;
    if (target.classList.contains('share-button')) {
      const shareType = target.dataset.share;
      const pageUrl = window.location.href;
      const pageTitle = document.title;

      switch (shareType) {
        case 'twitter':
          window.open(`https://twitter.com/intent/tweet/?url=${encodeURIComponent(pageUrl)}&text=${encodeURIComponent(pageTitle)}`, '_blank');
          break;
        case 'linkedin':
          window.open(`https://www.linkedin.com/shareArticle/?url=${encodeURIComponent(pageUrl)}&title=${encodeURIComponent(pageTitle)}`, '_blank');
          break;
        case 'copy':
          try {
            await navigator.clipboard.writeText(pageUrl);
            alert('Link copied to clipboard!');
          } catch (err) {
            console.error('Failed to copy: ', err);
          }
          break;
        // Add more cases for other platforms here
      }
    }
  });
} 