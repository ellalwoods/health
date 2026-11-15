/* Astra colour palettes (Settings → Colours).
 * Each palette sets the page colours, the accent, the three pain colours (mild → severe, light → dark)
 * and a list of symptom colours. Symptom classes take colours from `c` in order, so keep `c` at 16 entries.
 * Ids are saved in people's settings: don't rename them. */
window.ASTRA_PALETTES = [
  { id: 'bright', name: 'Bright', desc: 'Bold inks on white',
    bg: '#ffffff', card: '#f6f6f3', ink: '#1a1a1a', soft: '#6a6862', hair: '#e8e7e3', acc: '#f15060', btn: '#1a1a1a', btnFg: '#ffffff', bleed: '#fde3e6',
    sev: ['#f9b8ae', '#f2705f', '#c9182f'],
    c: ['#c83f78', '#ee6a8f', '#e48a3a', '#2f9fd6', '#765ba7', '#5f9474', '#e8608c', '#3255a4', '#159fae', '#a35d8f', '#00a95c', '#0078bf', '#1a1a1a', '#f15060', '#9a978f', '#e9b12c'] },
  { id: 'muted', name: 'Muted', desc: 'Dusty rose, sage and lavender',
    bg: '#fbf8f6', card: '#f3eeea', ink: '#3a3330', soft: '#857a74', hair: '#ebe3de', acc: '#c07a86', btn: '#3a3330', btnFg: '#ffffff', bleed: '#f5e1e3',
    sev: ['#efd0cf', '#d79a9c', '#a85a66'],
    c: ['#b86b7a', '#d39aa6', '#c99a72', '#7f9cb3', '#9a8ab8', '#86a68f', '#c98a95', '#6d7a9c', '#7fa9a8', '#b08fae', '#a6ae7c', '#8aa3c4', '#5a514c', '#a85a66', '#b6aaa3', '#c4a484'] },
  { id: 'spring', name: 'Spring', desc: 'Blossom pink and fresh green',
    bg: '#fbfdf9', card: '#f0f6ee', ink: '#24312a', soft: '#6c7a70', hair: '#e3ece0', acc: '#ec6f9b', btn: '#2f7d5b', btnFg: '#ffffff', bleed: '#fde3ee',
    sev: ['#ffd1e0', '#f78fb3', '#d1497c'],
    c: ['#e8578f', '#ff8fb8', '#f2a03d', '#4aa8e0', '#a07ce0', '#3fb47a', '#f06ba8', '#5a78d6', '#2fbfb0', '#c77fd1', '#9acb3c', '#4f96e8', '#2f4a3c', '#d1497c', '#a3b0a6', '#f5c94c'] },
  { id: 'summer', name: 'Summer', desc: 'Coral, mango and turquoise',
    bg: '#fffaf3', card: '#fdf0e2', ink: '#2d2420', soft: '#7e6f66', hair: '#f1e3d3', acc: '#ff6f61', btn: '#ff6f61', btnFg: '#ffffff', bleed: '#ffe1dc',
    sev: ['#ffd3a6', '#ff9a5c', '#e5484d'],
    c: ['#e5484d', '#ff7eb6', '#ffa62b', '#1fa2c9', '#8f63d2', '#18a999', '#ff8a5b', '#3b6fd8', '#00c2c7', '#c26fd1', '#7cc242', '#2e8ee6', '#3a2b22', '#e5484d', '#b3a397', '#ffd23f'] },
  { id: 'pastel', name: 'Pastel', desc: 'Soft candy on lilac-white',
    bg: '#fbf9ff', card: '#f1edfa', ink: '#3b3450', soft: '#7c7590', hair: '#e6e1f2', acc: '#9b7fe6', btn: '#9b7fe6', btnFg: '#ffffff', bleed: '#fde4ee',
    sev: ['#ffd9e4', '#f9a8c3', '#e46a9a'],
    c: ['#f48fb1', '#ffadc9', '#ffb385', '#8ec5ff', '#b9a2ff', '#8fd6b4', '#ff9ec7', '#9aa8ff', '#7fd8e0', '#d7a6e8', '#b8df8a', '#7fb6f0', '#6d6487', '#e46a9a', '#c5bfd4', '#ffd98a'] },
  { id: 'night', name: 'Night', desc: 'Dark, with a gold star',
    bg: '#121626', card: '#1c2236', ink: '#eef0f8', soft: '#9aa1bb', hair: '#2a3150', acc: '#f5c451', btn: '#f5c451', btnFg: '#121626', bleed: '#3a2034',
    sev: ['#5b4a7a', '#c66a9a', '#ff8a8a'],
    c: ['#ff7aa2', '#ff9ad5', '#ffb066', '#6cc6ff', '#b49bff', '#6fe0b0', '#ff8fb8', '#8ea2ff', '#5fe3e3', '#e0a3ff', '#b6e36a', '#7ab8ff', '#d6d9e8', '#ff8a8a', '#7a819b', '#f5c451'] },
];
