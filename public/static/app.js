const defaultMetrics = () => ({
  totalCount: 0,
  cleanedCount: 0,
  blockedCount: 0,
  cleaningRateCount: 0,
  totalArea: 0,
  cleanedArea: 0,
  blockedArea: 0,
  missedArea: 0,
  cleaningRateArea: 0
})

const state = {
  image: null,
  imageBitmap: null,
  results: null,
  hexMask: null,
  candidateMask: null,
  missedMask: null,
  virtualHoles: null,
  title: '',
  cameraStream: null,
  lastObjectUrl: null,
  thresholds: {
    dark: 80,
    gray: 145,
    areaPercentile: 50
  },
  metrics: defaultMetrics(),
  isAnalyzing: false,
  pendingReanalysis: false,
  roi: null,
  selectingROI: false,
  selectionStart: null,
  selectionPreview: null,
  convertMissedToCleaned: true,  // 기본값: 체크됨
  currentInspectionId: null,  // 현재 검사 레코드 ID (자동 저장용)
  autoSaved: false  // 자동 저장 여부 플래그
}

const elements = {}

const updateOverlayInteraction = () => {
  const overlay = elements.overlayCanvas
  if (!overlay) return

  if (state.selectingROI) {
    overlay.style.cursor = 'crosshair'
  } else {
    overlay.style.cursor = 'default'
  }
}

const applyCanvasLayout = (width, height) => {
  const { canvasWrapper, meshCanvas, overlayCanvas } = elements
  if (!meshCanvas) return

  if (canvasWrapper) {
    canvasWrapper.style.aspectRatio = `${width} / ${height}`
  }

  meshCanvas.width = width
  meshCanvas.height = height
  meshCanvas.style.width = '100%'
  meshCanvas.style.height = '100%'

  if (overlayCanvas) {
    overlayCanvas.width = width
    overlayCanvas.height = height
    overlayCanvas.style.width = '100%'
    overlayCanvas.style.height = '100%'
  }
}

const resetCanvasLayout = () => {
  const { canvasWrapper, meshCanvas, overlayCanvas } = elements
  if (canvasWrapper) {
    canvasWrapper.style.removeProperty('aspect-ratio')
  }
  if (meshCanvas) {
    meshCanvas.width = 0
    meshCanvas.height = 0
    meshCanvas.style.removeProperty('width')
    meshCanvas.style.removeProperty('height')
  }
  if (overlayCanvas) {
    overlayCanvas.width = 0
    overlayCanvas.height = 0
    overlayCanvas.style.removeProperty('width')
    overlayCanvas.style.removeProperty('height')
  }
}

const log = (message, level = 'info') => {
  if (!elements.logPanel) return
  const timestamp = new Date().toLocaleTimeString('ko-KR', { hour12: false })
  const line = document.createElement('div')
  line.className = `flex items-start gap-2 ${level === 'error' ? 'text-rose-300' : level === 'warning' ? 'text-amber-300' : 'text-slate-300'}`
  line.innerHTML = `<span class="text-slate-500">${timestamp}</span><span>${message}</span>`
  elements.logPanel.prepend(line)
}

const updateThresholdLabels = () => {
  if (elements.thresholdDark && elements.thresholdDarkValue) {
    const value = Number(elements.thresholdDark.value)
    elements.thresholdDarkValue.textContent = value.toString()
    state.thresholds.dark = value
  }
  if (elements.thresholdGray && elements.thresholdGrayValue) {
    const value = Number(elements.thresholdGray.value)
    elements.thresholdGrayValue.textContent = value.toString()
    state.thresholds.gray = value
  }
  if (elements.thresholdArea && elements.thresholdAreaValue) {
    const value = Number(elements.thresholdArea.value)
    const topShare = Math.max(0, 100 - value)
    elements.thresholdAreaValue.textContent = `상위 ${topShare}% (P${value})`
    state.thresholds.areaPercentile = value
  }
}

const setActionButtons = ({ analyze, reset, edit, undo, save }) => {
  if (elements.analyzeButton) elements.analyzeButton.disabled = !analyze
  if (elements.resetButton) elements.resetButton.disabled = !reset
  if (elements.toggleEditMode) {
    elements.toggleEditMode.disabled = !edit
    if (!edit) {
      elements.toggleEditMode.textContent = '편집 모드 전환'
      if (state.editMode) {
        state.editMode = false
      }
    }
  }
  if (elements.undoButton) elements.undoButton.disabled = !undo
  if (elements.saveInspection) elements.saveInspection.disabled = !save
  if (elements.downloadOverlayButton) elements.downloadOverlayButton.disabled = !save
  if (elements.convertMissedToCleaned) elements.convertMissedToCleaned.disabled = !save
  updateOverlayInteraction()
}

const resetStats = () => {
  state.metrics = defaultMetrics()
  if (elements.totalHoles) elements.totalHoles.textContent = '0'
  if (elements.cleanedCount) elements.cleanedCount.textContent = '0'
  if (elements.blockedCount) elements.blockedCount.textContent = '0'
  if (elements.totalArea) elements.totalArea.textContent = '0'
  if (elements.cleanedArea) elements.cleanedArea.textContent = '0'
  if (elements.blockedArea) elements.blockedArea.textContent = '0'
  if (elements.missedArea) elements.missedArea.textContent = '0'
  if (elements.cleaningRate) elements.cleaningRate.textContent = '0%'
  if (elements.countCleaningRate) elements.countCleaningRate.textContent = '0%'
}

const clearOverlay = () => {
  const { overlayCanvas } = elements
  if (!overlayCanvas) return
  const ctx = overlayCanvas.getContext('2d')
  ctx?.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height)
}

const resetCanvas = () => {
  const { meshCanvas, overlayCanvas, canvasPlaceholder } = elements
  if (meshCanvas && meshCanvas.getContext) {
    const ctx = meshCanvas.getContext('2d')
    ctx?.clearRect(0, 0, meshCanvas.width || meshCanvas.clientWidth, meshCanvas.height || meshCanvas.clientHeight)
  }
  if (overlayCanvas) {
    clearOverlay()
  }
  resetCanvasLayout()
  if (canvasPlaceholder) {
    canvasPlaceholder.classList.remove('hidden')
  }
}

const resetWorkspace = () => {
  state.image = null
  state.imageBitmap = null
  state.results = null
  state.hexMask = null
  state.candidateMask = null
  state.missedMask = null
  state.editMode = false
  state.manualEdits = []
  state.isAnalyzing = false
  state.pendingReanalysis = false
  state.convertMissedToCleaned = true  // 기본값: 체크됨
  state.currentInspectionId = null  // 자동 저장 ID 초기화
  state.autoSaved = false  // 자동 저장 플래그 초기화
  if (state.lastObjectUrl) {
    URL.revokeObjectURL(state.lastObjectUrl)
    state.lastObjectUrl = null
  }
  clearInspectionTitle()
  clearROI(true)
  stopCameraStream()
  if (elements.imageInput) {
    elements.imageInput.value = ''
  }
  // 파일명 표시 초기화
  const fileNameDisplay = document.getElementById('selectedFileName')
  if (fileNameDisplay) {
    fileNameDisplay.textContent = '선택된 파일 없음'
    fileNameDisplay.className = 'text-xs text-slate-500 italic'
  }
  if (elements.convertMissedToCleaned) {
    elements.convertMissedToCleaned.checked = true  // 기본값: 체크됨
  }
  // 저장 버튼 텍스트 초기화
  if (elements.saveInspection) {
    elements.saveInspection.textContent = '검사 결과 저장'
  }
  resetCanvas()
  resetStats()
  setActionButtons({ analyze: false, reset: false, edit: false, undo: false, save: false })
  log('작업 공간을 초기화했습니다.')
}

const registerElements = () => {
  elements.canvasWrapper = document.getElementById('canvasWrapper')
  elements.imageInput = document.getElementById('imageInput')
  elements.analyzeButton = document.getElementById('analyzeButton')
  elements.resetButton = document.getElementById('resetButton')
  elements.thresholdDark = document.getElementById('thresholdDark')
  elements.thresholdDarkValue = document.getElementById('thresholdDarkValue')
  elements.thresholdGray = document.getElementById('thresholdGray')
  elements.thresholdGrayValue = document.getElementById('thresholdGrayValue')
  elements.thresholdArea = document.getElementById('thresholdArea')
  elements.thresholdAreaValue = document.getElementById('thresholdAreaValue')
  elements.logPanel = document.getElementById('logPanel')
  elements.meshCanvas = document.getElementById('meshCanvas')
  elements.overlayCanvas = document.getElementById('overlayCanvas')
  elements.canvasPlaceholder = document.getElementById('canvasPlaceholder')
  elements.totalHoles = document.getElementById('totalHoles')
  elements.cleanedCount = document.getElementById('cleanedCount')
  elements.blockedCount = document.getElementById('blockedCount')
  elements.totalArea = document.getElementById('totalArea')
  elements.cleanedArea = document.getElementById('cleanedArea')
  elements.blockedArea = document.getElementById('blockedArea')
  elements.missedArea = document.getElementById('missedArea')
  elements.cleaningRate = document.getElementById('cleaningRate')
  elements.countCleaningRate = document.getElementById('countCleaningRate')
  elements.saveInspection = document.getElementById('saveInspection')
  elements.titleInput = document.getElementById('inspectionTitle')
  elements.cameraContainer = document.getElementById('cameraContainer')
  elements.cameraPreview = document.getElementById('cameraPreview')
  elements.startCameraButton = document.getElementById('startCameraButton')
  elements.captureCameraButton = document.getElementById('captureCameraButton')
  elements.stopCameraButton = document.getElementById('stopCameraButton')
  elements.roiSelectButton = document.getElementById('roiSelectButton')
  elements.roiClearButton = document.getElementById('roiClearButton')
  elements.downloadOverlayButton = document.getElementById('downloadOverlayButton')
  elements.convertMissedToCleaned = document.getElementById('convertMissedToCleaned')
}

