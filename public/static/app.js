// =====================================================================
//  Mesh Cleanliness Inspector v3 — Dual-Mode Analysis Engine
//  Mode A (standard): hole-based CC labeling for meshes with visible holes
//  Mode B (fine-mesh): cell-based density analysis for ultra-fine meshes
//    with honeycomb support structure
//  Auto-detects mode via FFT periodicity analysis
// =====================================================================

/* ---------- default metrics ---------- */
const defaultMetrics = () => ({
  totalHoles: 0,
  cleanedHoles: 0,
  blockedHoles: 0,
  excludedHoles: 0,
  cleaningRateHole: 0,
  validAreaPercent: 100,
  sharpnessScore: 0,
  saturationPercent: 0,
  qualityGate: 'pass', // pass | warning | fail
  qualityReasons: [],
  gridPitchX: 0,
  gridPitchY: 0,
  roiHoleCols: 0,
  roiHoleRows: 0,
  // Fine-mesh mode metrics
  analysisMode: 'standard',  // 'standard' | 'fine-mesh'
  fftPitch: 0,               // detected FFT periodicity
  totalCells: 0,
  cleanedCells: 0,
  blockedCells: 0,
  excludedCells: 0,
  avgDensity: 0,             // average dark-pixel density across cells
})

/* ---------- state ---------- */
const state = {
  image: null,
  imageBitmap: null,
  results: null,        // [{id,x,y,radius,status,median,excluded,…}]
  cells: null,          // fine-mesh mode: [{id,cx,cy,radius,density,status,pixelCount,darkCount,…}]
  analysisMode: 'standard', // 'standard' | 'fine-mesh'
  highlightMask: null,  // Uint8Array  0/255
  grayOrig: null,       // original grayscale for reclassification
  corrected: null,      // flat-field corrected for reclassification
  imageWidth: 0,
  imageHeight: 0,
  title: '',
  cameraStream: null,
  lastObjectUrl: null,
  thresholds: {
    dark: 80,            // ≤ dark → cleaned
    gray: 145,           // ≤ gray → blocked (>gray → excluded by color)
    areaPercentile: 50,
  },
  // NEW v2 settings
  highlight: {
    enabled: true,
    threshold: 245,
    dilate: 5,
  },
  validAreaMin: 70,       // percent
  roiGrid: {
    enabled: false,
    cols: 20,
    rows: 20,
    preset: '20x20',
  },
  metrics: defaultMetrics(),
  isAnalyzing: false,
  pendingReanalysis: false,
  roi: null,
  selectingROI: false,
  selectionStart: null,
  selectionPreview: null,
  currentInspectionId: null,
  autoSaved: false,
  multiCapture: { isCapturing: false, capturedImages: [], analysisResults: [], currentShot: 0, totalShots: 4 },
}

const elements = {}

// ===================== UTILITY =====================

const log = (message, level = 'info') => {
  if (!elements.logPanel) return
  const ts = new Date().toLocaleTimeString('ko-KR', { hour12: false })
  const line = document.createElement('div')
  line.className = `flex items-start gap-2 ${level === 'error' ? 'text-rose-600' : level === 'warning' ? 'text-amber-600' : 'text-slate-700'}`
  line.innerHTML = `<span class="text-slate-400 shrink-0">${ts}</span><span>${message}</span>`
  elements.logPanel.prepend(line)
}

const formatTimestampLabel = (d = new Date()) =>
  d.toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
    .replace(/\./g, '-').replace('- ', ' ')

const applyInspectionTitle = (t) => { state.title = t; if (elements.titleInput) elements.titleInput.value = t }
const ensureInspectionTitle = () => {
  if (state.title?.trim()) return state.title
  const f = `청소 검사 ${formatTimestampLabel()}`
  applyInspectionTitle(f)
  return f
}
const clearInspectionTitle = () => { state.title = ''; if (elements.titleInput) elements.titleInput.value = '' }

// ===================== CANVAS LAYOUT =====================

const applyCanvasLayout = (w, h) => {
  const { canvasWrapper, meshCanvas, overlayCanvas } = elements
  if (!meshCanvas) return
  if (canvasWrapper) canvasWrapper.style.aspectRatio = `${w} / ${h}`
  meshCanvas.width = w; meshCanvas.height = h; meshCanvas.style.width = '100%'; meshCanvas.style.height = '100%'
  if (overlayCanvas) { overlayCanvas.width = w; overlayCanvas.height = h; overlayCanvas.style.width = '100%'; overlayCanvas.style.height = '100%' }
}
const resetCanvasLayout = () => {
  const { canvasWrapper, meshCanvas, overlayCanvas } = elements
  if (canvasWrapper) canvasWrapper.style.removeProperty('aspect-ratio')
  ;[meshCanvas, overlayCanvas].forEach(c => { if (c) { c.width = 0; c.height = 0; c.style.removeProperty('width'); c.style.removeProperty('height') } })
}

// ===================== UI HELPERS =====================

const updateOverlayInteraction = () => {
  const ov = elements.overlayCanvas
  if (ov) ov.style.cursor = state.selectingROI ? 'crosshair' : 'default'
}

const setActionButtons = ({ analyze, reset, save }) => {
  if (elements.analyzeButton) elements.analyzeButton.disabled = !analyze
  if (elements.resetButton) elements.resetButton.disabled = !reset
  if (elements.saveInspection) elements.saveInspection.disabled = !save
  if (elements.downloadOverlayButton) elements.downloadOverlayButton.disabled = !save
  if (elements.exportJsonButton) elements.exportJsonButton.disabled = !save
  if (elements.exportCsvButton) elements.exportCsvButton.disabled = !save
  updateOverlayInteraction()
}

const resetStats = () => {
  state.metrics = defaultMetrics()
  const ids = ['totalHoles','cleanedHoles','blockedHoles','excludedHoles','cleaningRateHole','validAreaPercent','sharpnessDisplay','saturationDisplay','roiGridInfo']
  ids.forEach(id => { const el = document.getElementById(id); if (el) el.textContent = '—' })
  const qg = document.getElementById('qualityGateStatus')
  if (qg) { qg.textContent = '—'; qg.className = 'text-sm font-bold text-slate-500' }
  const qr = document.getElementById('qualityReasons')
  if (qr) qr.innerHTML = ''
}

const updateStats = () => {
  const m = state.metrics
  const el = (id) => document.getElementById(id)

  // Update labels to reflect mode
  const isFine = m.analysisMode === 'fine-mesh'
  const totalLabel = el('totalHolesLabel')
  if (totalLabel) totalLabel.textContent = isFine ? '전체 셀' : '전체 구멍'
  const cleanedLabel = el('cleanedHolesLabel')
  if (cleanedLabel) cleanedLabel.textContent = '청소 완료'
  const blockedLabel = el('blockedHolesLabel')
  if (blockedLabel) blockedLabel.textContent = '청소 필요'
  const excludedLabel = el('excludedHolesLabel')
  if (excludedLabel) excludedLabel.textContent = '제외(반사)'

  if (el('totalHoles')) el('totalHoles').textContent = m.totalHoles.toLocaleString('ko-KR')
  if (el('cleanedHoles')) el('cleanedHoles').textContent = m.cleanedHoles.toLocaleString('ko-KR')
  if (el('blockedHoles')) el('blockedHoles').textContent = m.blockedHoles.toLocaleString('ko-KR')
  if (el('excludedHoles')) el('excludedHoles').textContent = m.excludedHoles.toLocaleString('ko-KR')
  if (el('cleaningRateHole')) el('cleaningRateHole').textContent = `${m.cleaningRateHole.toFixed(1)}%`
  if (el('validAreaPercent')) el('validAreaPercent').textContent = `${m.validAreaPercent.toFixed(1)}%`
  if (el('sharpnessDisplay')) el('sharpnessDisplay').textContent = m.sharpnessScore.toFixed(1)
  if (el('saturationDisplay')) el('saturationDisplay').textContent = `${m.saturationPercent.toFixed(1)}%`

  if (isFine) {
    if (el('roiGridInfo')) el('roiGridInfo').textContent = `FFT pitch ${m.fftPitch.toFixed(1)}px / 평균 밀도 ${(m.avgDensity * 100).toFixed(1)}%`
  } else {
    if (el('roiGridInfo')) el('roiGridInfo').textContent = m.gridPitchX > 0 ? `${m.roiHoleCols}x${m.roiHoleRows} (pitch ${m.gridPitchX.toFixed(1)}x${m.gridPitchY.toFixed(1)}px)` : '—'
  }

  // Fine-mesh density panel
  const densityPanel = el('fineMeshDensityPanel')
  if (densityPanel) {
    if (isFine) {
      densityPanel.classList.remove('hidden')
      const avgDenEl = el('avgDensityDisplay')
      if (avgDenEl) avgDenEl.textContent = `${(m.avgDensity * 100).toFixed(1)}%`
      const fftEl = el('fftPitchDisplay')
      if (fftEl) fftEl.textContent = `${m.fftPitch.toFixed(1)}px`
      const cellCountEl = el('totalCellsDisplay')
      if (cellCountEl) cellCountEl.textContent = m.totalCells.toString()
    } else {
      densityPanel.classList.add('hidden')
    }
  }

  const qg = el('qualityGateStatus')
  if (qg) {
    if (m.qualityGate === 'pass') { qg.textContent = '통과'; qg.className = 'text-lg font-bold text-emerald-600' }
    else if (m.qualityGate === 'warning') { qg.textContent = '경고'; qg.className = 'text-lg font-bold text-amber-500' }
    else { qg.textContent = '검사 불가 — 재촬영 권장'; qg.className = 'text-lg font-bold text-rose-500' }
  }
  const qr = el('qualityReasons')
  if (qr) {
    qr.innerHTML = m.qualityReasons.map(r => `<li class="text-xs text-rose-600">${r}</li>`).join('')
  }
}

// ===================== THRESHOLD LABELS =====================
const updateThresholdLabels = () => {
  const mapping = [
    { slider: 'thresholdDark', display: 'thresholdDarkValue', key: 'dark' },
    { slider: 'thresholdGray', display: 'thresholdGrayValue', key: 'gray' },
    { slider: 'thresholdArea', display: 'thresholdAreaValue', key: 'areaPercentile', format: v => `상위 ${Math.max(0,100-v)}% (P${v})` },
    { slider: 'highlightThreshold', display: 'highlightThresholdValue', key: null, extra: v => { state.highlight.threshold = v } },
    { slider: 'highlightDilate', display: 'highlightDilateValue', key: null, extra: v => { state.highlight.dilate = v } },
    { slider: 'validAreaMin', display: 'validAreaMinValue', key: null, extra: v => { state.validAreaMin = v } },
  ]
  mapping.forEach(({ slider, display, key, format, extra }) => {
    const s = elements[slider] || document.getElementById(slider)
    const d = elements[display] || document.getElementById(display)
    if (s && d) {
      const v = Number(s.value)
      d.textContent = format ? format(v) : v.toString()
      if (key) state.thresholds[key] = v
      if (extra) extra(v)
    }
  })
}

