// Generates the PWA / iOS home-screen icons into public/.
// Pure Node (zlib only) so it needs no image dependency: we rasterise a few
// circles and lines into an RGBA buffer and encode a PNG by hand.
// Run with: node scripts/make-icons.mjs
import { deflateSync } from 'node:zlib'
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public')

const NAVY = [0x17, 0x3b, 0x7c]
const CREAM = [0xfb, 0xfa, 0xf6]
const PINK = [0xf3, 0xbe, 0xdc]
const RED = [0xc8, 0x10, 0x2e]

/** Anti-aliased coverage of a disc at pixel centre (x, y). */
const discCoverage = (x, y, cx, cy, r) => {
  const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy)
  return clamp01(r + 0.5 - d)
}

/** Anti-aliased coverage of a thick segment from (x1,y1) to (x2,y2). */
const segCoverage = (x, y, x1, y1, x2, y2, half) => {
  const px = x + 0.5 - x1
  const py = y + 0.5 - y1
  const vx = x2 - x1
  const vy = y2 - y1
  const len2 = vx * vx + vy * vy
  const t = len2 === 0 ? 0 : clamp01((px * vx + py * vy) / len2)
  const d = Math.hypot(px - vx * t, py - vy * t)
  return clamp01(half + 0.5 - d)
}

const clamp01 = (n) => (n < 0 ? 0 : n > 1 ? 1 : n)

function render(size, { padded }) {
  const px = new Uint8Array(size * size * 4)
  // Maskable icons get cropped to a circle on some launchers, so keep the
  // artwork inside the middle 80% and let the background bleed to the edge.
  const inset = padded ? size * 0.1 : 0
  const s = size - inset * 2
  const at = (fx, fy) => [inset + fx * s, inset + fy * s]

  const shapes = []
  const bg = padded ? NAVY : NAVY

  // trunk lines first (drawn under the nodes)
  const [rx, ry] = at(0.5, 0.26)
  const [lx, ly] = at(0.24, 0.74)
  const [mx, my] = at(0.5, 0.74)
  const [gx, gy] = at(0.76, 0.74)
  const busY = inset + 0.52 * s
  const line = s * 0.035
  shapes.push({ seg: [rx, ry, rx, busY], half: line, color: CREAM })
  shapes.push({ seg: [lx, busY, gx, busY], half: line, color: CREAM })
  shapes.push({ seg: [lx, busY, lx, ly], half: line, color: CREAM })
  shapes.push({ seg: [mx, busY, mx, my], half: line, color: CREAM })
  shapes.push({ seg: [gx, busY, gx, gy], half: line, color: CREAM })

  shapes.push({ disc: [rx, ry, s * 0.13], color: RED })
  shapes.push({ disc: [lx, ly, s * 0.1], color: CREAM })
  shapes.push({ disc: [mx, my, s * 0.1], color: PINK })
  shapes.push({ disc: [gx, gy, s * 0.1], color: CREAM })

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let [r, g, b] = bg
      for (const shape of shapes) {
        const a = shape.disc
          ? discCoverage(x, y, ...shape.disc)
          : segCoverage(x, y, ...shape.seg, shape.half)
        if (a <= 0) continue
        r = r + (shape.color[0] - r) * a
        g = g + (shape.color[1] - g) * a
        b = b + (shape.color[2] - b) * a
      }
      const i = (y * size + x) * 4
      px[i] = r
      px[i + 1] = g
      px[i + 2] = b
      px[i + 3] = 255
    }
  }
  return px
}

function encodePng(size, rgba) {
  const stride = size * 4
  const raw = Buffer.alloc((stride + 1) * size)
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0 // filter: none
    Buffer.from(rgba.buffer, y * stride, stride).copy(raw, y * (stride + 1) + 1)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // colour type: RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body) >>> 0, 0)
  return Buffer.concat([len, body, crc])
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})

function crc32(buf) {
  let c = 0xffffffff
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8)
  return c ^ 0xffffffff
}

const targets = [
  { file: 'icon-192.png', size: 192, padded: true },
  { file: 'icon-512.png', size: 512, padded: true },
  // iOS ignores the manifest icons and always squares off the touch icon,
  // so this one fills the whole canvas.
  { file: 'apple-touch-icon.png', size: 180, padded: false },
]

for (const { file, size, padded } of targets) {
  writeFileSync(join(OUT, file), encodePng(size, render(size, { padded })))
  console.log(`wrote public/${file} (${size}×${size})`)
}