const updateStats = () => {
  const metrics = state.metrics ?? defaultMetrics()
  const {
    totalCount,
    cleanedCount,
    blockedCount,
    totalArea,
    cleanedArea,
    blockedArea,
    missedArea,
    cleaningRateArea,
    cleaningRateCount
  } = metrics

  if (elements.totalHoles) elements.totalHoles.textContent = totalCount.toLocaleString('ko-KR')
  if (elements.cleanedCount) elements.cleanedCount.textContent = cleanedCount.toLocaleString('ko-KR')
  if (elements.blockedCount) elements.blockedCount.textContent = blockedCount.toLocaleString('ko-KR')
  if (elements.totalArea) elements.totalArea.textContent = totalArea.toLocaleString('ko-KR')
  if (elements.cleanedArea) elements.cleanedArea.textContent = cleanedArea.toLocaleString('ko-KR')
  if (elements.blockedArea) elements.blockedArea.textContent = blockedArea.toLocaleString('ko-KR')
  if (elements.missedArea) elements.missedArea.textContent = missedArea.toLocaleString('ko-KR')
  if (elements.cleaningRate) elements.cleaningRate.textContent = `${cleaningRateArea.toFixed(1)}%`
  if (elements.countCleaningRate) elements.countCleaningRate.textContent = `${cleaningRateCount.toFixed(1)}%`
}

const countMaskPixels = (mask) => {
  if (!mask || !mask.length) return 0
  let count = 0
  for (let i = 0; i < mask.length; i++) {
    if (mask[i]) count++
  }
  return count
}

const recalculateMetrics = () => {
  const holes = state.results ?? []
  let cleanedCount = 0
  let blockedCount = 0
  let cleanedAreaPixels = 0
  let blockedAreaPixels = 0

  // 픽셀 기반 면적 계산을 위한 마스크 생성
  const canvas = elements.meshCanvas
  if (!canvas) {
    return defaultMetrics()
  }
  
  const width = canvas.width
  const height = canvas.height
  const totalPixels = width * height
  
  // 청소 완료/필요 영역의 실제 픽셀 마스크 생성
  const cleanedMask = new Uint8Array(totalPixels)
  const blockedMask = new Uint8Array(totalPixels)
  
  for (const hole of holes) {
    // 구멍 개수 카운트
    if (hole.status === 'cleaned') {
      cleanedCount++
    } else if (hole.status === 'blocked') {
      blockedCount++
    } else {
      blockedCount++
    }
    
    // 각 구멍의 픽셀을 해당 마스크에 표시
    const centerX = hole.x
    const centerY = hole.y
    const radius = Math.max(2, hole.radius * 1.15)  // 실제 구멍 크기
    const radiusSquared = radius * radius
    
    const minX = Math.max(0, Math.floor(centerX - radius))
    const maxX = Math.min(width - 1, Math.ceil(centerX + radius))
    const minY = Math.max(0, Math.floor(centerY - radius))
    const maxY = Math.min(height - 1, Math.ceil(centerY + radius))
    
    for (let y = minY; y <= maxY; y++) {
      const dy = y - centerY
      const dySquared = dy * dy
      const rowOffset = y * width
      
      for (let x = minX; x <= maxX; x++) {
        const dx = x - centerX
        if (dx * dx + dySquared <= radiusSquared) {
          const index = rowOffset + x
          if (hole.status === 'cleaned') {
            cleanedMask[index] = 1
          } else {
            blockedMask[index] = 1
          }
        }
      }
    }
  }
  
  // ROI 영역만 카운트
  const roiArea = state.roi ? state.roi.width * state.roi.height : totalPixels
  
  if (state.roi) {
    const startX = Math.max(0, Math.floor(state.roi.x))
    const startY = Math.max(0, Math.floor(state.roi.y))
    const endX = Math.min(width, Math.ceil(state.roi.x + state.roi.width))
    const endY = Math.min(height, Math.ceil(state.roi.y + state.roi.height))
    
    for (let y = startY; y < endY; y++) {
      const rowOffset = y * width
      for (let x = startX; x < endX; x++) {
        const index = rowOffset + x
        if (cleanedMask[index]) cleanedAreaPixels++
        if (blockedMask[index]) blockedAreaPixels++
      }
    }
  } else {
    // ROI가 없으면 전체 영역
    cleanedAreaPixels = countMaskPixels(cleanedMask)
    blockedAreaPixels = countMaskPixels(blockedMask)
  }
  
  // 미분류 후보 면적 (체크박스가 켜져있으면 0)
  let missedPixels = 0
  if (!state.convertMissedToCleaned && state.missedMask) {
    if (state.roi) {
      const startX = Math.max(0, Math.floor(state.roi.x))
      const startY = Math.max(0, Math.floor(state.roi.y))
      const endX = Math.min(width, Math.ceil(state.roi.x + state.roi.width))
      const endY = Math.min(height, Math.ceil(state.roi.y + state.roi.height))
      
      for (let y = startY; y < endY; y++) {
        const rowOffset = y * width
        for (let x = startX; x < endX; x++) {
          const index = rowOffset + x
          if (state.missedMask[index]) missedPixels++
        }
      }
    } else {
      missedPixels = countMaskPixels(state.missedMask)
    }
  }
  
  // 청소율 계산: 전체 ROI 면적 기준
  const inspectionArea = roiArea - missedPixels  // 검사 가능 면적 (미분류 제외)
  
  const cleanedArea = cleanedAreaPixels
  // 청소 필요 면적 및 골격 제외 면적 = 전체 면적 - 파란색 점 면적
  const blockedArea = roiArea - cleanedAreaPixels
  const totalArea = roiArea
  const totalCount = holes.length
  
  const cleaningRateCount = totalCount ? (cleanedCount / totalCount) * 100 : 0
  const cleaningRateArea = inspectionArea > 0 ? (cleanedArea / inspectionArea) * 100 : 0
  
  console.log('[Metrics Debug - Pixel-based Calculation]', {
    cleanedCount, blockedCount, totalCount,
    cleanedAreaPixels, blockedAreaPixels, missedPixels,
    roiArea, inspectionArea,
    cleanedArea, blockedArea, totalArea,
    cleaningRateCount: cleaningRateCount.toFixed(1),
    cleaningRateArea: cleaningRateArea.toFixed(1)
  })
  
  console.log(`[청소율 계산 공식 - 전체 ROI 면적 기준]`)
  console.log(`청소율 = (청소 완료 픽셀 면적) / (ROI 면적 - 미분류 후보 면적) × 100`)
  console.log(`청소율 = ${cleanedArea.toLocaleString('ko-KR')} px / (${roiArea.toLocaleString('ko-KR')} px - ${missedPixels.toLocaleString('ko-KR')} px) × 100`)
  console.log(`청소율 = ${cleanedArea.toLocaleString('ko-KR')} px / ${inspectionArea.toLocaleString('ko-KR')} px × 100`)
  console.log(`청소율 = ${cleaningRateArea.toFixed(1)}%`)
  console.log(``)
  console.log(`[면적 분석]`)
  console.log(`총 ROI 면적: ${roiArea.toLocaleString('ko-KR')} px (100%)`)
  console.log(`청소 완료 면적 (파란색 점): ${cleanedArea.toLocaleString('ko-KR')} px (${(cleanedArea/roiArea*100).toFixed(2)}%)`)
  console.log(`청소 필요 면적 및 골격 제외 면적 (전체 - 파란색): ${blockedArea.toLocaleString('ko-KR')} px (${(blockedArea/roiArea*100).toFixed(2)}%)`)
  console.log(`미분류 면적: ${missedPixels.toLocaleString('ko-KR')} px (${(missedPixels/roiArea*100).toFixed(2)}%)`)

  state.metrics = {
    totalCount,
    cleanedCount,
    blockedCount,
    cleaningRateCount,
    totalArea,
    cleanedArea,
    blockedArea,
    missedArea: missedPixels,
    cleaningRateArea
  }
  
  return state.metrics
}

const formatTimestampLabel = (date = new Date()) => {
  return date
    .toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    })
    .replace(/\./g, '-')
    .replace('- ', ' ')
}

const applyInspectionTitle = (title) => {
  state.title = title
  if (elements.titleInput) {
    elements.titleInput.value = title
  }
}

const ensureInspectionTitle = () => {
  if (state.title && state.title.trim().length > 0) return state.title
  const fallback = `청소 검사 ${formatTimestampLabel()}`
  applyInspectionTitle(fallback)
  return fallback
}

const clearInspectionTitle = () => {
  state.title = ''
  if (elements.titleInput) {
    elements.titleInput.value = ''
  }
}

const updateROIControls = () => {
  if (elements.roiSelectButton) {
    const hasImage = !!state.imageBitmap
    elements.roiSelectButton.disabled = !hasImage
    elements.roiSelectButton.textContent = state.selectingROI
      ? '영역 지정 중...'
      : state.roi
        ? '영역 다시 지정'
        : '검사 영역 지정'
  }
  if (elements.roiClearButton) {
    elements.roiClearButton.disabled = !state.roi
  }
  updateOverlayInteraction()
}

const clearROI = (silent = false) => {
  state.roi = null
  state.selectingROI = false
  state.selectionStart = null
  state.selectionPreview = null
  updateROIControls()
  if (!silent) {
    log('검사 영역을 초기화했습니다. 전체 영역을 대상으로 분석합니다.', 'info')
  }
  if (elements.overlayCanvas) {
    renderOverlay()
  }
  if (!silent && state.imageBitmap) {
    if (state.results && state.results.length) {
      if (state.isAnalyzing) {
        state.pendingReanalysis = true
        log('현재 진행 중인 분석이 완료되면 전체 영역 기준으로 자동 재분석합니다.', 'info')
      } else {
        log('전체 영역 기준 재분석을 실행합니다.', 'info')
        analyzeMesh()
      }
    }
  }
}

const getCanvasPoint = (event) => {
  const canvas = elements.overlayCanvas
  if (!canvas) return null
  const rect = canvas.getBoundingClientRect()
  const scaleX = canvas.width / rect.width
  const scaleY = canvas.height / rect.height
  const x = Math.min(Math.max(0, (event.clientX - rect.left) * scaleX), canvas.width)
  const y = Math.min(Math.max(0, (event.clientY - rect.top) * scaleY), canvas.height)
  return { x, y }
}

const normalizeRect = (start, end) => {
  const x = Math.min(start.x, end.x)
  const y = Math.min(start.y, end.y)
  const width = Math.abs(end.x - start.x)
  const height = Math.abs(end.y - start.y)
  return { x, y, width, height }
}

const beginROISelection = () => {
  if (!state.imageBitmap) {
    log('먼저 분석할 이미지를 불러와 주세요.', 'warning')
    return
  }
  state.selectingROI = true
  state.selectionStart = null
  state.selectionPreview = null
  state.editMode = false
  if (elements.toggleEditMode) {
    elements.toggleEditMode.textContent = '편집 모드 전환'
  }
  updateROIControls()
  renderOverlay()
  log('🎯 영역 지정 모드 활성화: 캔버스에서 드래그하여 검사 영역을 선택하세요.', 'info')
}

