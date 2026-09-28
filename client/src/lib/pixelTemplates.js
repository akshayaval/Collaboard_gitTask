// pixelTemplates.js — Built-in pixel art templates

export const TEMPLATES = {
  mandala: {
    id: 'mandala',
    name: 'Mandala',
    cols: 20,
    rows: 20,
    palette: [
      { number: 1, color: '#2563EB', label: 'Cobalt Blue' },
      { number: 2, color: '#60A5FA', label: 'Sky Blue' },
      { number: 3, color: '#A78BFA', label: 'Lavender' },
      { number: 4, color: '#F472B6', label: 'Pink' },
      { number: 5, color: '#FB923C', label: 'Orange' },
      { number: 6, color: '#FBBF24', label: 'Amber' },
      { number: 7, color: '#34D399', label: 'Emerald' },
      { number: 8, color: '#F1F5F9', label: 'White' },
    ],
    cells: generateMandala(),
  },
  landscape: {
    id: 'landscape',
    name: 'Sunset Landscape',
    cols: 24,
    rows: 16,
    palette: [
      { number: 1, color: '#1E1B4B', label: 'Night Sky' },
      { number: 2, color: '#3730A3', label: 'Deep Blue' },
      { number: 3, color: '#7C3AED', label: 'Purple' },
      { number: 4, color: '#EC4899', label: 'Sunset Pink' },
      { number: 5, color: '#F97316', label: 'Orange' },
      { number: 6, color: '#FCD34D', label: 'Gold' },
      { number: 7, color: '#064E3B', label: 'Dark Green' },
      { number: 8, color: '#059669', label: 'Green' },
      { number: 9, color: '#1D4ED8', label: 'Lake Blue' },
    ],
    cells: generateLandscape(),
  },
  animal: {
    id: 'animal',
    name: 'Pixel Fox',
    cols: 16,
    rows: 16,
    palette: [
      { number: 1, color: '#EA580C', label: 'Fox Orange' },
      { number: 2, color: '#F97316', label: 'Light Orange' },
      { number: 3, color: '#F9FAFB', label: 'White' },
      { number: 4, color: '#111827', label: 'Black' },
      { number: 5, color: '#6B7280', label: 'Gray' },
      { number: 6, color: '#1D4ED8', label: 'Blue Eyes' },
    ],
    cells: generateFox(),
  },
}

function generateMandala() {
  const cols = 20, rows = 20
  const cx = 9.5, cy = 9.5
  const cells = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const dx = c - cx, dy = r - cy
      const dist = Math.sqrt(dx * dx + dy * dy)
      const angle = Math.atan2(dy, dx)
      const sector = Math.floor(((angle + Math.PI) / (Math.PI * 2)) * 8)
      let number = 0
      if (dist < 1.2) number = 8
      else if (dist < 2.5) number = 1
      else if (dist < 3.5) { number = sector % 2 === 0 ? 2 : 3 }
      else if (dist < 5) { number = sector % 3 === 0 ? 4 : sector % 3 === 1 ? 5 : 6 }
      else if (dist < 6.5) { number = sector % 2 === 0 ? 7 : 3 }
      else if (dist < 8) { number = sector % 4 === 0 ? 1 : sector % 4 === 1 ? 2 : sector % 4 === 2 ? 4 : 6 }
      else if (dist < 9.5) { number = sector % 2 === 0 ? 5 : 7 }
      cells.push({ id: r * cols + c, row: r, col: c, number })
    }
  }
  return cells
}

function generateLandscape() {
  const cols = 24, rows = 16
  const cells = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      let number = 0
      // Sky gradient
      if (r < 4) number = r === 0 ? 1 : r === 1 ? 2 : r === 2 ? 3 : 4
      else if (r < 6) number = 5
      else if (r < 7) number = 6
      // Mountains
      else if (r < 10) {
        const peak1 = Math.abs(c - 6) < (r - 6) * 1.5
        const peak2 = Math.abs(c - 18) < (r - 6) * 1.2
        number = (peak1 || peak2) ? 7 : 8
      }
      // Lake/water
      else if (r < 12) { number = c > 6 && c < 18 ? 9 : 8 }
      // Ground
      else number = r === rows - 1 ? 7 : 8
      cells.push({ id: r * cols + c, row: r, col: c, number })
    }
  }
  return cells
}

function generateFox() {
  const cols = 16, rows = 16
  // Pixel art fox pattern (simplified)
  const pattern = [
    '0000000000000000',
    '0000011110000000',
    '0000100001000000',
    '0001000000100000',
    '0010133310010000',
    '0010122210010000',
    '0011166110110000',
    '0001100011000000',
    '0000111110000000',
    '0001133110000000',
    '0001333110000000',
    '0001133110000000',
    '0001000110000000',
    '0001000010000000',
    '0001100011000000',
    '0000000000000000',
  ]
  const cells = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const ch = pattern[r]?.[c] || '0'
      const number = parseInt(ch, 10)
      cells.push({ id: r * cols + c, row: r, col: c, number })
    }
  }
  return cells
}

export function getTemplate(id) {
  return TEMPLATES[id] || TEMPLATES.mandala
}

export const TEMPLATE_LIST = Object.values(TEMPLATES).map(t => ({ id: t.id, name: t.name }))
