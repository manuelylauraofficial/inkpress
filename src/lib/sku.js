function slugPart(value = '', fallback = 'GEN') {
  const clean = String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()

  return clean.slice(0, 3) || fallback
}

function randomPart(length = 4) {
  return Math.random().toString(36).slice(2, 2 + length).toUpperCase()
}

export function generateSku({ category, name, color, size }) {
  const p1 = slugPart(category, 'PRD')
  const p2 = slugPart(name, 'ART')
  const p3 = slugPart(color, 'COL')
  const p4 = slugPart(size, 'UNI')
  const p5 = randomPart(4)

  return `${p1}-${p2}-${p3}-${p4}-${p5}`
}