const finalizeROISelection = () => {
  if (!state.selectionStart || !state.selectionPreview) {
    state.selectingROI = false
    updateROIControls()
    return
  }
  const preview = state.selectionPreview
  if (preview.width < 10 || preview.height < 10) {
    log('선택 영역이 너무 작습니다. 더 넓은 영역을 드래그해 주세요.', 'warning')
    state.selectionPreview = null
    state.selectionStart = null
    state.selectingROI = false
    updateROIControls()
    renderOverlay()
    return
  }
  state.roi = { ...preview }
  state.selectionPreview = null
  state.selectionStart = null
  state.selectingROI = false
  updateROIControls()
  
  const roiAreaPx = Math.round(state.roi.width * state.roi.height)
  log(
    `✅ 검사 영역 설정 완료: ${Math.round(state.roi.width)}×${Math.round(state.roi.height)}px (면적: ${roiAreaPx.toLocaleString('ko-KR')}px²)`,
    'info'
  )
  renderOverlay()
  if (state.results && state.results.length) {
    if (state.isAnalyzing) {
      state.pendingReanalysis = true
      log('ROI가 업데이트되어 현재 분석 종료 후 자동으로 다시 실행됩니다.', 'info')
    } else {
      log('선택된 영역 기준으로 재분석을 실행합니다.', 'info')
      analyzeMesh()
    }
  } else {
    log('선택된 영역을 기준으로 분석을 실행하려면 “분석 시작” 버튼을 눌러 주세요.', 'warning')
  }
}

const cancelROISelection = () => {
  state.selectingROI = false
  state.selectionStart = null
  state.selectionPreview = null
  updateROIControls()
  renderOverlay()
  log('영역 지정이 취소되었습니다.', 'info')
}

const updateROISelectionPreview = (current) => {
  if (!state.selectionStart) return
  const rect = normalizeRect(state.selectionStart, current)
  state.selectionPreview = rect
  
  const { overlayCanvas } = elements
  if (!overlayCanvas) return
  const ctx = overlayCanvas.getContext('2d')
  if (!ctx) return
  
  renderOverlay()
}

const handleOverlayPointerDown = (event) => {
  if (!state.selectingROI) return
  event.preventDefault()
  event.stopPropagation()
  const point = getCanvasPoint(event)
  if (!point) return
  state.selectionStart = point
  state.selectionPreview = { x: point.x, y: point.y, width: 0, height: 0 }
  renderOverlay()
}

const handleOverlayPointerMove = (event) => {
  if (!state.selectingROI || !state.selectionStart) return
  event.preventDefault()
  event.stopPropagation()
  const point = getCanvasPoint(event)
  if (!point) return
  updateROISelectionPreview(point)
}

const handleOverlayPointerUp = (event) => {
  if (!state.selectingROI || !state.selectionStart) return
  event.preventDefault()
  event.stopPropagation()
  const point = getCanvasPoint(event)
  if (point) {
    updateROISelectionPreview(point)
  }
  finalizeROISelection()
}

const handleOverlayPointerLeave = (event) => {
  if (!state.selectingROI || !state.selectionStart) return
  event.preventDefault()
  event.stopPropagation()
}

const updateCameraControls = (active) => {
  if (elements.startCameraButton) elements.startCameraButton.disabled = active
  if (elements.captureCameraButton) elements.captureCameraButton.disabled = !active
  if (elements.stopCameraButton) elements.stopCameraButton.disabled = !active
  if (elements.cameraContainer) elements.cameraContainer.classList.toggle('hidden', !active)
}

const stopCameraStream = () => {
  if (state.cameraStream) {
    state.cameraStream.getTracks().forEach((track) => track.stop())
    state.cameraStream = null
  }
  if (elements.cameraPreview) {
    elements.cameraPreview.pause?.()
    elements.cameraPreview.srcObject = null
  }
  updateCameraControls(false)
}

const startCameraStream = async () => {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    log('해당 기기에서는 카메라 촬영을 지원하지 않습니다.', 'error')
    return
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
    state.cameraStream = stream
    if (elements.cameraPreview) {
      elements.cameraPreview.srcObject = stream
      await elements.cameraPreview.play()
    }
    updateCameraControls(true)
    log('카메라 미리보기를 시작했습니다. 프레임이 안정된 후 “촬영”을 눌러 주세요.')
  } catch (error) {
    console.error(error)
    updateCameraControls(false)
    log('카메라 접근이 거부되었거나 사용할 수 없습니다.', 'error')
  }
}

const captureCameraFrame = async () => {
  if (!elements.cameraPreview || !state.cameraStream) {
    log('카메라가 활성화되어 있지 않습니다.', 'error')
    return
  }
  const video = elements.cameraPreview
  if (!video.videoWidth || !video.videoHeight) {
    log('카메라 프레임을 불러오지 못했습니다. 잠시 후 다시 시도하세요.', 'error')
    return
  }

  const canvas = document.createElement('canvas')
  canvas.width = video.videoWidth
  canvas.height = video.videoHeight
  const ctx = canvas.getContext('2d')
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.95))
  if (!blob) {
    log('카메라 캡처에 실패했습니다.', 'error')
    return
  }

  const timestamp = Date.now()
  const fileName = `camera-capture-${timestamp}.jpg`
  const file = new File([blob], fileName, { type: 'image/jpeg', lastModified: timestamp })

  ensureInspectionTitle()
  await loadImageToCanvas(file, 'camera')
  log('카메라 촬영 이미지를 캔버스에 불러왔습니다.')
}

const drawMaskLayers = () => {
  const { overlayCanvas } = elements
  if (!overlayCanvas) return
  const ctx = overlayCanvas.getContext('2d')
  if (!ctx) return

  const width = overlayCanvas.width
  const height = overlayCanvas.height
  if (!width || !height) return

  const totalPixels = width * height
  const { hexMask, missedMask, results } = state

  const coverMask = new Uint8Array(totalPixels)
  if (hexMask && hexMask.length === totalPixels) {
    coverMask.set(hexMask)
  }

  const imageData = ctx.createImageData(width, height)
  const data = imageData.data

  // 노란색 hexMask 렌더링 제거 - 파란색/빨간색 점만 표시
  // if (hexMask && hexMask.length === totalPixels) {
  //   for (let i = 0; i < totalPixels; i++) {
  //     if (hexMask[i] > 0) {
  //       const idx = i * 4
  //       data[idx] = Math.max(data[idx], 255)      // R: Yellow
  //       data[idx + 1] = Math.max(data[idx + 1], 220)  // G: Yellow
  //       data[idx + 2] = Math.max(data[idx + 2], 0)    // B: Yellow
  //       data[idx + 3] = Math.max(data[idx + 3], 110)
  //       coverMask[i] = 1
  //     }
  //   }
  // }

  // 미검출 후보 표시 (체크박스가 꺼져있을 때만)
  if (!state.convertMissedToCleaned && missedMask && missedMask.length === totalPixels) {
    for (let i = 0; i < totalPixels; i++) {
      if (missedMask[i] > 0) {
        const idx = i * 4
        data[idx] = 48
        data[idx + 1] = 255
        data[idx + 2] = 128
        data[idx + 3] = 200
        coverMask[i] = 1
      }
    }
  }

  if (results && results.length) {
    for (const hole of results) {
      const centerX = hole.x
      const centerY = hole.y
      const radius = Math.max(2, hole.radius * 1.15)
      const radiusSquared = radius * radius
      const minX = Math.max(0, Math.floor(centerX - radius))
      const maxX = Math.min(width - 1, Math.ceil(centerX + radius))
      const minY = Math.max(0, Math.floor(centerY - radius))
      const maxY = Math.min(height - 1, Math.ceil(centerY + radius))

      for (let y = minY; y <= maxY; y++) {
        const dy = y - centerY
        const rowOffset = y * width
        const dySquared = dy * dy
        for (let x = minX; x <= maxX; x++) {
          const dx = x - centerX
          if (dx * dx + dySquared <= radiusSquared) {
            coverMask[rowOffset + x] = 1
          }
        }
      }
    }
  }

  // 핑크색 배경 제거 - 점이 없는 영역은 투명하게 유지
  // const pinkAlpha = 45
  // for (let i = 0; i < totalPixels; i++) {
  //   if (!coverMask[i]) {
  //     const idx = i * 4
  //     data[idx] = Math.max(data[idx], 255)
  //     data[idx + 1] = Math.max(data[idx + 1], 105)
  //     data[idx + 2] = Math.max(data[idx + 2], 180)
  //     data[idx + 3] = Math.max(data[idx + 3], pinkAlpha)
  //   }
  // }

  ctx.putImageData(imageData, 0, 0)
  drawROIHighlight(ctx)
}

const drawROIHighlight = (ctx) => {
  const roi = state.roi
  const preview = state.selectionPreview

  ctx.save()
  
  if (roi && !state.selectingROI) {
    // ROI 내부는 투명하게 (채우기 제거)
    // ctx.fillStyle = 'rgba(255, 140, 0, 0.15)'
    ctx.strokeStyle = 'rgba(255, 100, 0, 1.0)'
    ctx.lineWidth = 10
    ctx.setLineDash([])
    // ctx.fillRect(roi.x, roi.y, roi.width, roi.height)
    ctx.strokeRect(roi.x + 5, roi.y + 5, roi.width - 10, roi.height - 10)
    
    ctx.fillStyle = 'rgba(255, 100, 0, 0.95)'
    ctx.font = 'bold 14px system-ui, sans-serif'
    ctx.textBaseline = 'top'
    const label = `ROI: ${Math.round(roi.width)}×${Math.round(roi.height)}px`
    const metrics = ctx.measureText(label)
    const padding = 6
    const labelX = roi.x + 4
    const labelY = roi.y + 4
    ctx.fillRect(labelX, labelY, metrics.width + padding * 2, 20)
    ctx.fillStyle = 'white'
    ctx.fillText(label, labelX + padding, labelY + 4)
  }
  
  if (preview && state.selectingROI) {
    ctx.setLineDash([10, 5])
    // 드래그 중 미리보기도 투명하게 (채우기 제거)
    // ctx.fillStyle = 'rgba(255, 215, 0, 0.20)'
    ctx.strokeStyle = 'rgba(255, 165, 0, 1.0)'
    ctx.lineWidth = 10
    // ctx.fillRect(preview.x, preview.y, preview.width, preview.height)
    ctx.strokeRect(preview.x + 1, preview.y + 1, preview.width - 2, preview.height - 2)
    
    if (preview.width > 40 && preview.height > 30) {
      ctx.fillStyle = 'rgba(255, 165, 0, 0.95)'
      ctx.font = 'bold 13px system-ui, sans-serif'
      ctx.textBaseline = 'top'
      const label = `${Math.round(preview.width)}×${Math.round(preview.height)}px`
      const metrics = ctx.measureText(label)
      const padding = 5
      const labelX = preview.x + preview.width / 2 - metrics.width / 2 - padding
      const labelY = preview.y + preview.height / 2 - 10
      ctx.fillRect(labelX, labelY, metrics.width + padding * 2, 20)
      ctx.fillStyle = 'white'
      ctx.fillText(label, labelX + padding, labelY + 4)
    }
  }
  
  ctx.restore()
}

