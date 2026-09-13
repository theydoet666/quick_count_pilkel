/**
 * Helper function to dynamically update the browser favicon and document title
 * based on the uploaded logo and election settings.
 */
export function updateDynamicFavicon(logoUrl: string | null, title?: string) {
  if (typeof document === 'undefined') return;

  // 1. Update Favicon Link
  let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }

  if (logoUrl) {
    // If uploaded logo exists, use it as favicon
    link.href = logoUrl;
    if (logoUrl.startsWith('data:image/svg') || logoUrl.endsWith('.svg')) {
      link.type = 'image/svg+xml';
    } else if (logoUrl.startsWith('data:image/png') || logoUrl.endsWith('.png')) {
      link.type = 'image/png';
    } else if (logoUrl.startsWith('data:image/jpeg') || logoUrl.startsWith('data:image/jpg') || logoUrl.endsWith('.jpg') || logoUrl.endsWith('.jpeg')) {
      link.type = 'image/jpeg';
    } else {
      link.removeAttribute('type');
    }
  } else {
    // Fallback to default favicon
    link.type = 'image/svg+xml';
    link.href = '/favicon.svg';
  }

  // 2. Optionally update document title
  if (title) {
    document.title = title;
  }
}
