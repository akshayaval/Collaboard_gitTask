// exportUtils.js — PNG and PDF export

import { compositeCanvases } from './drawingEngine'

/**
 * Export whiteboard canvases as PNG
 * @param {HTMLCanvasElement[]} canvases - ordered canvas layers
 * @param {string} [filename] - download filename
 */
export function exportPNG(canvases, filename = 'collaboard-export.png') {
  const width = canvases.find(Boolean)?.width || 1920
  const height = canvases.find(Boolean)?.height || 1080

  const composite = compositeCanvases(canvases, width, height)
  const dataUrl = composite.toDataURL('image/png')
  triggerDownload(dataUrl, filename)
}

/**
 * Export whiteboard canvases as PDF
 * @param {HTMLCanvasElement[]} canvases - ordered canvas layers
 * @param {string} [filename] - download filename
 */
export async function exportPDF(canvases, filename = 'collaboard-export.pdf') {
  const { jsPDF } = await import('jspdf')

  const width = canvases.find(Boolean)?.width || 1920
  const height = canvases.find(Boolean)?.height || 1080

  const composite = compositeCanvases(canvases, width, height)
  const dataUrl = composite.toDataURL('image/png')

  // Landscape orientation, auto units
  const orientation = width > height ? 'l' : 'p'
  const pdf = new jsPDF({
    orientation,
    unit: 'px',
    format: [width, height],
    hotfixes: ['px_scaling'],
  })

  pdf.addImage(dataUrl, 'PNG', 0, 0, width, height)
  pdf.save(filename)
}

function triggerDownload(dataUrl, filename) {
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}