// Helper function to check if a virtual hole overlaps with green masks
const virtualHoleOverlapsGreenMask = (vhole, width, height, hexMask, missedMask) => {
  if (!hexMask && !missedMask) return false
  
  // Check a circular area around the virtual hole center
  const centerX = Math.round(vhole.x)
  const centerY = Math.round(vhole.y)
  const checkRadius = Math.round(vhole.radius * 0.8) // Same radius used for drawing
  const radiusSquared = checkRadius * checkRadius
  
  // Sample pixels in the circular area
  let greenPixelCount = 0
  let totalSampled = 0
  
  for (let dy = -checkRadius; dy <= checkRadius; dy++) {
    const y = centerY + dy
    if (y < 0 || y >= height) continue
    
    const dySquared = dy * dy
    const rowOffset = y * width
    
    for (let dx = -checkRadius; dx <= checkRadius; dx++) {
      const x = centerX + dx
      if (x < 0 || x >= width) continue
      
      // Check if pixel is within the circle
      if (dx * dx + dySquared <= radiusSquared) {
        const index = rowOffset + x
        totalSampled++
        
        // Check if this pixel is part of hex mask or missed mask
        if ((hexMask && hexMask[index] > 0) || (missedMask && missedMask[index] > 0)) {
          greenPixelCount++
        }
      }
    }
  }
  
  // If more than 30% of the virtual hole area overlaps with green masks, skip drawing it
  const overlapRatio = totalSampled > 0 ? greenPixelCount / totalSampled : 0
  return overlapRatio > 0.3
}

const drawHoleOverlay = () => {
  const { overlayCanvas } = elements
  if (!overlayCanvas) return
  const ctx = overlayCanvas.getContext('2d')
  if (!ctx) return

  ctx.save()
  ctx.lineWidth = 1
  ctx.globalCompositeOperation = 'source-over'

  ;(state.results ?? []).forEach((hole) => {
    ctx.beginPath()
    ctx.strokeStyle = hole.status === 'cleaned' ? 'rgba(125, 211, 252, 0.8)' : 'rgba(239, 68, 68, 0.9)'
    ctx.fillStyle = hole.status === 'cleaned' ? 'rgba(56, 189, 248, 0.45)' : 'rgba(239, 68, 68, 0.5)'
    ctx.arc(hole.x, hole.y, hole.radius * 0.9, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
  })

  // Get canvas dimensions and masks for overlap checking
  const width = overlayCanvas.width
  const height = overlayCanvas.height
  const { hexMask, missedMask } = state

  // Draw virtual holes, but skip those that overlap with green masks
  let skippedVirtualHoles = 0
  ;(state.virtualHoles ?? []).forEach((vhole) => {
    // Check if this virtual hole overlaps with green areas
    if (virtualHoleOverlapsGreenMask(vhole, width, height, hexMask, missedMask)) {
      skippedVirtualHoles++
      return // Skip drawing this virtual hole
    }
    
    ctx.beginPath()
    ctx.strokeStyle = 'rgba(147, 51, 234, 0.9)'
    ctx.fillStyle = 'rgba(147, 51, 234, 0.3)'
    ctx.setLineDash([3, 3])
    ctx.lineWidth = 1.5
    ctx.arc(vhole.x, vhole.y, vhole.radius * 0.8, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    ctx.setLineDash([])
  })
  
  // Log how many virtual holes were skipped to avoid green overlap
  if (skippedVirtualHoles > 0) {
    console.log(`[Virtual Holes] Skipped ${skippedVirtualHoles} virtual holes that overlapped with green areas`)
  }

  ctx.restore()
}

const renderOverlay = () => {
  const { overlayCanvas, meshCanvas } = elements
  if (!overlayCanvas || !meshCanvas) return
  const ctx = overlayCanvas.getContext('2d')
  if (!ctx) return

  const width = overlayCanvas.width
  const height = overlayCanvas.height

  if (!width || !height) {
    ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height)
    return
  }

  if (state.candidateMask && state.candidateMask.length === width * height) {
    state.missedMask = buildMissedMask(state.candidateMask, state.results, width, height)
  } else {
    state.missedMask = null
  }

  // 체크박스가 활성화되면 missedMask에서 파란색 점 생성
  if (state.convertMissedToCleaned && state.missedMask) {
    const missedHoles = createHolesFromMissedMask(state.missedMask, width, height)
    if (missedHoles.length > 0) {
      // 기존 results에서 fromMissed가 아닌 것만 유지하고 새로 생성된 점 추가
      const originalHoles = (state.results || []).filter(h => !h.fromMissed)
      state.results = [...originalHoles, ...missedHoles]
      // 메트릭 재계산 (recalculateMetrics 호출 필요!)
      state.metrics = recalculateMetrics()
      updateStats()
    }
  } else {
    // 체크박스가 꺼지면 fromMissed 점들 제거
    if (state.results) {
      const originalHoles = state.results.filter(h => !h.fromMissed)
      if (originalHoles.length !== state.results.length) {
        state.results = originalHoles
        state.metrics = recalculateMetrics()
        updateStats()
      }
    }
  }

  ctx.clearRect(0, 0, width, height)
  drawMaskLayers()
  drawHoleOverlay()
}

const computeGrayscale = (data) => {
  const gray = new Uint8Array(data.length / 4)
  for (let i = 0, j = 0; i < data.length; i += 4, j++) {
    gray[j] = Math.round(data[i] * 0.2126 + data[i + 1] * 0.7152 + data[i + 2] * 0.0722)
  }
  return gray
}

const gaussianBlur5x5 = (input, width, height) => {
  const kernel = [1, 4, 6, 4, 1]
  const kernelSum = 16
  const temp = new Float32Array(input.length)
  const output = new Uint8Array(input.length)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let acc = 0
      for (let k = -2; k <= 2; k++) {
        const nx = Math.min(width - 1, Math.max(0, x + k))
        acc += input[y * width + nx] * kernel[k + 2]
      }
      temp[y * width + x] = acc / kernelSum
    }
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let acc = 0
      for (let k = -2; k <= 2; k++) {
        const ny = Math.min(height - 1, Math.max(0, y + k))
        acc += temp[ny * width + x] * kernel[k + 2]
      }
      output[y * width + x] = Math.round(acc / kernelSum)
    }
  }

  return output
}

const thresholdBinaryInverse = (input, threshold) => {
  const output = new Uint8Array(input.length)
  for (let i = 0; i < input.length; i++) {
    output[i] = input[i] < threshold ? 255 : 0
  }
  return output
}

const dilateBinary = (mask, width, height) => {
  const output = new Uint8Array(mask.length)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x
      let shouldSet = false
      for (let dy = -1; dy <= 1 && !shouldSet; dy++) {
        const ny = y + dy
        if (ny < 0 || ny >= height) continue
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx
          if (nx < 0 || nx >= width) continue
          if (mask[ny * width + nx]) {
            shouldSet = true
            break
          }
        }
      }
      output[index] = shouldSet ? 255 : 0
    }
  }
  return output
}

const erodeBinary = (mask, width, height) => {
  const output = new Uint8Array(mask.length)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x
      let shouldKeep = true
      for (let dy = -1; dy <= 1 && shouldKeep; dy++) {
        const ny = y + dy
        if (ny < 0 || ny >= height) {
          shouldKeep = false
          break
        }
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx
          if (nx < 0 || nx >= width || !mask[ny * width + nx]) {
            shouldKeep = false
            break
          }
        }
      }
      output[index] = shouldKeep ? 255 : 0
    }
  }
  return output
}

const morphologicalOpen = (mask, width, height, iterations = 1) => {
  let result = mask
  for (let i = 0; i < iterations; i++) {
    result = dilateBinary(erodeBinary(result, width, height), width, height)
  }
  return result
}

const morphologicalClose = (mask, width, height, iterations = 1) => {
  let result = mask
  for (let i = 0; i < iterations; i++) {
    result = erodeBinary(dilateBinary(result, width, height), width, height)
  }
  return result
}

const createCandidateMask = (grayscale, width, height, thresholds) => {
  const blurred = gaussianBlur5x5(grayscale, width, height)
  const binary = thresholdBinaryInverse(blurred, thresholds.dark ?? 80)
  const opened = morphologicalOpen(binary, width, height, 1)
  const closed = morphologicalClose(opened, width, height, 1)
  return { mask: closed, blurred }
}

const applyROIMask = (mask, width, height, roi) => {
  if (!roi || !mask || !mask.length) return
  const startX = Math.max(0, Math.floor(roi.x))
  const startY = Math.max(0, Math.floor(roi.y))
  const endX = Math.min(width, Math.ceil(roi.x + roi.width))
  const endY = Math.min(height, Math.ceil(roi.y + roi.height))

  for (let y = 0; y < height; y++) {
    const rowOffset = y * width
    const inYRange = y >= startY && y < endY
    for (let x = 0; x < width; x++) {
      const index = rowOffset + x
      if (!inYRange || x < startX || x >= endX) {
        mask[index] = 0
      }
    }
  }
}

// 육각형 패턴 감지 함수
const isHexagonalPattern = (pixels, minX, maxX, minY, maxY, area) => {
  const width = maxX - minX + 1
  const height = maxY - minY + 1
  
  // 1. 종횡비 검사: 육각형은 대략 1:1 비율 (0.7 ~ 1.4 범위)
  const aspectRatio = Math.max(width, height) / Math.min(width, height)
  if (aspectRatio > 1.8) {
    return false  // 너무 길쭉하면 육각형 아님
  }
  
  // 2. 최소 크기 검사: 너무 작으면 육각형이 아닐 가능성 높음
  if (area < 100) {
    return false
  }
  
  // 3. 면적 대비 경계 상자 비율: 육각형은 약 0.866 (√3/2)
  // 하지만 실제로는 0.6 ~ 0.95 사이
  const boundingBoxArea = width * height
  const fillRatio = area / boundingBoxArea
  if (fillRatio < 0.5 || fillRatio > 0.98) {
    return false  // 너무 비어있거나 너무 꽉 차있으면 육각형 아님
  }
  
  // 4. Convex Hull 근사 검사: 꼭지점 개수 확인
  // 픽셀 목록을 좌표 배열로 변환
  const points = pixels.map(idx => ({
    x: idx % width,
    y: Math.floor(idx / width)
  }))
  
  if (points.length < 6) {
    return false
  }
  
  // Graham Scan을 사용한 Convex Hull 계산
  const hull = computeConvexHull(points)
  
  // 육각형은 6개의 꼭지점을 가져야 함 (오차 범위: 5~8개)
  if (hull.length < 5 || hull.length > 9) {
    return false
  }
  
  // 5. 둘레 대비 면적 비율 (Compactness)
  // 육각형은 원에 가까운 모양이므로 compactness가 높음
  const perimeter = calculatePerimeter(hull)
  const compactness = (4 * Math.PI * area) / (perimeter * perimeter)
  
  // 육각형의 compactness는 약 0.9 정도 (원은 1.0)
  if (compactness < 0.6) {
    return false  // 너무 불규칙한 모양
  }
  
  return true
}

