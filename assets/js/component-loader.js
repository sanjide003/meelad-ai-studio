// MeeladPulse Layout Component Dynamic Loader
export async function loadComponent(containerId, filePath) {
  const container = document.getElementById(containerId);
  if (!container) return;
  try {
    const response = await fetch(filePath);
    if (!response.ok) throw new Error(`Failed to load: ${filePath}`);
    const html = await response.text();
    container.innerHTML = html;
  } catch (error) {
    console.error(`Error rendering component ${containerId} from ${filePath}:`, error);
  }
}

export async function loadPortalLayout(role) {
  await Promise.all([
    loadComponent('portal-header', `/components/${role}-header.html`),
    loadComponent('portal-sidebar', `/components/${role}-sidebar.html`)
  ]);
}