// ===================== IMAGE PROCESSING CORE =====================

/** Grayscale from RGBA ImageData.data */
const computeGrayscale = (data) => {
  const n = data.length / 4
  const g = new Uint8Array(n)
  for (let i = 0, j = 0; i < data.length; i += 4, j++)
    g[j] = Math.round(data[i] * 0.2126 + data[i+1] * 0.7152 + data[i+2] * 0.0722)
  return g
}

/** Box blur (large-kernel approximation of gaussian) for flat-field background estimation */
const boxBlur = (input, w, h, radius) => {
  const out = new Float32Array(w * h)
  const tmp = new Float32Array(w * h)
  // horizontal pass
  for (let y = 0; y < h; y++) {
    let sum = 0, count = 0
    // Initial window
    for (let x = 0; x <= Math.min(radius, w - 1); x++) { sum += input[y * w + x]; count++ }
    for (let x = 0; x < w; x++) {
      tmp[y * w + x] = sum / count
      // expand right
      const addX = x + radius + 1
      if (addX < w) { sum += input[y * w + addX]; count++ }
      // shrink left
      const subX = x - radius
      if (subX >= 0) { sum -= input[y * w + subX]; count-- }
    }
  }
  // vertical pass
  for (let x = 0; x < w; x++) {
    let sum = 0, count = 0
    for (let y = 0; y <= Math.min(radius, h - 1); y++) { sum += tmp[y * w + x]; count++ }
    for (let y = 0; y < h; y++) {
      out[y * w + x] = sum / count
      const addY = y + radius + 1
      if (addY < h) { sum += tmp[addY * w + x]; count++ }
      const subY = y - radius
      if (subY >= 0) { sum -= tmp[subY * w + x]; count-- }
    }
  }
  return out
}

/** Multi-pass box blur for smoother background estimate */
const multiPassBoxBlur = (input, w, h, radius, passes) => {
  let buf = new Float32Array(input.length)
  for (let i = 0; i < input.length; i++) buf[i] = input[i]
  for (let p = 0; p < passes; p++) buf = boxBlur(buf, w, h, radius)
  return buf
}

/** Flat-field correction: divide image by background estimate, rescale to 0-255 */
const flatFieldCorrection = (gray, w, h) => {
  // Use large blur radius proportional to image size
  const r = Math.max(40, Math.round(Math.min(w, h) / 5))
  const bg = multiPassBoxBlur(gray, w, h, r, 3)
  const corrected = new Uint8Array(w * h)
  // Compute global mean for normalization
  let globalMean = 0
  for (let i = 0; i < w * h; i++) globalMean += bg[i]
  globalMean /= (w * h)
  if (globalMean < 1) globalMean = 128

  for (let i = 0; i < w * h; i++) {
    if (bg[i] < 1) { corrected[i] = gray[i]; continue }
    const ratio = (gray[i] / bg[i]) * globalMean
    corrected[i] = Math.min(255, Math.max(0, Math.round(ratio)))
  }
  return corrected
}

/** Sharpness score — Laplacian variance */
const computeSharpness = (gray, w, h) => {
  let sum = 0, sumSq = 0, n = 0
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const lap = -4 * gray[y * w + x] + gray[(y-1)*w+x] + gray[(y+1)*w+x] + gray[y*w+x-1] + gray[y*w+x+1]
      sum += lap; sumSq += lap * lap; n++
    }
  }
  const mean = sum / n
  return Math.sqrt(sumSq / n - mean * mean)
}

/** Saturation (highlight) pixel ratio on original grayscale */
const computeSaturation = (gray, w, h, thr) => {
  let sat = 0
  for (let i = 0; i < w * h; i++) if (gray[i] >= thr) sat++
  return (sat / (w * h)) * 100
}

/** Build highlight mask: pixels >= threshold -> 255, then morphological dilate */
const buildHighlightMask = (gray, w, h, thr, dilateRadius) => {
  const mask = new Uint8Array(w * h)
  for (let i = 0; i < w * h; i++) if (gray[i] >= thr) mask[i] = 255
  // dilation with configurable radius
  let current = mask
  for (let iter = 0; iter < dilateRadius; iter++) {
    const next = new Uint8Array(w * h)
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let found = false
        for (let dy = -1; dy <= 1 && !found; dy++) {
          const ny = y + dy
          if (ny < 0 || ny >= h) continue
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx
            if (nx < 0 || nx >= w) continue
            if (current[ny * w + nx]) { found = true; break }
          }
        }
        next[y * w + x] = found ? 255 : 0
      }
    }
    current = next
  }
  return current
}

/** Connected component labeling on binary mask (8-connected) */
const labelConnectedComponents = (binaryMask, w, h) => {
  const labels = new Int32Array(w * h)
  const components = []
  let nextLabel = 1
  const queue = []

  for (let start = 0; start < w * h; start++) {
    if (labels[start] || !binaryMask[start]) continue
    const comp = { pixels: [], sumX: 0, sumY: 0, area: 0, label: nextLabel }
    labels[start] = nextLabel
    queue.length = 0
    queue.push(start)
    let head = 0
    while (head < queue.length) {
      const idx = queue[head++]
      const cy = (idx / w) | 0, cx = idx - cy * w
      comp.pixels.push(idx)
      comp.sumX += cx; comp.sumY += cy; comp.area++
      for (let dy = -1; dy <= 1; dy++) {
        const ny = cy + dy
        if (ny < 0 || ny >= h) continue
        for (let dx = -1; dx <= 1; dx++) {
          if (dy === 0 && dx === 0) continue
          const nx = cx + dx
          if (nx < 0 || nx >= w) continue
          const ni = ny * w + nx
          if (!labels[ni] && binaryMask[ni]) { labels[ni] = nextLabel; queue.push(ni) }
        }
      }
    }
    components.push(comp)
    nextLabel++
  }
  return components
}

/** Estimate grid pitch from hole positions using nearest-neighbor distances */
const estimateGridPitch = (holes) => {
  if (holes.length < 4) return { pitchX: 0, pitchY: 0, pitch: 0 }
  // Collect all nearest-neighbor distances
  const allDists = []
  for (const h of holes) {
    let best = Infinity
    for (const h2 of holes) {
      if (h === h2) continue
      const d = Math.hypot(h.x - h2.x, h.y - h2.y)
      if (d < best) best = d
    }
    if (best < Infinity) allDists.push(best)
  }
  allDists.sort((a, b) => a - b)
  // Use median
  const pitch = allDists.length ? allDists[Math.floor(allDists.length * 0.5)] : 0
  return { pitchX: pitch, pitchY: pitch, pitch }
}

// ===================== MORPHOLOGY =====================
const morphDilate = (mask, w, h) => {
  const out = new Uint8Array(w * h)
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let found = false
      for (let dy = -1; dy <= 1 && !found; dy++) {
        const ny = y + dy; if (ny < 0 || ny >= h) continue
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx; if (nx < 0 || nx >= w) continue
          if (mask[ny * w + nx]) { found = true; break }
        }
      }
      out[y * w + x] = found ? 255 : 0
    }
  return out
}
const morphErode = (mask, w, h) => {
  const out = new Uint8Array(w * h)
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let keep = true
      for (let dy = -1; dy <= 1 && keep; dy++) {
        const ny = y + dy; if (ny < 0 || ny >= h) { keep = false; break }
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx; if (nx < 0 || nx >= w || !mask[ny * w + nx]) { keep = false; break }
        }
      }
      out[y * w + x] = keep ? 255 : 0
    }
  return out
}

// ===================== FFT PERIODICITY DETECTION =====================

/** Compute 1D FFT magnitude spectrum (real-valued DFT via Goertzel-like approach) */
const computeFFTMagnitude = (signal) => {
  const N = signal.length
  const mag = new Float64Array(Math.floor(N / 2))
  for (let k = 1; k < mag.length; k++) {
    let re = 0, im = 0
    const w = (2 * Math.PI * k) / N
    for (let n = 0; n < N; n++) {
      re += signal[n] * Math.cos(w * n)
      im -= signal[n] * Math.sin(w * n)
    }
    mag[k] = Math.sqrt(re * re + im * im)
  }
  return mag
}

/** Detect dominant periodicity in a grayscale patch using row/column projections.
 *  Returns estimated pitch in pixels. If pitch < threshold → fine mesh. */
const detectPeriodicity = (gray, w, h) => {
  // Sample a center patch (up to 256x256) for speed
  const patchSize = Math.min(256, Math.min(w, h))
  const startX = Math.floor((w - patchSize) / 2)
  const startY = Math.floor((h - patchSize) / 2)

  // Average horizontal projection (collapse columns)
  const hProj = new Float64Array(patchSize)
  for (let x = 0; x < patchSize; x++) {
    let sum = 0
    for (let y = 0; y < patchSize; y++) sum += gray[(startY + y) * w + (startX + x)]
    hProj[x] = sum / patchSize
  }
  // Remove DC / trend
  const hMean = hProj.reduce((a, b) => a + b) / patchSize
  for (let i = 0; i < patchSize; i++) hProj[i] -= hMean

  // Average vertical projection (collapse rows)
  const vProj = new Float64Array(patchSize)
  for (let y = 0; y < patchSize; y++) {
    let sum = 0
    for (let x = 0; x < patchSize; x++) sum += gray[(startY + y) * w + (startX + x)]
    vProj[y] = sum / patchSize
  }
  const vMean = vProj.reduce((a, b) => a + b) / patchSize
  for (let i = 0; i < patchSize; i++) vProj[i] -= vMean

  // FFT of both projections
  const hMag = computeFFTMagnitude(hProj)
  const vMag = computeFFTMagnitude(vProj)

  // Find dominant peak (ignore very low frequencies k<3 which are illumination gradients)
  let bestK_h = 3, bestK_v = 3
  for (let k = 3; k < hMag.length; k++) { if (hMag[k] > hMag[bestK_h]) bestK_h = k }
  for (let k = 3; k < vMag.length; k++) { if (vMag[k] > vMag[bestK_v]) bestK_v = k }

  const pitchH = bestK_h > 0 ? patchSize / bestK_h : 0
  const pitchV = bestK_v > 0 ? patchSize / bestK_v : 0
  const pitch = (pitchH + pitchV) / 2

  return { pitchH, pitchV, pitch, patchSize }
}

// ===================== HONEYCOMB CELL DETECTION =====================

/** Detect honeycomb cells using large-scale blur + thresholding + CC labeling.
 *  Returns array of cell objects with center, radius, bounding box. */