// Convex Hull 계산 (Graham Scan 알고리즘)
const computeConvexHull = (points) => {
  if (points.length < 3) return points
  
  // 1. 가장 아래쪽, 왼쪽 점 찾기
  let minPoint = points[0]
  for (let i = 1; i < points.length; i++) {
    if (points[i].y < minPoint.y || (points[i].y === minPoint.y && points[i].x < minPoint.x)) {
      minPoint = points[i]
    }
  }
  
  // 2. 각도 기준으로 정렬
  const sortedPoints = points.filter(p => p !== minPoint).sort((a, b) => {
    const angleA = Math.atan2(a.y - minPoint.y, a.x - minPoint.x)
    const angleB = Math.atan2(b.y - minPoint.y, b.x - minPoint.x)
    if (angleA === angleB) {
      const distA = (a.x - minPoint.x) ** 2 + (a.y - minPoint.y) ** 2
      const distB = (b.x - minPoint.x) ** 2 + (b.y - minPoint.y) ** 2
      return distA - distB
    }
    return angleA - angleB
  })
  
  // 3. Graham Scan
  const hull = [minPoint, sortedPoints[0]]
  
  for (let i = 1; i < sortedPoints.length; i++) {
    let top = hull[hull.length - 1]
    let nextTop = hull[hull.length - 2]
    
    while (hull.length > 1 && ccw(nextTop, top, sortedPoints[i]) <= 0) {
      hull.pop()
      top = hull[hull.length - 1]
      nextTop = hull[hull.length - 2]
    }
    
    hull.push(sortedPoints[i])
  }
  
  // Douglas-Peucker 알고리즘으로 꼭지점 단순화
  return simplifyPolygon(hull, 3.0)
}

// Counter-clockwise 검사
const ccw = (a, b, c) => {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)
}

// Douglas-Peucker 알고리즘으로 다각형 단순화
const simplifyPolygon = (points, epsilon) => {
  if (points.length < 3) return points
  
  let dmax = 0
  let index = 0
  const end = points.length - 1
  
  for (let i = 1; i < end; i++) {
    const d = perpendicularDistance(points[i], points[0], points[end])
    if (d > dmax) {
      index = i
      dmax = d
    }
  }
  
  if (dmax > epsilon) {
    const recResults1 = simplifyPolygon(points.slice(0, index + 1), epsilon)
    const recResults2 = simplifyPolygon(points.slice(index), epsilon)
    return recResults1.slice(0, -1).concat(recResults2)
  } else {
    return [points[0], points[end]]
  }
}

// 점에서 선분까지의 수직 거리
const perpendicularDistance = (point, lineStart, lineEnd) => {
  const dx = lineEnd.x - lineStart.x
  const dy = lineEnd.y - lineStart.y
  
  const numerator = Math.abs(dy * point.x - dx * point.y + lineEnd.x * lineStart.y - lineEnd.y * lineStart.x)
  const denominator = Math.sqrt(dx * dx + dy * dy)
  
  return numerator / denominator
}

// 다각형 둘레 계산
const calculatePerimeter = (points) => {
  let perimeter = 0
  for (let i = 0; i < points.length; i++) {
    const next = (i + 1) % points.length
    const dx = points[next].x - points[i].x
    const dy = points[next].y - points[i].y
    perimeter += Math.sqrt(dx * dx + dy * dy)
  }
  return perimeter
}

const buildMissedMask = (candidateMask, holes, width, height) => {
  if (!candidateMask || candidateMask.length !== width * height) {
    return null
  }

  const missed = new Uint8Array(candidateMask.length)
  if (!holes || !holes.length) {
    for (let i = 0; i < candidateMask.length; i++) {
      if (candidateMask[i]) missed[i] = 255
    }
    return missed
  }

  const coverage = new Uint8Array(candidateMask.length)

  for (const hole of holes) {
    const centerX = hole.x
    const centerY = hole.y
    const radius = Math.max(2, hole.radius * 1.4)
    const radiusSquared = radius * radius

    const minX = Math.max(0, Math.floor(centerX - radius))
    const maxX = Math.min(width - 1, Math.ceil(centerX + radius))
    const minY = Math.max(0, Math.floor(centerY - radius))
    const maxY = Math.min(height - 1, Math.ceil(centerY + radius))

    for (let y = minY; y <= maxY; y++) {
      const dy = y - centerY
      const dySquared = dy * dy
      const rowOffset = y * width
      for (let x = minX; x <= maxX; x++) {
        const dx = x - centerX
        if (dx * dx + dySquared <= radiusSquared) {
          coverage[rowOffset + x] = 1
        }
      }
    }
  }

  // 미검출 영역에서 육각형 패턴 제거
  // 1단계: 미검출 영역 찾기
  const tempMissed = new Uint8Array(candidateMask.length)
  for (let i = 0; i < candidateMask.length; i++) {
    if (candidateMask[i] && !coverage[i]) {
      tempMissed[i] = 255
    }
  }
  
  // 2단계: Connected Components 분석으로 각 영역 분리
  const visited = new Uint8Array(candidateMask.length)
  const hexagonalRegions = []
  
  for (let i = 0; i < tempMissed.length; i++) {
    if (tempMissed[i] > 0 && !visited[i]) {
      // BFS로 연결된 영역 찾기
      const queue = [i]
      const pixels = []
      visited[i] = 1
      let head = 0
      let minX = width, maxX = 0, minY = height, maxY = 0
      
      while (head < queue.length) {
        const current = queue[head++]
        const y = Math.floor(current / width)
        const x = current % width
        pixels.push(current)
        
        minX = Math.min(minX, x)
        maxX = Math.max(maxX, x)
        minY = Math.min(minY, y)
        maxY = Math.max(maxY, y)
        
        // 8방향 이웃 탐색
        const neighbors = [
          [-1, -1], [-1, 0], [-1, 1],
          [0, -1], [0, 1],
          [1, -1], [1, 0], [1, 1]
        ]
        
        for (const [dy, dx] of neighbors) {
          const ny = y + dy
          const nx = x + dx
          if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
            const neighbor = ny * width + nx
            if (tempMissed[neighbor] > 0 && !visited[neighbor]) {
              visited[neighbor] = 1
              queue.push(neighbor)
            }
          }
        }
      }
      
      // 3단계: 육각형 패턴 감지
      const isHexagonal = isHexagonalPattern(pixels, minX, maxX, minY, maxY, pixels.length)
      
      if (isHexagonal) {
        hexagonalRegions.push({ pixels, minX, maxX, minY, maxY, area: pixels.length })
        console.log(`[Hexagonal Pattern Detected] Area: ${pixels.length}px, BBox: ${maxX-minX+1}x${maxY-minY+1}`)
      } else {
        // 육각형이 아닌 영역만 missed에 추가
        for (const pixelIdx of pixels) {
          missed[pixelIdx] = 255
        }
      }
    }
  }
  
  if (hexagonalRegions.length > 0) {
    console.log(`[Hexagonal Filter] Removed ${hexagonalRegions.length} hexagonal patterns from missed mask`)
  }

  return missed
}

// 미검출 후보 영역에서 파란색 점(청소 완료) 생성
const createHolesFromMissedMask = (missedMask, width, height) => {
  if (!missedMask || missedMask.length !== width * height) {
    return []
  }

  // Connected components 분석으로 각 미검출 영역 찾기
  const visited = new Uint8Array(width * height)
  const newHoles = []
  let holeId = 10000 // 기존 holes와 구분하기 위해 큰 ID 사용

  for (let i = 0; i < missedMask.length; i++) {
    if (missedMask[i] > 0 && !visited[i]) {
      // BFS로 연결된 영역 찾기
      const queue = [i]
      visited[i] = 1
      let head = 0
      let sumX = 0
      let sumY = 0
      let area = 0

      while (head < queue.length) {
        const current = queue[head++]
        const y = Math.floor(current / width)
        const x = current % width
        sumX += x
        sumY += y
        area++

        // 8방향 이웃 탐색
        const neighbors = [
          [-1, -1], [-1, 0], [-1, 1],
          [0, -1], [0, 1],
          [1, -1], [1, 0], [1, 1]
        ]

        for (const [dy, dx] of neighbors) {
          const ny = y + dy
          const nx = x + dx
          if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
            const neighbor = ny * width + nx
            if (missedMask[neighbor] > 0 && !visited[neighbor]) {
              visited[neighbor] = 1
              queue.push(neighbor)
            }
          }
        }
      }

      // 영역이 충분히 크면 점으로 추가 (최소 4 픽셀)
      if (area >= 4) {
        const centroidX = sumX / area
        const centroidY = sumY / area
        const radius = Math.max(2.4, Math.sqrt(area / Math.PI))

        newHoles.push({
          id: holeId++,
          x: centroidX,
          y: centroidY,
          radius,
          mean: 50, // 청소 완료로 간주 (임계값 80보다 낮음)
          status: 'cleaned',
          autoStatus: 'cleaned',
          area,
          brightness: 50,
          fromMissed: true // 미검출 후보에서 생성되었음을 표시
        })
      }
    }
  }

  return newHoles
}

