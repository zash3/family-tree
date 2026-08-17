/** Serialize the tree <svg> to a PNG the browser can download. */
export async function svgToPngBlob(svg: SVGSVGElement, scale = 2): Promise<Blob> {
  const clone = svg.cloneNode(true) as SVGSVGElement
  const g = clone.querySelector('g')
  const box = (svg.querySelector('g') as SVGGElement).getBBox()
  const pad = 60
  const width = box.width + pad * 2
  const height = box.height + pad * 2
  g?.setAttribute('transform', `translate(${pad - box.x}, ${pad - box.y})`)
  clone.setAttribute('width', String(width))
  clone.setAttribute('height', String(height))
  clone.setAttribute('viewBox', `0 0 ${width} ${height}`)
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')

  // CSS custom properties do not survive serialization — inline the palette.
  const styles = getComputedStyle(document.documentElement)
  const vars = ['--color-node', '--color-female', '--color-female-ink', '--color-link']
  const style = document.createElementNS('http://www.w3.org/2000/svg', 'style')
  style.textContent = `svg{font-family:Tajawal,sans-serif;}:root{${vars
    .map((v) => `${v}:${styles.getPropertyValue(v).trim()}`)
    .join(';')}}`
  clone.insertBefore(style, clone.firstChild)

  const source = new XMLSerializer().serializeToString(clone)
  const url = URL.createObjectURL(new Blob([source], { type: 'image/svg+xml;charset=utf-8' }))
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = url
    })
    const canvas = document.createElement('canvas')
    canvas.width = Math.ceil(width * scale)
    canvas.height = Math.ceil(height * scale)
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#fbfaf6'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.scale(scale, scale)
    ctx.drawImage(image, 0, 0)
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('toBlob failed'))), 'image/png'),
    )
  } finally {
    URL.revokeObjectURL(url)
  }
}

export function download(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