const detectHoneycombCells = (gray, w, h) => {
  // Heavy blur to see only large-scale structure (sigma ≈ 15-25px equivalent)
  const blurR = Math.max(12, Math.round(Math.min(w, h) / 35))
  const blurred = multiPassBoxBlur(gray, w, h, blurR, 3)

  // Compute global mean of blurred
  let gMean = 0
  for (let i = 0; i < w * h; i++) gMean += blurred[i]
  gMean /= (w * h)

  // Adaptive threshold: cells are darker regions (open areas behind mesh)
  // Use slightly below mean to find cell interiors
  const threshold = gMean * 0.92
  const cellMask = new Uint8Array(w * h)
  for (let i = 0; i < w * h; i++) {
    if (blurred[i] < threshold) cellMask[i] = 255
  }

  // Morphological cleanup — open then close
  let mask = cellMask
  mask = morphErode(mask, w, h)
  mask = morphErode(mask, w, h)
  mask = morphDilate(mask, w, h)
  mask = morphDilate(mask, w, h)
  mask = morphDilate(mask, w, h)
  mask = morphErode(mask, w, h)

  // Connected components
  const components = labelConnectedComponents(mask, w, h)

  // Filter: keep only reasonably-sized cells (not too small, not too large)
  const minCellArea = Math.max(200, (w * h) * 0.002)   // at least 0.2% of image
  const maxCellArea = (w * h) * 0.25                     // at most 25% of image
  const validCells = components.filter(c => c.area >= minCellArea && c.area <= maxCellArea)

  // Build cell objects
  const cells = validCells.map((comp, idx) => {
    const cx = comp.sumX / comp.area
    const cy = comp.sumY / comp.area
    const radius = Math.sqrt(comp.area / Math.PI)
    // Compute bounding box
    let minX = w, maxX = 0, minY = h, maxY = 0
    for (const px of comp.pixels) {
      const py = (px / w) | 0, pxx = px - py * w
      if (pxx < minX) minX = pxx; if (pxx > maxX) maxX = pxx
      if (py < minY) minY = py; if (py > maxY) maxY = py
    }
    return {
      id: idx, cx, cy, radius,
      area: comp.area,
      bbox: { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 },
      pixels: comp.pixels,
    }
  })

  return cells
}

// ===================== CELL-BASED DENSITY ANALYSIS =====================

/** For each honeycomb cell, compute the dark-pixel density ratio.
 *  High density = many open holes = clean. Low density = blocked. */
const analyzeCellDensity = (cells, corrected, gray, w, h, hlMask, darkThr, grayThr) => {
  const results = []
  for (const cell of cells) {
    let totalPx = 0, darkPx = 0, hlPx = 0
    let sumIntensity = 0

    for (const idx of cell.pixels) {
      // Skip highlight-masked pixels
      if (hlMask && hlMask[idx]) { hlPx++; continue }
      totalPx++
      sumIntensity += corrected[idx]
      if (corrected[idx] <= grayThr) darkPx++
    }

    const density = totalPx > 0 ? darkPx / totalPx : 0
    const avgIntensity = totalPx > 0 ? sumIntensity / totalPx : 255
    const hlRatio = cell.pixels.length > 0 ? hlPx / cell.pixels.length : 0

    // Classification based on density
    let status
    if (hlRatio > 0.5) {
      status = 'excluded'  // more than half is highlight → unreliable
    } else if (density >= 0.4) {
      status = 'cleaned'   // ≥40% dark pixels → well-cleaned
    } else if (density >= 0.15) {
      status = 'partial'   // 15-40% → partially cleaned
    } else {
      status = 'blocked'   // <15% dark pixels → mostly blocked
    }

    results.push({
      id: cell.id,
      cx: cell.cx, cy: cell.cy, radius: cell.radius,
      bbox: cell.bbox,
      pixelCount: cell.pixels.length,
      validPixelCount: totalPx,
      darkCount: darkPx,
      density,
      avgIntensity,
      hlRatio,
      status,
      excluded: hlRatio > 0.5,
      _pixelIndices: cell.pixels, // keep for reclassification
    })
  }
  return results
}

// ===================== GRID-BASED DENSITY (fallback when no honeycomb detected) =====================

/** When no clear honeycomb cells are found, divide image into a uniform grid
 *  and compute density per grid cell. */
const analyzeGridDensity = (corrected, gray, w, h, hlMask, grayThr, gridSize) => {
  const cols = Math.ceil(w / gridSize)
  const rows = Math.ceil(h / gridSize)
  const results = []
  let id = 0

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x0 = col * gridSize
      const y0 = row * gridSize
      const x1 = Math.min(x0 + gridSize, w)
      const y1 = Math.min(y0 + gridSize, h)
      const cellW = x1 - x0, cellH = y1 - y0

      let totalPx = 0, darkPx = 0, hlPx = 0, sumIntensity = 0
      const pixels = []
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const idx = y * w + x
          pixels.push(idx)
          if (hlMask && hlMask[idx]) { hlPx++; continue }
          totalPx++
          sumIntensity += corrected[idx]
          if (corrected[idx] <= grayThr) darkPx++
        }
      }

      const density = totalPx > 0 ? darkPx / totalPx : 0
      const avgIntensity = totalPx > 0 ? sumIntensity / totalPx : 255
      const hlRatio = pixels.length > 0 ? hlPx / pixels.length : 0
      const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2
      const radius = Math.min(cellW, cellH) / 2

      let status
      if (hlRatio > 0.5) status = 'excluded'
      else if (density >= 0.4) status = 'cleaned'
      else if (density >= 0.15) status = 'partial'
      else status = 'blocked'

      results.push({
        id: id++,
        cx, cy, radius,
        bbox: { x: x0, y: y0, width: cellW, height: cellH },
        pixelCount: pixels.length,
        validPixelCount: totalPx,
        darkCount: darkPx,
        density,
        avgIntensity,
        hlRatio,
        status,
        excluded: hlRatio > 0.5,
        _pixelIndices: pixels, // keep for reclassification
      })
    }
  }
  return results
}

// ===================== SIMPLE THRESHOLD FOR HOLE DETECTION =====================

/** Create candidate mask using simple global threshold on corrected image.
 *  After flat-field correction, illumination is normalised so a global threshold
 *  on the corrected image is both stable and sensitive — matching v1 accuracy
 *  while benefiting from v2's flat-field correction. */
const createCandidateMask = (corrected, w, h, grayThreshold) => {
  const mask = new Uint8Array(w * h)
  for (let i = 0; i < w * h; i++) {
    if (corrected[i] <= grayThreshold) {
      mask[i] = 255
    }
  }
  return mask
}

// ===================== MAIN ANALYSIS =====================

const analyzeMesh = async () => {
  if (!elements.meshCanvas || !elements.overlayCanvas) { log('캔버스 요소를 찾을 수 없습니다.', 'error'); return }
  const { meshCanvas, overlayCanvas, canvasPlaceholder } = elements
  const ctx = meshCanvas.getContext('2d')
  if (!ctx || !state.imageBitmap) { log('분석할 이미지가 없습니다.', 'error'); return }
  if (state.selectingROI) { log('영역 지정을 완료하거나 취소하세요.', 'warning'); return }
  if (state.isAnalyzing) { state.pendingReanalysis = true; return }
  state.isAnalyzing = true
  if (canvasPlaceholder) canvasPlaceholder.classList.add('hidden')
  setActionButtons({ analyze: false, reset: true, save: false })

  try {
    const W = meshCanvas.width, H = meshCanvas.height
    state.imageWidth = W; state.imageHeight = H
    overlayCanvas.width = W; overlayCanvas.height = H
    const imageData = ctx.getImageData(0, 0, W, H)
    const grayOrig = computeGrayscale(imageData.data)
    state.grayOrig = grayOrig
    log('그레이스케일 변환 완료')

    // 1. Sharpness
    const sharpness = computeSharpness(grayOrig, W, H)
    log(`선명도 지표: ${sharpness.toFixed(1)}`)

    // 2. Highlight mask (before flat-field, on original gray)
    let hlMask = null
    const satPct = computeSaturation(grayOrig, W, H, state.highlight.threshold)
    if (state.highlight.enabled) {
      hlMask = buildHighlightMask(grayOrig, W, H, state.highlight.threshold, state.highlight.dilate)
      state.highlightMask = hlMask
      const hlPixels = hlMask.reduce((s, v) => s + (v ? 1 : 0), 0)
      log(`하이라이트 마스크 생성: ${(hlPixels / (W*H) * 100).toFixed(1)}% 영역 제외`)
    } else {
      state.highlightMask = null
    }

    // 3. Flat-field correction
    const corrected = flatFieldCorrection(grayOrig, W, H)
    state.corrected = corrected
    log('조명 불균일 보정(flat-field) 완료')

    // 4. AUTO-DETECT MODE: FFT periodicity check
    const { pitch: fftPitch, pitchH, pitchV } = detectPeriodicity(grayOrig, W, H)
    log(`FFT 주기 분석: 수평 ${pitchH.toFixed(1)}px, 수직 ${pitchV.toFixed(1)}px, 평균 ${fftPitch.toFixed(1)}px`)

    // Decision: if pitch < 7px → fine mesh (holes too small for CC labeling)
    const isFine = fftPitch < 7
    state.analysisMode = isFine ? 'fine-mesh' : 'standard'
    log(`분석 모드: ${isFine ? '미세 매쉬 (셀 밀도 분석)' : '표준 (구멍 개별 검출)'}`, isFine ? 'warning' : 'info')

    // Update mode badge in UI
    const modeBadge = document.getElementById('analysisModeBadge')
    if (modeBadge) {
      modeBadge.textContent = isFine ? '미세 매쉬 모드 (셀 밀도)' : '표준 모드 (구멍 검출)'
      modeBadge.className = isFine
        ? 'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold bg-violet-100 text-violet-700 border border-violet-300'
        : 'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-300'
    }

    if (isFine) {
      // ========== FINE-MESH MODE: Cell-based density analysis ==========
      await analyzeFineMesh(W, H, grayOrig, corrected, hlMask, sharpness, satPct, fftPitch)
    } else {
      // ========== STANDARD MODE: Hole-based CC labeling ==========
      await analyzeStandardMesh(W, H, grayOrig, corrected, hlMask, sharpness, satPct, fftPitch)
    }

    await autoSaveInspection()
  } catch (err) {
    console.error(err)
    log(`분석 오류: ${err.message}`, 'error')
    setActionButtons({ analyze: !!state.imageBitmap, reset: true, save: false })
  } finally {
    state.isAnalyzing = false
    if (state.pendingReanalysis) { state.pendingReanalysis = false; if (state.imageBitmap) setTimeout(analyzeMesh, 0) }
  }
}