const segmentComponents = (mask, grayscale, width, height) => {
  const pixelCount = width * height
  const visited = new Uint8Array(pixelCount)
  const queue = new Uint32Array(pixelCount)
  const components = []

  for (let start = 0; start < pixelCount; start++) {
    if (visited[start] || mask[start] === 0) continue

    let head = 0
    let tail = 0
    queue[tail++] = start
    visited[start] = 1

    const pixels = []
    let area = 0
    let sumIntensity = 0
    let sumX = 0
    let sumY = 0
    let minX = width
    let maxX = 0
    let minY = height
    let maxY = 0

    while (head < tail) {
      const index = queue[head++]
      const y = Math.floor(index / width)
      const x = index - y * width

      area++
      sumIntensity += grayscale[index]
      sumX += x
      sumY += y
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y

      pixels.push(index)

      for (let dy = -1; dy <= 1; dy++) {
        const ny = y + dy
        if (ny < 0 || ny >= height) continue
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx
          if (nx < 0 || nx >= width) continue
          const neighbor = ny * width + nx
          if (visited[neighbor] || mask[neighbor] === 0) continue

          visited[neighbor] = 1
          queue[tail++] = neighbor
        }
      }
    }

    components.push({
      area,
      sumIntensity,
      sumX,
      sumY,
      minX,
      maxX,
      minY,
      maxY,
      pixels
    })
  }

  return components
}

const classifyComponents = (components, width, height, thresholds) => {
  const minHoleArea = 4
  const validComponents = components.filter((component) => component.area >= minHoleArea)
  if (!validComponents.length) {
    return { holes: [], hexMask: new Uint8Array(width * height), areaThreshold: 0 }
  }

  const areas = validComponents.map((component) => component.area).sort((a, b) => a - b)
  const percentile = Math.min(99, Math.max(1, thresholds.areaPercentile ?? 50))
  const rawIndex = Math.floor((percentile / 100) * areas.length)
  const percentileIndex = Math.min(areas.length - 1, Math.max(0, rawIndex))
  const areaThreshold = areas[percentileIndex] || areas[areas.length - 1]

  const holes = []

  for (const component of validComponents) {
    const { area, sumIntensity, sumX, sumY, pixels } = component
    if (area < areaThreshold) {
      continue
    }

    const centroidX = sumX / area
    const centroidY = sumY / area
    const mean = sumIntensity / area
    const radius = Math.max(2.4, Math.sqrt(area / Math.PI))
    const status = mean <= thresholds.dark ? 'cleaned' : 'blocked'

    holes.push({
      id: holes.length,
      x: centroidX,
      y: centroidY,
      radius,
      mean,
      status,
      autoStatus: status,
      area,
      brightness: mean,
      pixels
    })
  }

  const hexMask = new Uint8Array(width * height)
  for (const hole of holes) {
    for (const index of hole.pixels) {
      hexMask[index] = 255
    }
    delete hole.pixels
  }

  return { holes, hexMask, areaThreshold }
}

// 오버레이 캔버스를 base64로 변환
const getOverlayImageBase64 = () => {
  const { overlayCanvas } = elements
  if (!overlayCanvas) return null
  
  try {
    // PNG로 인코딩하여 base64 반환
    return overlayCanvas.toDataURL('image/png')
  } catch (error) {
    console.error('오버레이 이미지 변환 실패:', error)
    return null
  }
}

// 자동 저장 함수
const autoSaveInspection = async () => {
  if (!state.results || !state.results.length) {
    return
  }
  
  const metrics = state.metrics
  const overlayImage = getOverlayImageBase64()
  
  const data = {
    title: state.title || `검사_${formatTimestampLabel()}`,
    totalHoles: metrics.totalCount,
    cleanedHoles: metrics.cleanedCount,
    blockedHoles: metrics.blockedCount,
    totalArea: metrics.totalArea,
    cleanedArea: metrics.cleanedArea,
    blockedArea: metrics.blockedArea,
    missedArea: metrics.missedArea,
    cleaningRateArea: metrics.cleaningRateArea,
    cleaningRateCount: metrics.cleaningRateCount,
    thresholdDark: state.thresholds.dark,
    thresholdGray: state.thresholds.gray,
    thresholdArea: state.thresholds.areaPercentile,
    manualEditsCount: 0,
    roiX: state.roi?.x ?? null,
    roiY: state.roi?.y ?? null,
    roiWidth: state.roi?.width ?? null,
    roiHeight: state.roi?.height ?? null,
    virtualHolesCount: state.virtualHoles?.length ?? 0,
    overlayImage: overlayImage
  }
  
  try {
    // 기존 레코드가 있으면 UPDATE, 없으면 INSERT
    if (state.currentInspectionId) {
      const response = await fetch(`/api/inspections/${state.currentInspectionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      
      if (response.ok) {
        const result = await response.json()
        console.log('검사 결과 업데이트 완료:', result)
        log(`검사 결과가 자동 업데이트되었습니다 (ID: ${state.currentInspectionId})`, 'info')
      } else {
        console.error('검사 결과 업데이트 실패:', await response.text())
      }
    } else {
      const response = await fetch('/api/inspections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      
      if (response.ok) {
        const result = await response.json()
        state.currentInspectionId = result.id
        console.log('검사 결과 저장 완료:', result)
        log(`검사 결과가 자동 저장되었습니다 (ID: ${result.id})`, 'info')
      } else {
        console.error('검사 결과 저장 실패:', await response.text())
      }
    }
  } catch (error) {
    console.error('자동 저장 중 오류 발생:', error)
  }
}

const downloadOverlayImage = () => {
  if (!state.results || !state.results.length) {
    log('다운로드할 분석 결과가 없습니다.', 'warning')
    return
  }

  const { overlayCanvas } = elements
  if (!overlayCanvas) {
    log('오버레이 캔버스를 찾을 수 없습니다.', 'error')
    return
  }

  log('화면에 표시된 오버레이를 다운로드하는 중...')

  // Debug: Check what's in state
  console.log('[Download Debug] State info:')
  console.log('- Results count:', state.results?.length || 0)
  console.log('- Cleaned holes:', state.results?.filter(h => h.status === 'cleaned').length || 0)
  console.log('- Blocked holes:', state.results?.filter(h => h.status === 'blocked').length || 0)
  console.log('- Virtual holes:', state.virtualHoles?.length || 0)
  console.log('- HexMask exists:', !!state.hexMask)
  console.log('- MissedMask exists:', !!state.missedMask)

  // Create a new canvas with white background to make colors visible
  const exportCanvas = document.createElement('canvas')
  exportCanvas.width = overlayCanvas.width
  exportCanvas.height = overlayCanvas.height
  const exportCtx = exportCanvas.getContext('2d')
  
  if (!exportCtx) {
    log('내보내기 캔버스 생성 실패', 'error')
    return
  }

  // Draw white background first (to make semi-transparent colors visible)
  exportCtx.fillStyle = 'white'
  exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height)
  
  // Draw the overlay canvas on top
  exportCtx.drawImage(overlayCanvas, 0, 0)
  
  console.log('[Download Debug] Export canvas size:', exportCanvas.width, 'x', exportCanvas.height)

  // Convert to blob and download
  exportCanvas.toBlob((blob) => {
    if (!blob) {
      log('이미지 변환에 실패했습니다.', 'error')
      return
    }

    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const title = state.title || '청소검사'
    const timestamp = formatTimestampLabel().replace(/:/g, '-').replace(/\s/g, '_')
    a.href = url
    a.download = `${title}_overlay_${timestamp}.png`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    log(`오버레이 이미지를 다운로드했습니다: ${a.download}`, 'info')
  }, 'image/png')
}

const detectVirtualHoles = (holes, width, height) => {
  if (!holes || holes.length < 10) return []

  const sortedByY = [...holes].sort((a, b) => a.y - b.y)
  const sortedByX = [...holes].sort((a, b) => a.x - b.x)

  const distancesX = []
  const distancesY = []
  
  for (let i = 1; i < Math.min(sortedByX.length, 20); i++) {
    const dx = sortedByX[i].x - sortedByX[i - 1].x
    if (dx > 10 && dx < 100) distancesX.push(dx)
  }
  
  for (let i = 1; i < Math.min(sortedByY.length, 20); i++) {
    const dy = sortedByY[i].y - sortedByY[i - 1].y
    if (dy > 10 && dy < 100) distancesY.push(dy)
  }

  if (distancesX.length === 0 || distancesY.length === 0) return []

  distancesX.sort((a, b) => a - b)
  distancesY.sort((a, b) => a - b)
  const spacingX = distancesX[Math.floor(distancesX.length / 2)]
  const spacingY = distancesY[Math.floor(distancesY.length / 2)]
  
  const avgRadius = holes.reduce((sum, h) => sum + h.radius, 0) / holes.length

  const minX = Math.min(...holes.map(h => h.x))
  const maxX = Math.max(...holes.map(h => h.x))
  const minY = Math.min(...holes.map(h => h.y))
  const maxY = Math.max(...holes.map(h => h.y))

  const virtualHoles = []
  const threshold = avgRadius * 1.5

  for (let y = minY; y <= maxY; y += spacingY) {
    for (let x = minX; x <= maxX; x += spacingX) {
      const hasNearby = holes.some(hole => {
        const dx = hole.x - x
        const dy = hole.y - y
        return Math.sqrt(dx * dx + dy * dy) < threshold
      })

      if (!hasNearby) {
        virtualHoles.push({
          x,
          y,
          radius: avgRadius,
          virtual: true
        })
      }
    }
  }

  console.log(`[가상 점 탐지] 간격: X=${spacingX.toFixed(1)}px, Y=${spacingY.toFixed(1)}px, 가상 점: ${virtualHoles.length}개`)

  return virtualHoles
}

const analyzeMesh = async () => {
  if (!elements.meshCanvas || !elements.overlayCanvas) {
    log('캔버스 요소를 찾을 수 없습니다.', 'error')
    return
  }
  const { meshCanvas, overlayCanvas, canvasPlaceholder } = elements
  const ctx = meshCanvas.getContext('2d')
  if (!ctx) {
    log('메쉬 캔버스 컨텍스트를 초기화하지 못했습니다.', 'error')
    return
  }

  if (!state.imageBitmap) {
    log('분석할 이미지가 없습니다.', 'error')
    return
  }

  if (state.selectingROI) {
    log('검사 영역 지정을 완료하거나 취소한 뒤 분석을 진행해 주세요.', 'warning')
    return
  }

  if (state.isAnalyzing) {
    state.pendingReanalysis = true
    log('분석이 이미 진행 중입니다. 현재 작업이 완료되면 자동으로 다시 실행합니다.', 'warning')
    return
  }

  state.isAnalyzing = true

  if (canvasPlaceholder) {
    canvasPlaceholder.classList.add('hidden')
  }

  setActionButtons({ analyze: false, reset: true, edit: false, undo: !!state.manualEdits.length, save: false })
  log('이미지 데이터를 준비하는 중입니다...')

  try {
    overlayCanvas.width = meshCanvas.width
    overlayCanvas.height = meshCanvas.height

    const imageData = ctx.getImageData(0, 0, meshCanvas.width, meshCanvas.height)
    const grayscale = computeGrayscale(imageData.data)
    log('그레이스케일 변환을 완료했습니다. 노이즈 완화를 진행합니다...')

    const { mask: candidateMask, blurred } = createCandidateMask(
      grayscale,
      meshCanvas.width,
      meshCanvas.height,
      state.thresholds
    )
    log('후보 영역을 추출하는 중입니다... (가우시안 블러 + 임계값 기반)')

    if (state.roi) {
      applyROIMask(candidateMask, meshCanvas.width, meshCanvas.height, state.roi)
      log(
        `선택한 검사 영역만 대상으로 분석합니다. x:${Math.round(state.roi.x)}, y:${Math.round(state.roi.y)}, 폭:${Math.round(
          state.roi.width
        )}, 높이:${Math.round(state.roi.height)} (픽셀)`
      )
    }

    const components = segmentComponents(candidateMask, blurred, meshCanvas.width, meshCanvas.height)
    log(`분할된 후보 영역: ${components.length.toLocaleString('ko-KR')}개`)

    const { holes, hexMask, areaThreshold } = classifyComponents(
      components,
      meshCanvas.width,
      meshCanvas.height,
      state.thresholds
    )
    const cleanedCount = holes.filter((item) => item.status === 'cleaned').length
    const blockedCount = holes.length - cleanedCount
    const areaPercentile = state.thresholds.areaPercentile ?? 50
    const topShare = Math.max(0, 100 - areaPercentile)
    log(
      `구멍 후보를 분류했습니다. 총 ${holes.length.toLocaleString('ko-KR')}개 (청소 완료 ${cleanedCount.toLocaleString('ko-KR')}개 / 청소 필요 ${blockedCount.toLocaleString('ko-KR')}개) — 면적 하한(P${areaPercentile}, 상위 ${topShare}%): ${Math.round(areaThreshold).toLocaleString('ko-KR')}px²`
    )

    state.results = holes
    state.hexMask = hexMask
    state.candidateMask = candidateMask
    state.missedMask = buildMissedMask(candidateMask, holes, meshCanvas.width, meshCanvas.height)
    state.virtualHoles = detectVirtualHoles(holes, meshCanvas.width, meshCanvas.height)
    state.manualEdits = []

    let missedPixels = 0
    if (state.missedMask) {
      for (let i = 0; i < state.missedMask.length; i++) {
        if (state.missedMask[i]) missedPixels++
      }
    }
    if (missedPixels > 0) {
      log(`점으로 인식되지 않은 후보 영역 픽셀: ${missedPixels.toLocaleString('ko-KR')} (초록색 강조)`, 'warning')
    } else {
      log('모든 후보 영역이 점으로 인식되었습니다.', 'info')
    }

    recalculateMetrics()
    renderOverlay()
    updateStats()
    setActionButtons({ analyze: true, reset: true, edit: !!holes.length, undo: false, save: !!holes.length })

    const metrics = state.metrics
    if (metrics && metrics.totalArea > 0) {
      const cleanedArea = metrics.cleanedArea.toLocaleString('ko-KR')
      const totalArea = metrics.totalArea.toLocaleString('ko-KR')
      const missedArea = metrics.missedArea.toLocaleString('ko-KR')
      const inspectionArea = (metrics.totalArea - metrics.missedArea).toLocaleString('ko-KR')
      const rate = metrics.cleaningRateArea.toFixed(1)
      log(`📊 청소율 계산: ${cleanedArea} / (${totalArea} - ${missedArea}) × 100 = ${cleanedArea} / ${inspectionArea} × 100 = ${rate}%`, 'info')
    }
    
    log('분석이 완료되었습니다. 필요 시 수동 교정을 진행하세요.')
    
    // 자동 저장 실행
    await autoSaveInspection()
  } catch (error) {
    console.error(error)
    log(`분석 중 오류가 발생했습니다: ${error.message}`, 'error')
    const hasResults = Array.isArray(state.results) && state.results.length > 0
    setActionButtons({
      analyze: !!state.imageBitmap,
      reset: true,
      edit: hasResults,
      save: hasResults
    })
  } finally {
    state.isAnalyzing = false
    if (state.pendingReanalysis) {
      state.pendingReanalysis = false
      if (state.imageBitmap) {
        log('대기 중이던 재분석을 실행합니다.', 'info')
        setTimeout(() => analyzeMesh(), 0)
      }
    }
  }
}

const handleOverlayClick = (event) => {
  // Disabled - edit mode removed
  return
}

// Legacy code below - kept for compatibility but disabled
const _disabledHandleOverlayClick = (event) => {
  if (state.selectingROI) return
  return // Edit mode disabled
  const { overlayCanvas } = elements
  if (!overlayCanvas) return

  const rect = overlayCanvas.getBoundingClientRect()
  const scaleX = overlayCanvas.width / rect.width
  const scaleY = overlayCanvas.height / rect.height

  const x = (event.clientX - rect.left) * scaleX
  const y = (event.clientY - rect.top) * scaleY

  console.log('Edit mode: disabled', 'Position:', x, y)

  // 점 추가 모드 - disabled
  if (false) {
    // 새 점의 ID 생성
    const newId = state.results && state.results.length > 0 
      ? Math.max(...state.results.map(h => h.id)) + 1 
      : 1
    
    // 기본 반지름 설정 (기존 점들의 평균 또는 10)
    const avgRadius = state.results && state.results.length > 0
      ? state.results.reduce((sum, h) => sum + h.radius, 0) / state.results.length
      : 10
    
    const newHole = {
      id: newId,
      x: x,
      y: y,
      radius: avgRadius,
      area: Math.PI * avgRadius * avgRadius,
      status: 'cleaned',  // 기본값: 청소 완료
      avgBrightness: 0,
      stdBrightness: 0
    }
    
    if (!state.results) state.results = []
    state.results.push(newHole)
    
    state.manualEdits.push({ 
      type: 'add',
      id: newId, 
      hole: newHole,
      timestamp: Date.now() 
    })
    
    log(`새 점을 추가했습니다. (ID: ${newId}, 위치: ${Math.round(x)}, ${Math.round(y)})`, 'info')
    
    recalculateMetrics()
    renderOverlay()
    updateStats()
    setActionButtons({
      analyze: true,
      reset: true,
      edit: true,
      undo: !!state.manualEdits.length,
      save: true
    })
    return
  }

  // 기존 점 찾기
  let nearest = null
  let minDist = Infinity

  if (state.results) {
    for (const hole of state.results) {
      const dx = hole.x - x
      const dy = hole.y - y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < hole.radius * 1.2 && dist < minDist) {
        nearest = hole
        minDist = dist
      }
    }
  }

  // 점 삭제 모드
  if (state.editType === 'delete') {
    if (!nearest) {
      log('선택한 위치에 구멍이 없습니다. 더 정확히 클릭해 주세요.', 'warning')
      return
    }
    
    const deletedHole = { ...nearest }  // 복사본 저장
    const index = state.results.indexOf(nearest)
    
    if (index === -1) {
      log('삭제할 구멍을 찾을 수 없습니다.', 'error')
      console.error('Delete failed: hole not found in results', nearest)
      return
    }
    
    state.results.splice(index, 1)
    
    console.log('Deleted hole:', deletedHole.id, 'Remaining holes:', state.results.length)
    
    state.manualEdits.push({ 
      type: 'delete',
      id: deletedHole.id,
      hole: deletedHole,
      timestamp: Date.now() 
    })
    
    if (state.candidateMask && state.candidateMask.length === overlayCanvas.width * overlayCanvas.height) {
      state.missedMask = buildMissedMask(state.candidateMask, state.results, overlayCanvas.width, overlayCanvas.height)
    }
    
    log(`구멍 #${deletedHole.id}를 삭제했습니다. (남은 구멍: ${state.results.length}개)`, 'info')
    
    recalculateMetrics()
    renderOverlay()
    updateStats()
    setActionButtons({
      analyze: true,
      reset: true,
      edit: true,
      undo: !!state.manualEdits.length,
      save: true
    })
    return
  }

  // 토글 모드 (기존 기능)
  if (state.editType === 'toggle') {
    if (!nearest) {
      log('선택한 위치에 구멍이 없습니다. 더 정확히 클릭해 주세요.', 'warning')
      return
    }

    const previous = nearest.status
    nearest.status = previous === 'cleaned' ? 'blocked' : 'cleaned'
    state.manualEdits.push({ 
      type: 'toggle',
      id: nearest.id, 
      previous, 
      next: nearest.status, 
      timestamp: Date.now() 
    })

    if (state.candidateMask && state.candidateMask.length === overlayCanvas.width * overlayCanvas.height) {
      state.missedMask = buildMissedMask(state.candidateMask, state.results, overlayCanvas.width, overlayCanvas.height)
    }

    recalculateMetrics()
    renderOverlay()
    updateStats()
    setActionButtons({
      analyze: true,
      reset: true,
      edit: true,
      undo: !!state.manualEdits.length,
      save: true
    })

    log(
      `구멍 #${nearest.id}의 상태를 "${previous === 'cleaned' ? '청소 완료' : '청소 필요'}"에서 "${nearest.status === 'cleaned' ? '청소 완료' : '청소 필요'}"로 변경했습니다.`
    )
  }
}



const loadImageToCanvas = async (file, source = 'upload') => {
  try {
    if (state.lastObjectUrl) {
      URL.revokeObjectURL(state.lastObjectUrl)
    }
    const objectUrl = URL.createObjectURL(file)
    state.lastObjectUrl = objectUrl

    let bitmap
    if ('createImageBitmap' in window) {
      bitmap = await createImageBitmap(file)
    } else {
      bitmap = await new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () => resolve(img)
        img.onerror = (err) => reject(err)
        img.src = objectUrl
      })
    }

    const { meshCanvas, overlayCanvas, canvasPlaceholder } = elements
    if (!meshCanvas || !meshCanvas.getContext) {
      throw new Error('캔버스 초기화 실패')
    }

    const maxWidth = 1024
    const scale = Math.min(1, maxWidth / bitmap.width)
    const width = Math.round(bitmap.width * scale)
    const height = Math.round(bitmap.height * scale)

    applyCanvasLayout(width, height)

    const meshCtx = meshCanvas.getContext('2d')
    meshCtx?.drawImage(bitmap, 0, 0, width, height)

    state.image = file
    state.imageBitmap = bitmap
    state.results = null
    state.hexMask = null
    state.candidateMask = null
    state.missedMask = null
    state.manualEdits = []

    updateROIControls()

    if (canvasPlaceholder) {
      canvasPlaceholder.classList.add('hidden')
    }

    ensureInspectionTitle()

    clearOverlay()
    updateStats()
    setActionButtons({ analyze: true, reset: true, edit: false, undo: false, save: false })

    const sourceLabel = source === 'camera' ? '카메라 촬영' : '파일 업로드'
    log(`${sourceLabel} 이미지를 캔버스에 불러왔습니다. 분석을 시작할 수 있습니다.`)
  } catch (error) {
    console.error(error)
    log('이미지를 불러오는 중 오류가 발생했습니다.', 'error')
    resetWorkspace()
  }
}