/** Fine-mesh analysis: detect honeycomb cells, compute density per cell */
const analyzeFineMesh = async (W, H, grayOrig, corrected, hlMask, sharpness, satPct, fftPitch) => {
  const grayThr = state.thresholds.gray

  // Try to detect honeycomb cells
  log('허니콤 셀 구조 탐지 중...')
  let honeycombCells = detectHoneycombCells(grayOrig, W, H)
  log(`허니콤 셀 검출: ${honeycombCells.length}개`)

  let cellResults
  if (honeycombCells.length >= 3) {
    // Use detected honeycomb cells
    log('허니콤 셀 기반 밀도 분석 시작...')
    cellResults = analyzeCellDensity(honeycombCells, corrected, grayOrig, W, H, hlMask, state.thresholds.dark, grayThr)
  } else {
    // Fallback: uniform grid (use ~40px grid for fine mesh)
    const gridSize = Math.max(30, Math.round(Math.min(W, H) / 15))
    log(`허니콤 미검출 → 균일 격자 분석 (${gridSize}px 그리드)`)
    cellResults = analyzeGridDensity(corrected, grayOrig, W, H, hlMask, grayThr, gridSize)
  }

  // Apply ROI filter
  if (state.roi) {
    const { x: rx, y: ry, width: rw, height: rh } = state.roi
    cellResults = cellResults.filter(c =>
      c.cx >= rx && c.cx < rx + rw && c.cy >= ry && c.cy < ry + rh
    )
  }

  state.cells = cellResults
  state.results = [] // clear hole-based results

  // Compute metrics
  const excluded = cellResults.filter(c => c.excluded).length
  const cleaned = cellResults.filter(c => c.status === 'cleaned').length
  const partial = cellResults.filter(c => c.status === 'partial').length
  const blocked = cellResults.filter(c => c.status === 'blocked').length
  const active = cleaned + partial + blocked
  const cleaningRate = active > 0 ? (cleaned / active) * 100 : 0
  const avgDensity = cellResults.length > 0
    ? cellResults.filter(c => !c.excluded).reduce((s, c) => s + c.density, 0) / Math.max(1, active)
    : 0

  // Valid area
  const roiArea = state.roi ? state.roi.width * state.roi.height : W * H
  let hlInRoi = 0
  if (hlMask) {
    for (let i = 0; i < W * H; i++) if (hlMask[i]) hlInRoi++
  }
  const validAreaPct = roiArea > 0 ? ((roiArea - hlInRoi) / roiArea) * 100 : 100

  // Quality gate
  const reasons = []
  let gate = 'pass'
  if (validAreaPct < state.validAreaMin) { reasons.push(`유효면적 부족: ${validAreaPct.toFixed(1)}%`); gate = 'fail' }
  if (satPct > 30) { reasons.push(`포화 픽셀 과다: ${satPct.toFixed(1)}%`); gate = gate === 'fail' ? 'fail' : 'warning' }
  if (sharpness < 8) { reasons.push(`선명도 부족: ${sharpness.toFixed(1)}`); gate = gate === 'fail' ? 'fail' : 'warning' }
  if (cellResults.length < 3) { reasons.push(`분석 셀 부족: ${cellResults.length}개`); gate = gate === 'fail' ? 'fail' : 'warning' }

  state.metrics = {
    totalHoles: cellResults.length,
    cleanedHoles: cleaned,
    blockedHoles: blocked + partial,
    excludedHoles: excluded,
    cleaningRateHole: cleaningRate,
    validAreaPercent: validAreaPct,
    sharpnessScore: sharpness,
    saturationPercent: satPct,
    qualityGate: gate,
    qualityReasons: reasons,
    gridPitchX: fftPitch,
    gridPitchY: fftPitch,
    roiHoleCols: 0,
    roiHoleRows: 0,
    analysisMode: 'fine-mesh',
    fftPitch,
    totalCells: cellResults.length,
    cleanedCells: cleaned,
    blockedCells: blocked + partial,
    excludedCells: excluded,
    avgDensity,
  }

  renderOverlay()
  renderOverlayOnly()
  updateStats()
  setActionButtons({ analyze: true, reset: true, save: true })

  log(`미세 매쉬 분석 완료 — 셀 ${cellResults.length}개, 청소 완료 ${cleaned}개, 청소 필요 ${blocked + partial}개, 제외 ${excluded}개`)
  log(`평균 밀도: ${(avgDensity * 100).toFixed(1)}%, 청소율: ${cleaningRate.toFixed(1)}%`)
  if (gate !== 'pass') log(`품질 게이트: ${gate === 'fail' ? '검사 불가' : '경고'} — ${reasons.join(', ')}`, gate === 'fail' ? 'error' : 'warning')
  else log('품질 게이트: 통과', 'info')
}

/** Standard mesh analysis: hole-based CC labeling (existing algorithm) */
const analyzeStandardMesh = async (W, H, grayOrig, corrected, hlMask, sharpness, satPct, fftPitch) => {
  state.cells = null // clear cell-based results

  // 4. Candidate mask using simple global threshold on corrected image
  let candidateMask = createCandidateMask(corrected, W, H, state.thresholds.gray)
  
  // Apply ROI
  if (state.roi) {
    const { x: rx, y: ry, width: rw, height: rh } = state.roi
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++)
        if (y < ry || y >= ry + rh || x < rx || x >= rx + rw) candidateMask[y * W + x] = 0
  }
  // Exclude highlight mask pixels from candidates
  if (hlMask) {
    for (let i = 0; i < W * H; i++) if (hlMask[i]) candidateMask[i] = 0
  }

  // Morphological open+close to clean noise
  let mask = candidateMask
  mask = morphErode(mask, W, H)
  mask = morphDilate(mask, W, H)
  mask = morphDilate(mask, W, H)
  mask = morphErode(mask, W, H)

  // 5. Connected components
  const components = labelConnectedComponents(mask, W, H)
  log(`후보 영역: ${components.length.toLocaleString('ko-KR')}개`)

  // 6. Filter by area percentile and minimum area
  const pct = state.thresholds.areaPercentile
  const areas = components.map(c => c.area).sort((a, b) => a - b)
  const minArea = Math.max(4, areas.length ? areas[Math.min(areas.length - 1, Math.floor(pct / 100 * areas.length))] : 4)
  const medianArea = areas.length ? areas[Math.floor(areas.length * 0.5)] : 10
  const maxArea = medianArea * 8
  const validComps = components.filter(c => c.area >= minArea && c.area <= maxArea)
  log(`필터 후 구멍 후보: ${validComps.length.toLocaleString('ko-KR')}개 (면적 ${minArea}-${maxArea}px)`)

  // 7. Build holes with median intensity sampling
  const darkThr = state.thresholds.dark
  const holes = []
  for (const comp of validComps) {
    const cx = comp.sumX / comp.area
    const cy = comp.sumY / comp.area
    const radius = Math.max(2, Math.sqrt(comp.area / Math.PI))
    const sampleRadius = Math.max(1, Math.floor(radius * 0.6))
    const intensities = []
    const icx = Math.round(cx), icy = Math.round(cy)
    for (let dy = -sampleRadius; dy <= sampleRadius; dy++) {
      const sy = icy + dy; if (sy < 0 || sy >= H) continue
      for (let dx = -sampleRadius; dx <= sampleRadius; dx++) {
        const sx = icx + dx; if (sx < 0 || sx >= W) continue
        if (dx * dx + dy * dy <= sampleRadius * sampleRadius) intensities.push(grayOrig[sy * W + sx])
      }
    }
    intensities.sort((a, b) => a - b)
    const median = intensities.length ? intensities[Math.floor(intensities.length / 2)] : 128
    const corrIntensities = []
    for (let dy = -sampleRadius; dy <= sampleRadius; dy++) {
      const sy = icy + dy; if (sy < 0 || sy >= H) continue
      for (let dx = -sampleRadius; dx <= sampleRadius; dx++) {
        const sx = icx + dx; if (sx < 0 || sx >= W) continue
        if (dx * dx + dy * dy <= sampleRadius * sampleRadius) corrIntensities.push(corrected[sy * W + sx])
      }
    }
    corrIntensities.sort((a, b) => a - b)
    const corrMedian = corrIntensities.length ? corrIntensities[Math.floor(corrIntensities.length / 2)] : 128
    const inHighlight = hlMask ? hlMask[Math.round(cy) * W + Math.round(cx)] > 0 : false
    const status = inHighlight ? 'excluded' : (corrMedian <= darkThr ? 'cleaned' : 'blocked')
    holes.push({ id: holes.length, x: cx, y: cy, radius, median, corrMedian, status, excluded: inHighlight, area: comp.area })
  }
  log(`구멍 검출: ${holes.length.toLocaleString('ko-KR')}개`)

  // 8. Grid pitch estimation
  const activeHoles = holes.filter(h => !h.excluded)
  const { pitchX, pitchY, pitch } = estimateGridPitch(activeHoles)
  if (pitch > 0) log(`격자 피치 추정: ${pitch.toFixed(1)}px`)

  // 9. Compute metrics
  const excluded = holes.filter(h => h.excluded).length
  const cleaned = holes.filter(h => h.status === 'cleaned').length
  const blocked = holes.filter(h => h.status === 'blocked').length
  const active = cleaned + blocked
  const cleaningRate = active > 0 ? (cleaned / active) * 100 : 0

  const roiArea = state.roi ? state.roi.width * state.roi.height : W * H
  let hlInRoi = 0
  if (hlMask) { for (let i = 0; i < W * H; i++) if (hlMask[i]) hlInRoi++ }
  const validAreaPct = roiArea > 0 ? ((roiArea - hlInRoi) / roiArea) * 100 : 100

  let roiCols = 0, roiRows = 0
  if (pitch > 0) {
    const roiW = state.roi ? state.roi.width : W
    const roiH = state.roi ? state.roi.height : H
    roiCols = Math.round(roiW / pitch); roiRows = Math.round(roiH / pitch)
  }

  // 10. Quality gate
  const reasons = []
  let gate = 'pass'
  if (validAreaPct < state.validAreaMin) { reasons.push(`유효면적 부족: ${validAreaPct.toFixed(1)}%`); gate = 'fail' }
  if (satPct > 30) { reasons.push(`포화 픽셀 과다: ${satPct.toFixed(1)}%`); gate = gate === 'fail' ? 'fail' : 'warning' }
  if (sharpness < 8) { reasons.push(`선명도 부족: ${sharpness.toFixed(1)}`); gate = gate === 'fail' ? 'fail' : 'warning' }
  if (holes.length < 10 && !state.roi) { reasons.push(`검출 구멍 수 부족: ${holes.length}개`); gate = gate === 'fail' ? 'fail' : 'warning' }
  if (state.roiGrid.enabled && pitch > 0) {
    if (Math.abs(roiCols - state.roiGrid.cols) > 3 || Math.abs(roiRows - state.roiGrid.rows) > 3) {
      reasons.push(`ROI 구멍 수(${roiCols}x${roiRows})가 목표와 차이남`)
      if (gate === 'pass') gate = 'warning'
    }
  }

  state.results = holes
  state.metrics = {
    totalHoles: holes.length, cleanedHoles: cleaned, blockedHoles: blocked, excludedHoles: excluded,
    cleaningRateHole: cleaningRate, validAreaPercent: validAreaPct, sharpnessScore: sharpness, saturationPercent: satPct,
    qualityGate: gate, qualityReasons: reasons, gridPitchX: pitchX, gridPitchY: pitchY,
    roiHoleCols: roiCols, roiHoleRows: roiRows,
    analysisMode: 'standard', fftPitch, totalCells: 0, cleanedCells: 0, blockedCells: 0, excludedCells: 0, avgDensity: 0,
  }

  renderOverlay()
  renderOverlayOnly()
  updateStats()
  setActionButtons({ analyze: true, reset: true, save: true })

  log(`분석 완료 — 청소율(구멍): ${cleaningRate.toFixed(1)}% (${cleaned}/${active}), 제외: ${excluded}개`)
  if (gate === 'fail') log(`품질 게이트: 검사 불가 — ${reasons.join(', ')}`, 'error')
  else if (gate === 'warning') log(`품질 게이트: 경고 — ${reasons.join(', ')}`, 'warning')
  else log('품질 게이트: 통과', 'info')
}