const setupEventListeners = () => {
  elements.imageInput?.addEventListener('change', (event) => {
    const file = event.target.files?.[0]
    const fileNameDisplay = document.getElementById('selectedFileName')
    
    if (!file) {
      log('선택된 파일이 없습니다.', 'error')
      if (fileNameDisplay) {
        fileNameDisplay.textContent = '선택된 파일 없음'
        fileNameDisplay.className = 'text-xs text-slate-500 italic'
      }
      return
    }
    
    log(`✅ 이미지 업로드 완료: ${file.name}`, 'info')
    
    const preservedTitle = (elements.titleInput?.value ?? state.title ?? '').trim()
    const preservedFileName = file.name  // 파일명 저장
    
    resetWorkspace()
    
    // 파일명 표시 복원 (resetWorkspace 이후)
    if (fileNameDisplay) {
      fileNameDisplay.textContent = `📎 ${preservedFileName}`
      fileNameDisplay.className = 'text-xs text-emerald-600 font-medium'
    }
    
    if (preservedTitle) {
      applyInspectionTitle(preservedTitle)
    }
    loadImageToCanvas(file, 'upload')
  })

  elements.titleInput?.addEventListener('input', (event) => {
    const value = event.target.value ?? ''
    applyInspectionTitle(value)
  })

  elements.titleInput?.addEventListener('blur', () => {
    if (!state.title || !state.title.trim()) {
      ensureInspectionTitle()
    }
  })

  elements.startCameraButton?.addEventListener('click', () => {
    startCameraStream()
  })

  elements.captureCameraButton?.addEventListener('click', () => {
    captureCameraFrame()
  })

  elements.stopCameraButton?.addEventListener('click', () => {
    stopCameraStream()
    log('카메라 미리보기를 종료했습니다.')
  })

  elements.analyzeButton?.addEventListener('click', () => {
    analyzeMesh()
  })

  elements.resetButton?.addEventListener('click', () => {
    if (!state.image && !state.results) {
      log('초기화할 내용이 없습니다.', 'warning')
      return
    }
    resetWorkspace()
  })

  elements.roiSelectButton?.addEventListener('click', () => {
    if (state.selectingROI) {
      cancelROISelection()
      return
    }
    beginROISelection()
  })

  elements.roiClearButton?.addEventListener('click', () => {
    if (!state.roi) {
      log('초기화할 ROI가 없습니다.', 'warning')
      return
    }
    clearROI()
    if (state.results) {
      log('ROI 초기화가 적용되도록 “분석 시작”을 다시 실행하세요.', 'warning')
    }
  })

  const thresholdHandler = () => {
    updateThresholdLabels()
    if (state.results) {
      log('임계값이 변경되었습니다. 변경 사항을 적용하려면 다시 분석하세요.', 'warning')
    }
  }

  elements.thresholdDark?.addEventListener('input', thresholdHandler)
  elements.thresholdGray?.addEventListener('input', thresholdHandler)
  elements.thresholdArea?.addEventListener('input', thresholdHandler)



  elements.overlayCanvas?.addEventListener('click', handleOverlayClick)
  elements.overlayCanvas?.addEventListener('pointerdown', handleOverlayPointerDown)
  elements.overlayCanvas?.addEventListener('pointermove', handleOverlayPointerMove)
  elements.overlayCanvas?.addEventListener('pointerup', handleOverlayPointerUp)
  elements.overlayCanvas?.addEventListener('pointerleave', handleOverlayPointerLeave)
  elements.overlayCanvas?.addEventListener('pointercancel', handleOverlayPointerLeave)

  elements.saveInspection?.addEventListener('click', async () => {
    if (!state.results || !state.results.length) {
      log('저장할 분석 결과가 없습니다.', 'warning')
      return
    }

    const title = ensureInspectionTitle()
    const metrics = state.metrics || defaultMetrics()

    // Disable save button during request
    const originalText = elements.saveInspection?.textContent || '검사 결과 저장'
    if (elements.saveInspection) {
      elements.saveInspection.disabled = true
      elements.saveInspection.textContent = '저장 중...'
    }

    const payload = {
      title,
      totalHoles: metrics.totalCount,
      cleanedHoles: metrics.cleanedCount,
      blockedHoles: metrics.blockedCount,
      totalArea: metrics.totalArea,
      cleanedArea: metrics.cleanedArea,
      blockedArea: metrics.blockedArea,
      missedArea: metrics.missedArea,
      cleaningRateArea: metrics.cleaningRateArea,
      cleaningRateCount: metrics.cleaningRateCount,
      thresholdDark: state.thresholds.dark,
      thresholdGray: state.thresholds.gray,
      thresholdArea: state.thresholds.areaPercentile,
      manualEditsCount: 0,
      roiX: state.roi?.x || null,
      roiY: state.roi?.y || null,
      roiWidth: state.roi?.width || null,
      roiHeight: state.roi?.height || null,
      virtualHolesCount: state.virtualHoles?.length || 0
    }

    try {
      const response = await fetch('/api/inspections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      const result = await response.json()

      if (result.success) {
        state.currentInspectionId = result.id
        state.autoSaved = true
        if (originalText.includes('다시')) {
          log(`✅ "${title}" 검사 결과가 다시 저장되었습니다. (ID: ${result.id})`, 'info')
        } else {
          log(`✅ "${title}" 검사 결과가 수동으로 저장되었습니다. (ID: ${result.id})`, 'info')
        }
      } else {
        log(`❌ 저장 실패: ${result.error}`, 'error')
      }
    } catch (error) {
      console.error('Save error:', error)
      log(`❌ 저장 중 오류가 발생했습니다: ${error.message}`, 'error')
    } finally {
      // Re-enable save button
      if (elements.saveInspection) {
        elements.saveInspection.disabled = false
        elements.saveInspection.textContent = state.autoSaved ? '검사 결과 다시 저장' : '검사 결과 저장'
      }
    }
  })

  elements.downloadOverlayButton?.addEventListener('click', () => {
    downloadOverlayImage()
  })

  elements.convertMissedToCleaned?.addEventListener('change', (event) => {
    state.convertMissedToCleaned = event.target.checked
    log(state.convertMissedToCleaned 
      ? '✅ 미검출 후보를 청소 완료(파란색 점)로 변환합니다.' 
      : '⚠️ 미검출 후보 변환이 해제되었습니다. 형광 초록색으로 표시됩니다.'
    )
    renderOverlay()
  })

  // 탭 전환 이벤트
  const tabButtons = document.querySelectorAll('.tab-button')
  const tabContents = document.querySelectorAll('.tab-content')
  
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const targetTab = button.getAttribute('data-tab')
      
      // 모든 탭 버튼 비활성화
      tabButtons.forEach(btn => {
        btn.classList.remove('active', 'border-emerald-600', 'text-emerald-600')
        btn.classList.add('border-transparent', 'text-slate-600')
      })
      
      // 클릭한 탭 버튼 활성화
      button.classList.add('active', 'border-emerald-600', 'text-emerald-600')
      button.classList.remove('border-transparent', 'text-slate-600')
      
      // 모든 탭 컨텐츠 숨김
      tabContents.forEach(content => {
        content.classList.add('hidden')
      })
      
      // 선택한 탭 컨텐츠 표시
      const targetContent = document.getElementById(`content-${targetTab}`)
      if (targetContent) {
        targetContent.classList.remove('hidden')
      }
      
      // 탭 3 (이력)을 선택하면 이력 로드
      if (targetTab === 'history') {
        loadInspectionHistory()
      }
    })
  })
}

// 검사 이력 로드 함수
const loadInspectionHistory = async () => {
  const historyList = document.getElementById('historyList')
  if (!historyList) return
  
  historyList.innerHTML = '<p class="text-center text-sm text-slate-500">로딩 중...</p>'
  
  try {
    const response = await fetch('/api/inspections?limit=50&offset=0')
    const result = await response.json()
    
    if (result.success && result.data && result.data.length > 0) {
      historyList.innerHTML = result.data.map(inspection => `
        <div class="rounded-lg border border-slate-200 bg-slate-50 p-4 transition hover:border-emerald-500 hover:shadow-md">
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <h3 class="font-semibold text-slate-900">${inspection.title || '제목 없음'}</h3>
              <p class="mt-1 text-xs text-slate-600">${new Date(inspection.created_at).toLocaleString('ko-KR')}</p>
            </div>
            <div class="text-right">
              <p class="text-2xl font-bold text-emerald-600">${inspection.cleaning_rate_area.toFixed(1)}%</p>
              <p class="text-xs text-slate-600">청소율</p>
            </div>
          </div>
          <div class="mt-3 grid grid-cols-3 gap-2 text-xs">
            <div class="rounded bg-white p-2 text-center">
              <p class="font-semibold text-slate-900">${inspection.total_holes}</p>
              <p class="text-slate-600">총 구멍</p>
            </div>
            <div class="rounded bg-white p-2 text-center">
              <p class="font-semibold text-sky-600">${inspection.cleaned_holes}</p>
              <p class="text-slate-600">청소 완료</p>
            </div>
            <div class="rounded bg-white p-2 text-center">
              <p class="font-semibold text-rose-600">${inspection.blocked_holes}</p>
              <p class="text-slate-600">청소 필요</p>
            </div>
          </div>
          <div class="mt-3 flex justify-end">
            <a href="/history/${inspection.id}" class="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-500">
              상세 보기
              <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
              </svg>
            </a>
          </div>
        </div>
      `).join('')
    } else {
      historyList.innerHTML = '<p class="text-center text-sm text-slate-500">저장된 검사 이력이 없습니다.</p>'
    }
  } catch (error) {
    console.error('Failed to load history:', error)
    historyList.innerHTML = '<p class="text-center text-sm text-rose-600">이력을 불러오는데 실패했습니다.</p>'
  }
}

window.addEventListener('DOMContentLoaded', () => {
  registerElements()
  updateThresholdLabels()
  updateCameraControls(false)
  resetStats()
  updateROIControls()
  setActionButtons({ analyze: false, reset: false, edit: false, undo: false, save: false })
  setupEventListeners()
})