/** Reclassify existing holes/cells when thresholds change (no re-detection) */
const reclassifyHoles = () => {
  if (state.analysisMode === 'fine-mesh' && state.cells?.length) {
    // Fine-mesh mode: reclassify cells based on current dark threshold
    const darkThr = state.thresholds.dark
    const grayThr = state.thresholds.gray
    const hlMask = state.highlightMask
    const corrected = state.corrected
    const W = state.imageWidth

    for (const c of state.cells) {
      // Re-count dark pixels with updated threshold
      if (corrected && c._pixelIndices) {
        let totalPx = 0, darkPx = 0, hlPx = 0
        for (const idx of c._pixelIndices) {
          if (hlMask && hlMask[idx]) { hlPx++; continue }
          totalPx++
          if (corrected[idx] <= grayThr) darkPx++
        }
        c.density = totalPx > 0 ? darkPx / totalPx : 0
        c.hlRatio = c._pixelIndices.length > 0 ? hlPx / c._pixelIndices.length : 0
        c.darkCount = darkPx
        c.validPixelCount = totalPx
      }
      // Reclassify
      if (c.hlRatio > 0.5) {
        c.status = 'excluded'; c.excluded = true
      } else {
        c.excluded = false
        if (c.density >= 0.4) c.status = 'cleaned'
        else if (c.density >= 0.15) c.status = 'partial'
        else c.status = 'blocked'
      }
    }

    const excluded = state.cells.filter(c => c.excluded).length
    const cleaned = state.cells.filter(c => c.status === 'cleaned').length
    const partial = state.cells.filter(c => c.status === 'partial').length
    const blocked = state.cells.filter(c => c.status === 'blocked').length
    const active = cleaned + partial + blocked
    const cleaningRate = active > 0 ? (cleaned / active) * 100 : 0
    const avgDensity = active > 0
      ? state.cells.filter(c => !c.excluded).reduce((s, c) => s + c.density, 0) / active : 0

    state.metrics.totalHoles = state.cells.length
    state.metrics.cleanedHoles = cleaned
    state.metrics.blockedHoles = blocked + partial
    state.metrics.excludedHoles = excluded
    state.metrics.cleaningRateHole = cleaningRate
    state.metrics.totalCells = state.cells.length
    state.metrics.cleanedCells = cleaned
    state.metrics.blockedCells = blocked + partial
    state.metrics.excludedCells = excluded
    state.metrics.avgDensity = avgDensity

    renderOverlay()
    renderOverlayOnly()
    updateStats()
    log(`셀 재분류 완료 — 청소율: ${cleaningRate.toFixed(1)}% (${cleaned}/${active}), 밀도: ${(avgDensity * 100).toFixed(1)}%`)
    return
  }

  // Standard mode
  if (!state.results?.length) return
  const darkThr = state.thresholds.dark
  const hlMask = state.highlightMask
  
  for (const h of state.results) {
    const inHighlight = hlMask ? hlMask[Math.round(h.y) * state.imageWidth + Math.round(h.x)] > 0 : false
    h.excluded = inHighlight
    h.status = inHighlight ? 'excluded' : (h.corrMedian <= darkThr ? 'cleaned' : 'blocked')
  }
  
  // Recompute metrics
  const excluded = state.results.filter(h => h.excluded).length
  const cleaned = state.results.filter(h => h.status === 'cleaned').length
  const blocked = state.results.filter(h => h.status === 'blocked').length
  const active = cleaned + blocked
  const cleaningRate = active > 0 ? (cleaned / active) * 100 : 0
  
  state.metrics.cleanedHoles = cleaned
  state.metrics.blockedHoles = blocked
  state.metrics.excludedHoles = excluded
  state.metrics.cleaningRateHole = cleaningRate
  
  renderOverlay()
  renderOverlayOnly()
  updateStats()
  log(`재분류 완료 — 청소율: ${cleaningRate.toFixed(1)}% (${cleaned}/${active}), 제외: ${excluded}개`)
}

// ===================== RENDERING =====================

const renderOverlay = () => {
  const { overlayCanvas } = elements
  if (!overlayCanvas) return
  const ctx = overlayCanvas.getContext('2d')
  if (!ctx) return
  const W = overlayCanvas.width, H = overlayCanvas.height
  if (!W || !H) return
  ctx.clearRect(0, 0, W, H)

  // Draw highlight mask as semi-transparent orange
  if (state.highlight.enabled && state.highlightMask) {
    const imgData = ctx.createImageData(W, H)
    const d = imgData.data
    const hl = state.highlightMask
    for (let i = 0; i < W * H; i++) {
      if (hl[i]) {
        const j = i * 4
        d[j] = 255; d[j+1] = 140; d[j+2] = 0; d[j+3] = 80 // orange semi-transparent
      }
    }
    ctx.putImageData(imgData, 0, 0)
  }

  ctx.save()
  if (state.analysisMode === 'fine-mesh' && state.cells?.length) {
    // ===== FINE-MESH MODE: Draw cell regions =====
    for (const c of state.cells) {
      ctx.beginPath()
      if (c.excluded) {
        ctx.strokeStyle = 'rgba(255,165,0,0.5)'
        ctx.fillStyle = 'rgba(255,165,0,0.1)'
        ctx.setLineDash([4, 4])
        ctx.lineWidth = 1.5
      } else if (c.status === 'cleaned') {
        ctx.strokeStyle = 'rgba(56,189,248,0.8)'
        ctx.fillStyle = 'rgba(56,189,248,0.25)'
        ctx.setLineDash([])
        ctx.lineWidth = 2
      } else if (c.status === 'partial') {
        ctx.strokeStyle = 'rgba(251,191,36,0.85)'
        ctx.fillStyle = 'rgba(251,191,36,0.2)'
        ctx.setLineDash([])
        ctx.lineWidth = 2
      } else {
        ctx.strokeStyle = 'rgba(239,68,68,0.8)'
        ctx.fillStyle = 'rgba(239,68,68,0.3)'
        ctx.setLineDash([])
        ctx.lineWidth = 2
      }
      // Draw cell bounding region (rounded rect or circle depending on shape)
      if (c.bbox) {
        const { x, y, width, height } = c.bbox
        const rr = Math.min(6, width * 0.1, height * 0.1)
        ctx.roundRect(x, y, width, height, rr)
      } else {
        ctx.arc(c.cx, c.cy, c.radius * 0.9, 0, Math.PI * 2)
      }
      ctx.fill()
      ctx.stroke()
      // Density label inside cell
      if (!c.excluded && c.radius > 15) {
        ctx.setLineDash([])
        ctx.font = `bold ${Math.max(9, Math.min(14, c.radius * 0.35))}px system-ui`
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.fillStyle = c.status === 'cleaned' ? 'rgba(2,132,199,0.9)'
          : c.status === 'partial' ? 'rgba(180,130,0,0.9)' : 'rgba(185,28,28,0.9)'
        ctx.fillText(`${(c.density * 100).toFixed(0)}%`, c.cx, c.cy)
      }
    }
  } else {
    // ===== STANDARD MODE: Draw holes =====
    const holes = state.results || []
    for (const h of holes) {
      ctx.beginPath()
      if (h.excluded) {
        ctx.strokeStyle = 'rgba(255,165,0,0.6)'
        ctx.fillStyle = 'rgba(255,165,0,0.15)'
        ctx.setLineDash([3, 3])
        ctx.lineWidth = 1
      } else if (h.status === 'cleaned') {
        ctx.strokeStyle = 'rgba(56,189,248,0.9)'
        ctx.fillStyle = 'rgba(56,189,248,0.4)'
        ctx.setLineDash([])
        ctx.lineWidth = 1.5
      } else {
        ctx.strokeStyle = 'rgba(239,68,68,0.9)'
        ctx.fillStyle = 'rgba(239,68,68,0.45)'
        ctx.setLineDash([])
        ctx.lineWidth = 1.5
      }
      ctx.arc(h.x, h.y, h.radius * 0.85, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
    }
  }
  ctx.setLineDash([])
  ctx.restore()

  // Draw ROI
  drawROIHighlight(ctx)
}

const drawROIHighlight = (ctx) => {
  ctx.save()
  const roi = state.roi
  if (roi && !state.selectingROI) {
    ctx.strokeStyle = 'rgba(255,100,0,1)'
    ctx.lineWidth = 4
    ctx.strokeRect(roi.x + 2, roi.y + 2, roi.width - 4, roi.height - 4)
    ctx.fillStyle = 'rgba(255,100,0,0.9)'
    ctx.font = 'bold 13px system-ui'
    ctx.textBaseline = 'top'
    const label = `ROI: ${Math.round(roi.width)}x${Math.round(roi.height)}px`
    ctx.fillText(label, roi.x + 6, roi.y + 6)
  }
  const pv = state.selectionPreview
  if (pv && state.selectingROI) {
    ctx.setLineDash([8, 4])
    ctx.strokeStyle = 'rgba(255,165,0,1)'
    ctx.lineWidth = 3
    ctx.strokeRect(pv.x, pv.y, pv.width, pv.height)
  }
  ctx.restore()
}

/** Render overlay-only image: white background + markings (no original photo underneath) */
const renderOverlayOnly = () => {
  const ooCanvas = elements.overlayOnlyCanvas || document.getElementById('overlayOnlyCanvas')
  const ooWrapper = document.getElementById('overlayOnlyWrapper')
  const hasData = (state.analysisMode === 'fine-mesh' && state.cells?.length) || state.results?.length
  if (!ooCanvas || !hasData) {
    if (ooWrapper) ooWrapper.classList.add('hidden')
    return
  }
  const W = state.imageWidth, H = state.imageHeight
  if (!W || !H) return

  ooCanvas.width = W; ooCanvas.height = H
  const ctx = ooCanvas.getContext('2d')
  if (!ctx) return

  // White background
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, W, H)

  // Draw highlight mask as semi-transparent orange
  if (state.highlight.enabled && state.highlightMask) {
    const imgData = ctx.createImageData(W, H)
    const d = imgData.data
    const hl = state.highlightMask
    for (let i = 0; i < W * H; i++) {
      if (hl[i]) {
        const j = i * 4
        d[j] = 255; d[j+1] = 220; d[j+2] = 180; d[j+3] = 120
      }
    }
    ctx.putImageData(imgData, 0, 0)
  }

  ctx.save()
  if (state.analysisMode === 'fine-mesh' && state.cells?.length) {
    // ===== FINE-MESH: draw cell regions on white bg =====
    for (const c of state.cells) {
      ctx.beginPath()
      if (c.excluded) {
        ctx.strokeStyle = 'rgba(255,165,0,0.7)'
        ctx.fillStyle = 'rgba(255,200,100,0.3)'
        ctx.setLineDash([4, 4])
        ctx.lineWidth = 1.5
      } else if (c.status === 'cleaned') {
        ctx.strokeStyle = 'rgba(14,165,233,1)'
        ctx.fillStyle = 'rgba(56,189,248,0.45)'
        ctx.setLineDash([])
        ctx.lineWidth = 2.5
      } else if (c.status === 'partial') {
        ctx.strokeStyle = 'rgba(217,159,17,1)'
        ctx.fillStyle = 'rgba(251,191,36,0.35)'
        ctx.setLineDash([])
        ctx.lineWidth = 2.5
      } else {
        ctx.strokeStyle = 'rgba(220,38,38,1)'
        ctx.fillStyle = 'rgba(239,68,68,0.4)'
        ctx.setLineDash([])
        ctx.lineWidth = 2.5
      }
      if (c.bbox) {
        const { x, y, width, height } = c.bbox
        const rr = Math.min(6, width * 0.1, height * 0.1)
        ctx.roundRect(x, y, width, height, rr)
      } else {
        ctx.arc(c.cx, c.cy, c.radius * 0.9, 0, Math.PI * 2)
      }
      ctx.fill()
      ctx.stroke()
      // Density label
      if (!c.excluded && c.radius > 12) {
        ctx.setLineDash([])
        ctx.font = `bold ${Math.max(10, Math.min(16, c.radius * 0.38))}px system-ui`
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.fillStyle = c.status === 'cleaned' ? '#0369a1'
          : c.status === 'partial' ? '#a16207' : '#b91c1c'
        ctx.fillText(`${(c.density * 100).toFixed(0)}%`, c.cx, c.cy)
      }
    }
  } else {
    // ===== STANDARD: draw holes on white bg =====
    const holes = state.results || []
    for (const h of holes) {
      ctx.beginPath()
      if (h.excluded) {
        ctx.strokeStyle = 'rgba(255,165,0,0.7)'
        ctx.fillStyle = 'rgba(255,200,100,0.4)'
        ctx.setLineDash([3, 3])
        ctx.lineWidth = 1.2
      } else if (h.status === 'cleaned') {
        ctx.strokeStyle = 'rgba(14,165,233,1)'
        ctx.fillStyle = 'rgba(56,189,248,0.6)'
        ctx.setLineDash([])
        ctx.lineWidth = 2
      } else {
        ctx.strokeStyle = 'rgba(220,38,38,1)'
        ctx.fillStyle = 'rgba(239,68,68,0.55)'
        ctx.setLineDash([])
        ctx.lineWidth = 2
      }
      ctx.arc(h.x, h.y, h.radius * 0.85, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
    }
  }
  ctx.setLineDash([])
  ctx.restore()

  // Draw ROI outline
  if (state.roi && !state.selectingROI) {
    ctx.save()
    ctx.strokeStyle = 'rgba(255,100,0,1)'
    ctx.lineWidth = 4
    ctx.strokeRect(state.roi.x + 2, state.roi.y + 2, state.roi.width - 4, state.roi.height - 4)
    ctx.restore()
  }

  // Draw legend on the overlay-only canvas
  ctx.save()
  const m = state.metrics
  if (state.analysisMode === 'fine-mesh') {
    // Fine-mesh legend (4 statuses: cleaned, partial, blocked, excluded)
    const legendX = 10, legendY = H - 60
    ctx.fillStyle = 'rgba(255,255,255,0.9)'
    ctx.fillRect(legendX, legendY, 360, 52)
    ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1
    ctx.strokeRect(legendX, legendY, 360, 52)
    ctx.font = 'bold 11px system-ui'; ctx.textBaseline = 'middle'
    // Cleaned
    ctx.fillStyle = 'rgba(56,189,248,0.45)'; ctx.fillRect(legendX + 8, legendY + 8, 12, 12)
    ctx.strokeStyle = 'rgba(14,165,233,1)'; ctx.lineWidth = 1.5; ctx.strokeRect(legendX + 8, legendY + 8, 12, 12)
    ctx.fillStyle = '#0369a1'; ctx.fillText('청소 완료', legendX + 26, legendY + 14)
    // Partial
    ctx.fillStyle = 'rgba(251,191,36,0.35)'; ctx.fillRect(legendX + 100, legendY + 8, 12, 12)
    ctx.strokeStyle = 'rgba(217,159,17,1)'; ctx.strokeRect(legendX + 100, legendY + 8, 12, 12)
    ctx.fillStyle = '#a16207'; ctx.fillText('부분 청소', legendX + 118, legendY + 14)
    // Blocked
    ctx.fillStyle = 'rgba(239,68,68,0.4)'; ctx.fillRect(legendX + 196, legendY + 8, 12, 12)
    ctx.strokeStyle = 'rgba(220,38,38,1)'; ctx.strokeRect(legendX + 196, legendY + 8, 12, 12)
    ctx.fillStyle = '#b91c1c'; ctx.fillText('청소 필요', legendX + 214, legendY + 14)
    // Excluded
    ctx.fillStyle = 'rgba(255,200,100,0.3)'; ctx.fillRect(legendX + 288, legendY + 8, 12, 12)
    ctx.strokeStyle = 'rgba(255,165,0,0.7)'; ctx.setLineDash([2,2]); ctx.strokeRect(legendX + 288, legendY + 8, 12, 12); ctx.setLineDash([])
    ctx.fillStyle = '#b45309'; ctx.fillText('제외', legendX + 306, legendY + 14)
    // Stats line
    ctx.font = '10px system-ui'; ctx.fillStyle = '#64748b'
    ctx.fillText(`셀: ${m.totalCells}  완료: ${m.cleanedCells}  필요: ${m.blockedCells}  제외: ${m.excludedCells}  밀도: ${(m.avgDensity * 100).toFixed(1)}%  청소율: ${m.cleaningRateHole.toFixed(1)}%`, legendX + 6, legendY + 40)
  } else {
    // Standard legend
    const legendX = 10, legendY = H - 50
    ctx.fillStyle = 'rgba(255,255,255,0.85)'
    ctx.fillRect(legendX, legendY, 280, 42)
    ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1
    ctx.strokeRect(legendX, legendY, 280, 42)
    ctx.font = 'bold 11px system-ui'; ctx.textBaseline = 'middle'
    ctx.fillStyle = 'rgba(56,189,248,0.6)'; ctx.beginPath(); ctx.arc(legendX + 14, legendY + 14, 6, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = 'rgba(14,165,233,1)'; ctx.lineWidth = 1.5; ctx.stroke()
    ctx.fillStyle = '#0369a1'; ctx.fillText('청소 완료', legendX + 26, legendY + 14)
    ctx.fillStyle = 'rgba(239,68,68,0.55)'; ctx.beginPath(); ctx.arc(legendX + 110, legendY + 14, 6, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = 'rgba(220,38,38,1)'; ctx.lineWidth = 1.5; ctx.stroke()
    ctx.fillStyle = '#b91c1c'; ctx.fillText('청소 필요', legendX + 122, legendY + 14)
    ctx.fillStyle = 'rgba(255,200,100,0.4)'; ctx.beginPath(); ctx.arc(legendX + 206, legendY + 14, 6, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = 'rgba(255,165,0,0.7)'; ctx.lineWidth = 1; ctx.setLineDash([2,2]); ctx.stroke(); ctx.setLineDash([])
    ctx.fillStyle = '#b45309'; ctx.fillText('제외(반사)', legendX + 218, legendY + 14)
    ctx.font = '10px system-ui'; ctx.fillStyle = '#64748b'
    ctx.fillText(`전체: ${m.totalHoles}  완료: ${m.cleanedHoles}  필요: ${m.blockedHoles}  제외: ${m.excludedHoles}  청소율: ${m.cleaningRateHole.toFixed(1)}%`, legendX + 6, legendY + 32)
  }
  ctx.restore()

  // Show the wrapper
  if (ooWrapper) ooWrapper.classList.remove('hidden')
}

// ===================== IMAGE LOAD =====================

const loadImageToCanvas = async (file, source = 'upload') => {
  try {
    if (state.lastObjectUrl) URL.revokeObjectURL(state.lastObjectUrl)
    const url = URL.createObjectURL(file)
    state.lastObjectUrl = url
    let bitmap
    if ('createImageBitmap' in window) bitmap = await createImageBitmap(file)
    else bitmap = await new Promise((res, rej) => { const img = new Image(); img.onload = () => res(img); img.onerror = rej; img.src = url })
    const { meshCanvas, canvasPlaceholder } = elements
    if (!meshCanvas) throw new Error('캔버스 없음')
    const maxW = 1024
    const scale = Math.min(1, maxW / bitmap.width)
    const w = Math.round(bitmap.width * scale), h = Math.round(bitmap.height * scale)
    applyCanvasLayout(w, h)
    meshCanvas.getContext('2d').drawImage(bitmap, 0, 0, w, h)
    state.image = file; state.imageBitmap = bitmap; state.results = null; state.highlightMask = null
    state.grayOrig = null; state.corrected = null; state.imageWidth = w; state.imageHeight = h
    if (canvasPlaceholder) canvasPlaceholder.classList.add('hidden')
    ensureInspectionTitle()
    updateROIControls()
    clearOverlay()
    resetStats()
    setActionButtons({ analyze: true, reset: true, save: false })
    log(`${source === 'camera' ? '카메라 촬영' : '파일 업로드'} 이미지 로드 완료 (${w}x${h}px)`)
  } catch (e) {
    console.error(e); log('이미지 로드 실패', 'error'); resetWorkspace()
  }
}

const clearOverlay = () => {
  const { overlayCanvas } = elements
  if (overlayCanvas) overlayCanvas.getContext('2d')?.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height)
  // Also hide overlay-only canvas
  const ooWrapper = document.getElementById('overlayOnlyWrapper')
  if (ooWrapper) ooWrapper.classList.add('hidden')
  const ooCanvas = elements.overlayOnlyCanvas || document.getElementById('overlayOnlyCanvas')
  if (ooCanvas) { ooCanvas.width = 0; ooCanvas.height = 0 }
}

// ===================== WORKSPACE =====================

const resetWorkspace = () => {
  state.image = null; state.imageBitmap = null; state.results = null; state.cells = null; state.highlightMask = null
  state.grayOrig = null; state.corrected = null; state.analysisMode = 'standard'
  state.isAnalyzing = false; state.pendingReanalysis = false
  state.currentInspectionId = null; state.autoSaved = false
  if (state.lastObjectUrl) { URL.revokeObjectURL(state.lastObjectUrl); state.lastObjectUrl = null }
  clearInspectionTitle(); clearROI(true); stopCameraStream()
  if (elements.imageInput) elements.imageInput.value = ''
  const fn = document.getElementById('selectedFileName')
  if (fn) { fn.textContent = '선택된 파일 없음'; fn.className = 'text-xs text-slate-500 italic' }
  if (elements.saveInspection) elements.saveInspection.textContent = '검사 결과 저장'
  resetCanvasLayout()
  const { meshCanvas, overlayCanvas, canvasPlaceholder } = elements
  if (meshCanvas) meshCanvas.getContext('2d')?.clearRect(0, 0, meshCanvas.width, meshCanvas.height)
  if (overlayCanvas) overlayCanvas.getContext('2d')?.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height)
  if (canvasPlaceholder) canvasPlaceholder.classList.remove('hidden')
  // Hide fine-mesh panel and mode badge
  const dp = document.getElementById('fineMeshDensityPanel')
  if (dp) dp.classList.add('hidden')
  const mb = document.getElementById('analysisModeBadge')
  if (mb) { mb.textContent = ''; mb.classList.add('hidden') }
  resetStats()
  setActionButtons({ analyze: false, reset: false, save: false })
  log('초기화 완료')
}

// ===================== ROI =====================

const updateROIControls = () => {
  if (elements.roiSelectButton) {
    elements.roiSelectButton.disabled = !state.imageBitmap
    elements.roiSelectButton.textContent = state.selectingROI ? '영역 지정 중...' : state.roi ? '영역 다시 지정' : '검사 영역 지정'
  }
  if (elements.roiClearButton) elements.roiClearButton.disabled = !state.roi
  updateOverlayInteraction()
}
const clearROI = (silent = false) => {
  state.roi = null; state.selectingROI = false; state.selectionStart = null; state.selectionPreview = null
  updateROIControls()
  if (!silent) { log('ROI 초기화'); renderOverlay(); if (state.results) analyzeMesh() }
}
const getCanvasPoint = (e) => {
  const c = elements.overlayCanvas; if (!c) return null
  const r = c.getBoundingClientRect()
  return { x: Math.min(Math.max(0, (e.clientX - r.left) * c.width / r.width), c.width), y: Math.min(Math.max(0, (e.clientY - r.top) * c.height / r.height), c.height) }
}
const normalizeRect = (s, e) => ({ x: Math.min(s.x, e.x), y: Math.min(s.y, e.y), width: Math.abs(e.x - s.x), height: Math.abs(e.y - s.y) })
const beginROISelection = () => { if (!state.imageBitmap) return; state.selectingROI = true; state.selectionStart = null; state.selectionPreview = null; updateROIControls(); renderOverlay(); log('영역 지정 모드') }
const finalizeROISelection = () => {
  if (!state.selectionPreview || state.selectionPreview.width < 10 || state.selectionPreview.height < 10) {
    state.selectingROI = false; updateROIControls(); renderOverlay(); return
  }
  state.roi = { ...state.selectionPreview }; state.selectionPreview = null; state.selectionStart = null; state.selectingROI = false
  updateROIControls(); renderOverlay(); log(`ROI: ${Math.round(state.roi.width)}x${Math.round(state.roi.height)}px`)
  if (state.results) analyzeMesh()
}
const handleOverlayPointerDown = (e) => { if (!state.selectingROI) return; e.preventDefault(); const p = getCanvasPoint(e); if (p) state.selectionStart = p }
const handleOverlayPointerMove = (e) => { if (!state.selectingROI || !state.selectionStart) return; e.preventDefault(); const p = getCanvasPoint(e); if (p) { state.selectionPreview = normalizeRect(state.selectionStart, p); renderOverlay() } }
const handleOverlayPointerUp = (e) => { if (!state.selectingROI || !state.selectionStart) return; e.preventDefault(); const p = getCanvasPoint(e); if (p) state.selectionPreview = normalizeRect(state.selectionStart, p); finalizeROISelection() }

// ===================== CAMERA =====================

const updateCameraControls = (active) => {
  if (elements.startCameraButton) elements.startCameraButton.disabled = active
  if (elements.captureCameraButton) elements.captureCameraButton.disabled = !active
  if (elements.stopCameraButton) elements.stopCameraButton.disabled = !active
  if (elements.cameraContainer) elements.cameraContainer.classList.toggle('hidden', !active)
}
const stopCameraStream = () => {
  if (state.cameraStream) { state.cameraStream.getTracks().forEach(t => t.stop()); state.cameraStream = null }
  if (elements.cameraPreview) { elements.cameraPreview.pause?.(); elements.cameraPreview.srcObject = null }
  updateCameraControls(false)
}
const startCameraStream = async () => {
  if (!navigator.mediaDevices?.getUserMedia) { log('카메라 미지원', 'error'); return }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
    state.cameraStream = stream
    if (elements.cameraPreview) { elements.cameraPreview.srcObject = stream; await elements.cameraPreview.play() }
    updateCameraControls(true); log('카메라 시작')
  } catch { updateCameraControls(false); log('카메라 접근 실패', 'error') }
}
const captureCameraFrame = async () => {
  const v = elements.cameraPreview; if (!v || !state.cameraStream || !v.videoWidth) { log('카메라 없음', 'error'); return }
  const c = document.createElement('canvas'); c.width = v.videoWidth; c.height = v.videoHeight
  c.getContext('2d').drawImage(v, 0, 0)
  const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.95))
  if (blob) { const f = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' }); ensureInspectionTitle(); await loadImageToCanvas(f, 'camera') }
}

// ===================== SAVE / EXPORT =====================

const getOriginalImageBase64 = () => { try { return elements.meshCanvas?.toDataURL('image/jpeg', 0.8) } catch { return null } }
const getOverlayImageBase64 = () => { try { return elements.overlayCanvas?.toDataURL('image/png') } catch { return null } }

const autoSaveInspection = async () => {
  const hasData = (state.analysisMode === 'fine-mesh' && state.cells?.length) || state.results?.length
  if (!hasData) return
  const m = state.metrics
  const data = {
    title: state.title || `검사_${formatTimestampLabel()}`,
    totalHoles: m.totalHoles, cleanedHoles: m.cleanedHoles, blockedHoles: m.blockedHoles,
    totalArea: 0, cleanedArea: 0, blockedArea: 0, missedArea: 0,
    cleaningRateArea: m.cleaningRateHole, cleaningRateCount: m.cleaningRateHole,
    thresholdDark: state.thresholds.dark, thresholdGray: state.thresholds.gray, thresholdArea: state.thresholds.areaPercentile,
    manualEditsCount: 0, roiX: state.roi?.x ?? null, roiY: state.roi?.y ?? null,
    roiWidth: state.roi?.width ?? null, roiHeight: state.roi?.height ?? null,
    virtualHolesCount: 0, overlayImage: getOverlayImageBase64(), originalImage: getOriginalImageBase64(),
  }
  try {
    if (state.currentInspectionId) {
      await fetch(`/api/inspections/${state.currentInspectionId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      log(`자동 업데이트 (ID: ${state.currentInspectionId})`)
    } else {
      const res = await (await fetch('/api/inspections', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })).json()
      if (res.success) { state.currentInspectionId = res.id; log(`자동 저장 (ID: ${res.id})`) }
    }
  } catch (e) { console.error(e) }
}

const exportJSON = () => {
  const hasData = (state.analysisMode === 'fine-mesh' && state.cells?.length) || state.results?.length
  if (!hasData) return
  const m = state.metrics
  const obj = {
    exportedAt: new Date().toISOString(),
    title: state.title,
    analysisMode: state.analysisMode,
    qualityGate: m.qualityGate,
    qualityReasons: m.qualityReasons,
    settings: {
      darkThreshold: state.thresholds.dark,
      grayThreshold: state.thresholds.gray,
      areaPercentile: state.thresholds.areaPercentile,
      highlightEnabled: state.highlight.enabled,
      highlightThreshold: state.highlight.threshold,
      highlightDilate: state.highlight.dilate,
      validAreaMin: state.validAreaMin,
      roiGridEnabled: state.roiGrid.enabled,
      roiGridCols: state.roiGrid.cols,
      roiGridRows: state.roiGrid.rows,
    },
    roi: state.roi || null,
    summary: {
      analysisMode: m.analysisMode,
      totalHoles: m.totalHoles,
      cleanedHoles: m.cleanedHoles,
      blockedHoles: m.blockedHoles,
      excludedHoles: m.excludedHoles,
      cleaningRateHole: m.cleaningRateHole,
      validAreaPercent: m.validAreaPercent,
      sharpnessScore: m.sharpnessScore,
      saturationPercent: m.saturationPercent,
      gridPitchX: m.gridPitchX,
      gridPitchY: m.gridPitchY,
      roiHoleCols: m.roiHoleCols,
      roiHoleRows: m.roiHoleRows,
      fftPitch: m.fftPitch,
      avgDensity: m.avgDensity,
      totalCells: m.totalCells,
    },
  }
  if (state.analysisMode === 'fine-mesh' && state.cells?.length) {
    obj.cells = state.cells.map(c => ({
      id: c.id,
      cx: +c.cx.toFixed(1),
      cy: +c.cy.toFixed(1),
      radius: +c.radius.toFixed(1),
      density: +c.density.toFixed(4),
      avgIntensity: +c.avgIntensity.toFixed(1),
      status: c.status,
      pixelCount: c.pixelCount,
      darkCount: c.darkCount,
      hlRatio: +c.hlRatio.toFixed(3),
    }))
  } else {
    obj.holes = (state.results || []).map(h => ({
      id: h.id,
      x: +h.x.toFixed(1),
      y: +h.y.toFixed(1),
      radius: +h.radius.toFixed(1),
      medianOriginal: h.median,
      medianCorrected: h.corrMedian,
      status: h.status,
      area: h.area,
    }))
  }
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' })
  downloadBlob(blob, `${state.title || 'inspection'}_${formatTimestampLabel().replace(/[\s:]/g, '_')}.json`)
  log('JSON 내보내기 완료')
}

const exportCSV = () => {
  const hasData = (state.analysisMode === 'fine-mesh' && state.cells?.length) || state.results?.length
  if (!hasData) return
  let header, rows
  if (state.analysisMode === 'fine-mesh' && state.cells?.length) {
    header = 'id,cx,cy,radius,density,avg_intensity,status,pixel_count,dark_count,hl_ratio'
    rows = state.cells.map(c => `${c.id},${c.cx.toFixed(1)},${c.cy.toFixed(1)},${c.radius.toFixed(1)},${c.density.toFixed(4)},${c.avgIntensity.toFixed(1)},${c.status},${c.pixelCount},${c.darkCount},${c.hlRatio.toFixed(3)}`)
  } else {
    header = 'id,x,y,radius,median_original,median_corrected,status,area'
    rows = (state.results || []).map(h => `${h.id},${h.x.toFixed(1)},${h.y.toFixed(1)},${h.radius.toFixed(1)},${h.median},${h.corrMedian},${h.status},${h.area}`)
  }
  const blob = new Blob([header + '\n' + rows.join('\n')], { type: 'text/csv' })
  downloadBlob(blob, `${state.title || 'inspection'}_${formatTimestampLabel().replace(/[\s:]/g, '_')}.csv`)
  log('CSV 내보내기 완료')
}

const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = filename
  document.body.appendChild(a); a.click(); document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

const downloadOverlayImage = () => {
  if (!state.results?.length) return
  const { overlayCanvas } = elements; if (!overlayCanvas) return
  const exp = document.createElement('canvas'); exp.width = overlayCanvas.width; exp.height = overlayCanvas.height
  const ctx = exp.getContext('2d'); ctx.fillStyle = 'white'; ctx.fillRect(0, 0, exp.width, exp.height)
  ctx.drawImage(overlayCanvas, 0, 0)
  exp.toBlob(b => { if (b) downloadBlob(b, `${state.title || 'overlay'}_${formatTimestampLabel().replace(/[\s:]/g,'_')}.png`) }, 'image/png')
  log('오버레이 다운로드')
}

// ===================== REGISTER / EVENTS =====================

const registerElements = () => {
  const ids = [
    'canvasWrapper','imageInput','analyzeButton','resetButton',
    'thresholdDark','thresholdDarkValue','thresholdGray','thresholdGrayValue',
    'thresholdArea','thresholdAreaValue','logPanel','meshCanvas','overlayCanvas',
    'canvasPlaceholder','saveInspection','inspectionTitle','cameraContainer',
    'cameraPreview','startCameraButton','captureCameraButton','stopCameraButton',
    'roiSelectButton','roiClearButton','downloadOverlayButton',
    'exportJsonButton','exportCsvButton','overlayOnlyCanvas',
    'highlightToggle','highlightThreshold','highlightThresholdValue',
    'highlightDilate','highlightDilateValue','validAreaMin','validAreaMinValue',
    'roiGridToggle','roiGridPreset',
  ]
  ids.forEach(id => { elements[id] = document.getElementById(id) })
  elements.titleInput = elements.inspectionTitle
}

let reclassifyTimer = null
const debouncedReclassify = () => {
  if (reclassifyTimer) clearTimeout(reclassifyTimer)
  reclassifyTimer = setTimeout(() => {
    if (state.results?.length) {
      reclassifyHoles()
    }
  }, 200)
}

const setupEventListeners = () => {
  // Image upload
  elements.imageInput?.addEventListener('change', (e) => {
    const file = e.target.files?.[0]; if (!file) return
    const fn = document.getElementById('selectedFileName')
    const name = file.name
    resetWorkspace()
    if (fn) { fn.textContent = `${name}`; fn.className = 'text-xs text-emerald-600 font-medium' }
    loadImageToCanvas(file, 'upload')
  })
  elements.titleInput?.addEventListener('input', e => applyInspectionTitle(e.target.value ?? ''))
  elements.analyzeButton?.addEventListener('click', analyzeMesh)
  elements.resetButton?.addEventListener('click', () => { if (state.image || state.results || state.cells) resetWorkspace() })

  // Camera
  elements.startCameraButton?.addEventListener('click', startCameraStream)
  elements.captureCameraButton?.addEventListener('click', captureCameraFrame)
  elements.stopCameraButton?.addEventListener('click', () => { stopCameraStream(); log('카메라 종료') })

  // ROI
  elements.roiSelectButton?.addEventListener('click', () => { state.selectingROI ? (state.selectingROI = false, updateROIControls(), renderOverlay()) : beginROISelection() })
  elements.roiClearButton?.addEventListener('click', () => { if (state.roi) clearROI() })
  elements.overlayCanvas?.addEventListener('pointerdown', handleOverlayPointerDown)
  elements.overlayCanvas?.addEventListener('pointermove', handleOverlayPointerMove)
  elements.overlayCanvas?.addEventListener('pointerup', handleOverlayPointerUp)

  // Dark threshold — debounced reclassify (no full re-analysis needed)
  const darkSlider = elements.thresholdDark || document.getElementById('thresholdDark')
  darkSlider?.addEventListener('input', () => {
    updateThresholdLabels()
    debouncedReclassify()
  })

  // Gray threshold — debounced reclassify in fine-mesh mode, full re-analysis in standard
  const graySlider = elements.thresholdGray || document.getElementById('thresholdGray')
  graySlider?.addEventListener('input', () => {
    updateThresholdLabels()
    if (state.analysisMode === 'fine-mesh' && state.cells?.length) {
      debouncedReclassify()
    } else if (state.results) {
      log('설정 변경 → 재분석 필요 (분석 시작 클릭)', 'warning')
    }
  })

  // Other thresholds — need full re-analysis
  const fullReanalysisHandler = () => { updateThresholdLabels(); if (state.results || state.cells) log('설정 변경 → 재분석 필요 (분석 시작 클릭)', 'warning') }
  ;['thresholdArea'].forEach(id => {
    (elements[id] || document.getElementById(id))?.addEventListener('input', fullReanalysisHandler)
  })

  // Highlight settings — need full re-analysis
  ;['highlightThreshold','highlightDilate','validAreaMin'].forEach(id => {
    (elements[id] || document.getElementById(id))?.addEventListener('input', () => {
      updateThresholdLabels()
      if (state.results) log('하이라이트/품질 설정 변경 → 재분석 필요', 'warning')
    })
  })

  // Highlight toggle
  const hlToggle = elements.highlightToggle || document.getElementById('highlightToggle')
  hlToggle?.addEventListener('change', (e) => {
    state.highlight.enabled = e.target.checked
    log(state.highlight.enabled ? '하이라이트 제외 ON' : '하이라이트 제외 OFF')
    if (state.results) log('설정 변경 → 재분석 필요', 'warning')
  })

  // ROI grid toggle
  const rgToggle = elements.roiGridToggle || document.getElementById('roiGridToggle')
  rgToggle?.addEventListener('change', (e) => { state.roiGrid.enabled = e.target.checked })
  const rgPreset = elements.roiGridPreset || document.getElementById('roiGridPreset')
  rgPreset?.addEventListener('change', (e) => {
    const [c, r] = e.target.value.split('x').map(Number)
    state.roiGrid.cols = c; state.roiGrid.rows = r; state.roiGrid.preset = e.target.value
  })

  // Save / Export
  elements.saveInspection?.addEventListener('click', async () => {
    if (!state.results?.length) return
    const btn = elements.saveInspection; if (btn) { btn.disabled = true; btn.textContent = '저장 중...' }
    await autoSaveInspection()
    if (btn) { btn.disabled = false; btn.textContent = '검사 결과 다시 저장' }
  })
  elements.downloadOverlayButton?.addEventListener('click', downloadOverlayImage)
  ;(elements.exportJsonButton || document.getElementById('exportJsonButton'))?.addEventListener('click', exportJSON)
  ;(elements.exportCsvButton || document.getElementById('exportCsvButton'))?.addEventListener('click', exportCSV)

  // Tabs
  document.querySelectorAll('.tab-button').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.getAttribute('data-tab')
      document.querySelectorAll('.tab-button').forEach(b => { b.classList.remove('active','border-emerald-600','text-emerald-600'); b.classList.add('border-transparent','text-slate-600') })
      btn.classList.add('active','border-emerald-600','text-emerald-600'); btn.classList.remove('border-transparent','text-slate-600')
      document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'))
      const tc = document.getElementById(`content-${tab}`); if (tc) tc.classList.remove('hidden')
      if (tab === 'history') loadInspectionHistory()
    })
  })
}

// ===================== INSPECTION HISTORY =====================

const loadInspectionHistory = async () => {
  const hl = document.getElementById('historyList'); if (!hl) return
  hl.innerHTML = '<p class="text-center text-sm text-slate-500">로딩 중...</p>'
  try {
    const res = await (await fetch('/api/inspections?limit=50&offset=0')).json()
    if (res.success && res.data?.length) {
      hl.innerHTML = res.data.map(i => `
        <div class="rounded-lg border border-slate-200 bg-slate-50 p-4 hover:border-emerald-500 hover:shadow-md transition">
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <h3 class="font-semibold text-slate-900">${i.title || '제목 없음'}</h3>
              <p class="mt-1 text-xs text-slate-600">${new Date(i.created_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}</p>
            </div>
            <div class="text-right">
              <p class="text-2xl font-bold text-emerald-600">${i.cleaning_rate_area?.toFixed(1) ?? '—'}%</p>
              <p class="text-xs text-slate-600">청소율</p>
            </div>
          </div>
          <div class="mt-3 flex justify-end">
            <a href="/history/${i.id}" class="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500">상세 보기 →</a>
          </div>
        </div>
      `).join('')
    } else { hl.innerHTML = '<p class="text-center text-sm text-slate-500">이력 없음</p>' }
  } catch { hl.innerHTML = '<p class="text-center text-sm text-rose-600">로딩 실패</p>' }
}

// ===================== INIT =====================

window.addEventListener('DOMContentLoaded', () => {
  registerElements()
  updateThresholdLabels()
  updateCameraControls(false)
  resetStats()
  updateROIControls()
  setActionButtons({ analyze: false, reset: false, save: false })
  setupEventListeners()
})
