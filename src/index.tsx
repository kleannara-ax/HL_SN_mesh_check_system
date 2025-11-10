import { Hono } from 'hono'
import { serveStatic } from 'hono/cloudflare-workers'
import { renderer } from './renderer'

type Bindings = {
  DB: D1Database
}

const app = new Hono<{ Bindings: Bindings }>()

app.use('/static/*', serveStatic({ root: './public' }))
app.use(renderer)

const AnalyticsCard = ({ title, value, description }: { title: string; value: string; description: string }) => (
  <div class="rounded-xl border border-slate-200/80 bg-white/60 p-4 shadow-md shadow-slate-950/40">
    <p class="text-xs font-medium uppercase tracking-wide text-slate-600">{title}</p>
    <p class="mt-3 text-2xl font-bold text-slate-900">{value}</p>
    <p class="mt-2 text-xs text-slate-9000">{description}</p>
  </div>
)

const Home = () => (
  <div class="min-h-screen bg-white text-slate-900">
    <div class="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 lg:flex-row">
      <main class="flex-1 space-y-8">
        <header class="space-y-3">
          <p class="text-sm font-semibold text-emerald-600">Mesh Cleanliness Inspector</p>
          <h1 class="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            매쉬 구멍 청소 상태 판별 대시보드
          </h1>
          <p class="text-sm leading-relaxed text-slate-600">
            제품을 공정에 투입하기 전에 필터 매쉬가 충분히 청소되었는지 확인하세요. 이 도구는 검정색 구멍(청소 완료)과
            회색 구멍(청소 필요)을 분류해 청소율을 계산하고, 초록색 마스크로 대형 철 격자 및 미검출 후보를 구분합니다.
          </p>
        </header>

        <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/40">
          <h2 class="text-lg font-semibold text-slate-900">1. 이미지 업로드 & 기본 설정</h2>
          <p class="mt-1 text-sm text-slate-600">
            매쉬가 선명하게 보이도록 촬영한 사진을 선택하세요. 밝기·대비 조정은 추후 분석 단계에서 자동으로 적용됩니다.
          </p>
          <p class="mt-2 text-xs font-medium text-emerald-700">
            권장 명도 기준: 청소 완료(검정) 80, 청소 필요(회색) 상한 145 — 환경에 따라 ±10 내에서 조정하세요.
          </p>
          <div class="mt-6 grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
            <label class="flex flex-col gap-2 text-sm font-medium text-slate-700">
              검사 제목 (선택)
              <input
                id="inspectionTitle"
                type="text"
                placeholder="예: 1공장 A라인 출고 전 청소 검증"
                class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-600 focus:border-emerald-500 focus:outline-none"
                maxLength={80}
              />
              <span class="text-xs font-normal text-slate-9000">미기재 시 업로드·촬영 시각이 자동으로 제목에 반영됩니다.</span>
            </label>
            <div class="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h3 class="text-sm font-semibold text-slate-900">검사 목적</h3>
              <p class="mt-2 text-xs leading-relaxed text-slate-600">
                출고 또는 공정 투입 직전에 필터 매쉬 청소 상태를 검증하여, 막힌 구멍이 있는지 조기에 확인합니다. 청소 완료 기준은
                “검정색 구멍”이며, 회색 구멍은 추가 세척이 필요합니다.
              </p>
            </div>
          </div>

          <div class="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end">
            <label class="flex w-full flex-col gap-2 text-sm font-medium text-slate-700 sm:max-w-md">
              검사 이미지 선택
              <input
                id="imageInput"
                type="file"
                accept="image/*"
                capture="environment"
                class="w-full cursor-pointer rounded-lg border border-slate-300 bg-white/60 px-3 py-2 text-sm text-slate-700 focus:border-emerald-500 focus:outline-none"
              />
            </label>
            <div class="flex gap-3">
              <button
                id="analyzeButton"
                type="button"
                class="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-emerald-700"
                disabled
              >
                분석 시작
              </button>
              <button
                id="resetButton"
                type="button"
                class="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-9000"
                disabled
              >
                초기화
              </button>
            </div>
          </div>

          <div class="mt-4 space-y-3 rounded-xl border border-slate-200 bg-white/40 p-4">
            <div class="flex flex-wrap gap-2">
              <button
                id="startCameraButton"
                type="button"
                class="inline-flex items-center gap-2 rounded-lg border border-emerald-500/60 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-500/10"
              >
                카메라 활성화
              </button>
              <button
                id="captureCameraButton"
                type="button"
                class="inline-flex items-center gap-2 rounded-lg border border-sky-500 px-3 py-2 text-xs font-semibold text-sky-700 transition hover:bg-sky-50 disabled:cursor-not-allowed disabled:border-slate-300 disabled:text-slate-9000"
                disabled
              >
                촬영
              </button>
              <button
                id="stopCameraButton"
                type="button"
                class="inline-flex items-center gap-2 rounded-lg border border-rose-500 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:border-slate-300 disabled:text-slate-9000"
                disabled
              >
                카메라 종료
              </button>
            </div>
            <div
              id="cameraContainer"
              class="hidden overflow-hidden rounded-xl border border-slate-200 bg-white/60"
            >
              <video id="cameraPreview" class="h-full w-full object-cover" playsInline muted></video>
            </div>
            <p class="text-xs leading-relaxed text-slate-600">
              모바일·태블릿에서는 후면 카메라로 바로 촬영하여 분석할 수 있습니다. 촬영 후 결과가 마음에 들지 않으면 임계값을 조정하거나
              다시 촬영하세요.
            </p>
          </div>

          <div class="mt-6 grid gap-5 lg:grid-cols-2">
            <div class="space-y-3">
              <h3 class="text-sm font-semibold text-slate-900">명도 임계값 설정</h3>
              <p class="text-xs text-slate-600">
                자동 분석 후에도 필요 시 임계값을 조절하여 정확도를 높일 수 있습니다. 각각의 값은 실시간으로 결과에 반영됩니다.
                구멍 면적 필터(P%) 슬라이더를 조절하면 상위 몇 % 크기의 구멍만 결과에 포함할지 제어할 수 있습니다.
              </p>
              <div class="space-y-3 rounded-xl border border-slate-200 bg-white/40 p-4">
                <label class="flex flex-col gap-1 text-xs text-slate-600">
                  청소 완료(검정) 기준 명도
                  <input id="thresholdDark" type="range" min="0" max="255" value="80" class="accent-emerald-400" />
                  <span id="thresholdDarkValue" class="font-semibold text-emerald-700">80</span>
                </label>
                <label class="flex flex-col gap-1 text-xs text-slate-600">
                  청소 필요(회색) 상한 명도
                  <input id="thresholdGray" type="range" min="0" max="255" value="145" class="accent-emerald-400" />
                  <span id="thresholdGrayValue" class="font-semibold text-emerald-700">145</span>
                </label>
                <label class="flex flex-col gap-1 text-xs text-slate-600">
                  구멍 면적 필터 (퍼센타일)
                  <input id="thresholdArea" type="range" min="10" max="90" step="5" value="50" class="accent-emerald-400" />
                  <span id="thresholdAreaValue" class="font-semibold text-emerald-700">상위 50% (P50)</span>
                </label>
              </div>
            </div>
            <div class="space-y-3">
              <h3 class="text-sm font-semibold text-slate-900">분석 로그</h3>
              <p class="text-xs text-slate-600">이미지 전처리·분류 과정을 단계별로 기록합니다.</p>
              <div
                id="logPanel"
                class="h-40 overflow-y-auto rounded-xl border border-slate-200 bg-white/40 p-3 text-xs text-slate-600"
              ></div>
            </div>
          </div>

          <div class="mt-6 space-y-3 rounded-xl border border-slate-200 bg-white/40 p-4">
            <h3 class="text-sm font-semibold text-slate-700">검사 영역 지정 (ROI)</h3>
            <p class="text-xs text-slate-600">
              특정 영역만 집중적으로 분석하고 싶다면 “검사 영역 지정” 버튼을 누른 뒤 캔버스 위를 드래그하여 ROI를 설정하세요. 지정된
              영역은 분석 시 자동으로 적용되며, 결과 통계와 청소율도 해당 영역으로 한정됩니다.
            </p>
            <div class="flex flex-wrap items-center gap-3">
              <button
                id="roiSelectButton"
                type="button"
                class="inline-flex items-center gap-2 rounded-lg border border-sky-400/70 px-3 py-2 text-xs font-semibold text-sky-700 transition hover:bg-sky-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-9000"
                disabled
              >
                검사 영역 지정
              </button>
              <button
                id="roiClearButton"
                type="button"
                class="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-9000"
                disabled
              >
                영역 초기화
              </button>
              <span class="text-[11px] text-slate-9000">ROI를 변경한 뒤에는 “분석 시작”을 다시 실행해 주세요.</span>
            </div>
          </div>
        </section>

        <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/40">
          <h2 class="text-lg font-semibold text-slate-900">2. 분석 결과 시각화</h2>
          <p class="mt-1 text-sm text-slate-600">
            원본 이미지 위에 분석 결과 오버레이를 겹쳐 표시합니다. 연두색 육각형은 제외된 격자, 형광 초록색 영역은 아직 점으로
            인식되지 않은 후보, 파란색 점은 청소 완료, 빨간색 점은 청소 필요를 의미합니다.
          </p>
          <div class="mt-6 grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
            <div class="space-y-4">
              <div
                id="canvasWrapper"
                class="relative min-h-[320px] w-full overflow-hidden rounded-2xl border border-slate-200 bg-white/40"
              >
                <canvas id="meshCanvas" class="block h-full w-full bg-black"></canvas>
                <canvas id="overlayCanvas" class="absolute inset-0 h-full w-full touch-none"></canvas>
                <div
                  id="canvasPlaceholder"
                  class="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/80 text-center text-sm text-slate-600"
                >
                  <span class="text-base font-semibold text-slate-700">아직 이미지가 선택되지 않았습니다.</span>
                  <span>이미지를 업로드한 뒤 “분석 시작” 버튼을 눌러 결과를 확인하세요.</span>
                </div>
              </div>
              <div class="grid gap-3 sm:grid-cols-3">
                <div class="rounded-xl border border-emerald-500/30 bg-emerald-600/10 p-4 text-center">
                  <p class="text-xs text-emerald-700">총 구멍 수</p>
                  <p id="totalHoles" class="mt-2 text-2xl font-bold text-emerald-700">0</p>
                </div>
                <div class="rounded-xl border border-sky-500/30 bg-sky-500/10 p-4 text-center">
                  <p class="text-xs text-sky-700">청소 완료(검정)</p>
                  <p id="cleanedCount" class="mt-2 text-2xl font-bold text-sky-300">0</p>
                </div>
                <div class="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-center">
                  <p class="text-xs text-rose-700">청소 필요(회색)</p>
                  <p id="blockedCount" class="mt-2 text-2xl font-bold text-rose-300">0</p>
                </div>
              </div>
              <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div class="rounded-xl border border-slate-200 bg-white/60 p-4 text-center">
                  <p class="text-xs text-slate-600">총 검사 면적 (px²)</p>
                  <p id="totalArea" class="mt-2 text-2xl font-bold text-slate-900">0</p>
                </div>
                <div class="rounded-xl border border-sky-400/40 bg-sky-500/10 p-4 text-center">
                  <p class="text-xs text-sky-700">청소 완료 면적</p>
                  <p id="cleanedArea" class="mt-2 text-2xl font-bold text-sky-300">0</p>
                </div>
                <div class="rounded-xl border border-rose-400/40 bg-rose-500/10 p-4 text-center">
                  <p class="text-xs text-rose-700">청소 필요 면적</p>
                  <p id="blockedArea" class="mt-2 text-2xl font-bold text-rose-300">0</p>
                </div>
                <div class="rounded-xl border border-lime-400/40 bg-lime-500/10 p-4 text-center">
                  <p class="text-xs text-lime-100">미분류 후보 면적</p>
                  <p id="missedArea" class="mt-2 text-2xl font-bold text-lime-200">0</p>
                </div>
              </div>
            </div>
            <aside class="space-y-4">
              <div class="rounded-xl border border-slate-200 bg-white/50 p-5">
                <h3 class="text-sm font-semibold text-slate-900">청소율</h3>
                <p class="text-[11px] uppercase tracking-wide text-slate-600">면적 기준 (ROI 적용)</p>
                <p class="mt-2 text-4xl font-black text-emerald-700" id="cleaningRate">0%</p>
                <p class="mt-2 text-xs text-slate-600">
                  빨간색(청소 필요)으로 표시된 면적 비율을 기반으로 계산됩니다. 수동 교정 및 ROI 재설정 시 즉시 갱신됩니다.
                </p>
                <div class="mt-4 rounded-lg border border-slate-200/60 bg-white/70 p-3">
                  <p class="text-[11px] uppercase tracking-wide text-slate-600">구멍 개수 기준 청소율</p>
                  <p id="countCleaningRate" class="mt-1 text-xl font-semibold text-slate-900">0%</p>
                </div>
              </div>
              <div class="rounded-xl border border-slate-200 bg-white/50 p-5">
                <h3 class="text-sm font-semibold text-slate-900">결과 수동 교정</h3>
                <p class="mt-2 text-xs text-slate-600">
                  오탐지된 구멍을 클릭하면 상태를 전환할 수 있습니다. 드래그 선택 및 되돌리기 기능은 곧 추가될 예정입니다.
                </p>
                <div class="mt-4 flex flex-wrap gap-2">
                  <button
                    id="toggleEditMode"
                    type="button"
                    class="inline-flex items-center gap-2 rounded-lg border border-emerald-500/60 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-500/10"
                    disabled
                  >
                    편집 모드 전환
                  </button>
                  <button
                    id="undoButton"
                    type="button"
                    class="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-400"
                    disabled
                  >
                    되돌리기
                  </button>
                </div>
              </div>
              <div class="rounded-xl border border-slate-200 bg-white/50 p-5">
                <h3 class="text-sm font-semibold text-slate-900">결과 내보내기</h3>
                <p class="mt-2 text-xs text-slate-600">
                  분석된 점들만 투명 배경에 표시한 이미지를 다운로드할 수 있습니다.
                </p>
                <button
                  id="downloadOverlayButton"
                  type="button"
                  class="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-sky-500 px-3 py-2 text-xs font-semibold text-sky-700 transition hover:bg-sky-50 disabled:cursor-not-allowed disabled:border-slate-300 disabled:text-slate-400"
                  disabled
                >
                  점 위치 이미지 다운로드
                </button>
              </div>
              <div class="rounded-xl border border-slate-200 bg-white/50 p-5">
                <div class="flex items-center justify-between">
                  <h3 class="text-sm font-semibold text-slate-900">검사 이력</h3>
                  <a
                    href="/history"
                    class="inline-flex items-center gap-2 text-xs font-semibold text-emerald-700 underline-offset-2 hover:underline"
                  >
                    전체 보기
                  </a>
                </div>
                <p class="mt-2 text-xs text-slate-600">
                  저장된 검사 기록을 열람하고, 이미지·통계를 비교할 수 있는 페이지가 제공됩니다.
                </p>
                <button
                  id="saveInspection"
                  type="button"
                  class="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-700 px-3 py-2 text-xs font-semibold text-slate-900 transition hover:bg-slate-600 disabled:cursor-not-allowed disabled:bg-white disabled:text-slate-9000"
                  disabled
                >
                  검사 결과 저장
                </button>
              </div>
            </aside>
          </div>
        </section>
      </main>

      <aside class="w-full max-w-sm space-y-6 lg:sticky lg:top-10">
        <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/40">
          <h2 class="text-lg font-semibold text-slate-900">분석 가이드</h2>
          <ul class="mt-4 space-y-3 text-sm text-slate-600">
            <li>⚙️ 촬영 시 육각형 격자가 선명하게 보이도록 조명 각도를 맞춰 주세요.</li>
            <li>🎯 매쉬 구멍은 일정 간격으로 배열되어 있으므로, 프레임 중앙이 잘리지 않도록 촬영합니다.</li>
            <li>📷 모바일/태블릿에서는 “카메라 활성화 → 촬영” 버튼으로 즉시 이미지를 확보할 수 있습니다.</li>
            <li>🟢 연두색 육각형 라인은 제외된 철 구조를 의미하며 청소율 계산에 포함되지 않습니다.</li>
            <li>💡 형광 초록색으로 표시된 영역은 아직 점으로 인식되지 않은 후보 영역입니다. 임계값을 조정하거나 수동 교정을
              고려하세요.</li>
            <li>📝 분석 후 결과를 저장하면 이력 페이지에서 통계와 이미지를 다시 확인할 수 있습니다.</li>
          </ul>
        </section>
        <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/40">
          <h2 class="text-lg font-semibold text-slate-900">색상 범례</h2>
          <dl class="mt-4 space-y-3 text-sm text-slate-600">
            <div class="flex items-center gap-3">
              <span class="h-3 w-3 rounded-full bg-sky-400"></span>
              <dt class="font-semibold text-slate-900">청소 완료</dt>
              <dd class="text-xs text-slate-600">검정색으로 보이는 매쉬 구멍</dd>
            </div>
            <div class="flex items-center gap-3">
              <span class="h-3 w-3 rounded-full bg-rose-400"></span>
              <dt class="font-semibold text-slate-900">청소 필요</dt>
              <dd class="text-xs text-slate-600">회색으로 보이는 매쉬 구멍</dd>
            </div>
            <div class="flex items-center gap-3">
              <span class="h-3 w-3 rounded-full bg-emerald-400"></span>
              <dt class="font-semibold text-slate-900">제외 격자</dt>
              <dd class="text-xs text-slate-600">육각형 철 구조(청소율 계산 제외)</dd>
            </div>
            <div class="flex items-center gap-3">
              <span class="h-3 w-3 rounded-full bg-lime-300"></span>
              <dt class="font-semibold text-slate-900">미검출 후보</dt>
              <dd class="text-xs text-slate-600">아직 점으로 인식되지 않은 후보 영역(임계값 및 교정 필요)</dd>
            </div>
            <div class="flex items-center gap-3">
              <span class="h-3 w-3 rounded-full bg-purple-500"></span>
              <dt class="font-semibold text-slate-900">가상 점 (보라색)</dt>
              <dd class="text-xs text-slate-600">격자 패턴 상 존재해야 하지만 인식되지 않은 구멍</dd>
            </div>
          </dl>
        </section>
      </aside>
    </div>
    <footer class="border-t border-slate-200 bg-slate-50 py-6 text-center text-xs text-slate-600">
      ⓒ {new Date().getFullYear()} Mesh Cleanliness Inspector — Cloudflare Pages & Hono
    </footer>
    <script type="module" src="/static/app.js"></script>
  </div>
)

const sampleHistory = [
  {
    id: 'INS-2024-11-09-001',
    title: 'A라인 출고 전 청소 검증',
    inspectedAt: '2024-11-09 09:30',
    location: '서울 1공장 A라인 필터',
    total: 168,
    cleaned: 152,
    blocked: 16,
    cleaningRate: 90.5,
    thresholds: { dark: 82, gray: 150, areaPercentile: 55 },
    notes: '출고 승인 전 재확인. 중앙부 그림자 보정 완료, 추가 청소 불필요.'
  },
  {
    id: 'INS-2024-11-02-004',
    title: 'B라인 주간 점검 청소 수준 확인',
    inspectedAt: '2024-11-02 15:10',
    location: '서울 1공장 B라인 필터',
    total: 174,
    cleaned: 160,
    blocked: 14,
    cleaningRate: 91.95,
    thresholds: { dark: 85, gray: 150, areaPercentile: 60 },
    notes: '사내 청소 기준 90% 달성. 격자 변형 부위는 다음 교대에 재세척 예정.'
  },
  {
    id: 'INS-2024-10-26-003',
    title: '테스트 라인 세척 후 검증',
    inspectedAt: '2024-10-26 11:05',
    location: '인천 3공장 테스트 라인',
    total: 162,
    cleaned: 138,
    blocked: 24,
    cleaningRate: 85.19,
    thresholds: { dark: 80, gray: 145, areaPercentile: 50 },
    notes: '기본 세척으로는 기준 미달. 추가 초음파 세척 후 재검사 계획.'
  }
] as const

type HistoryRecord = (typeof sampleHistory)[number]

const HistoryTag = ({ label, tone = 'default' }: { label: string; tone?: 'default' | 'warning' | 'success' }) => {
  const toneClass =
    tone === 'success'
      ? 'bg-emerald-600/10 text-emerald-700 border-emerald-500/40'
      : tone === 'warning'
        ? 'bg-amber-500/10 text-amber-200 border-amber-400/40'
        : 'bg-slate-500/10 text-slate-700 border-slate-500/30'

  return <span class={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${toneClass}`}>{label}</span>
}

const HistoryRow = ({ record }: { record: HistoryRecord }) => (
  <tr class="border-b border-slate-200/60">
    <td class="px-4 py-3 align-top text-sm text-slate-900">
      <div class="flex flex-col gap-1">
        <span class="font-semibold text-slate-900">{record.title}</span>
        <span class="text-xs text-slate-600">{record.location}</span>
      </div>
    </td>
    <td class="whitespace-nowrap px-4 py-3 align-top text-sm text-slate-600">
      <div class="flex flex-col gap-1 text-xs text-slate-600">
        <span class="font-mono text-sm text-slate-700">{record.id}</span>
        <span>{record.inspectedAt}</span>
      </div>
    </td>
    <td class="px-4 py-3 align-top">
      <div class="text-sm text-slate-700">
        <p>
          총 {record.total.toLocaleString('ko-KR')}개 중{' '}
          <span class="font-semibold text-emerald-700">{record.cleaned.toLocaleString('ko-KR')}개</span>
        </p>
        <p class="text-xs text-slate-600">청소 필요 {record.blocked.toLocaleString('ko-KR')}개</p>
      </div>
    </td>
    <td class="whitespace-nowrap px-4 py-3 align-top text-sm font-bold text-emerald-700">
      {record.cleaningRate.toFixed(2)}%
    </td>
    <td class="whitespace-nowrap px-4 py-3 align-top text-sm text-slate-600">
      <div class="flex flex-col gap-1 text-xs text-slate-600">
        <span>Dark ≤ {record.thresholds.dark}</span>
        <span>Grey ≤ {record.thresholds.gray}</span>
        {typeof record.thresholds.areaPercentile === 'number' && (
          <span>
            면적 ≥ P{record.thresholds.areaPercentile}
            <span class="text-slate-8000"> (상위 {Math.max(0, 100 - record.thresholds.areaPercentile)}%)</span>
          </span>
        )}
      </div>
    </td>
    <td class="px-4 py-3 align-top text-sm text-slate-600">
      <div class="flex flex-col gap-1">
        <HistoryTag
          label={record.cleaningRate >= 90 ? '출고 승인' : '재세척 요청'}
          tone={record.cleaningRate >= 90 ? 'success' : 'warning'}
        />
        <p class="text-xs leading-relaxed text-slate-600">{record.notes}</p>
      </div>
    </td>
  </tr>
)

const HistoryPage = () => {
  const totalInspections = sampleHistory.length
  const avgCleaningRate =
    sampleHistory.reduce((sum, record) => sum + record.cleaningRate, 0) / Math.max(1, totalInspections)
  const blockedTotal = sampleHistory.reduce((sum, record) => sum + record.blocked, 0)

  return (
    <div class="min-h-screen bg-slate-50 text-slate-800">
      <div class="border-b border-slate-200/60 bg-slate-50/80">
        <div class="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-6">
          <div>
            <p class="text-xs font-semibold uppercase tracking-wide text-emerald-600">Inspection History</p>
            <h1 class="text-3xl font-bold text-slate-800">검사 이력 요약</h1>
            <p class="mt-2 text-sm text-slate-600">
              공정 투입 전 필터 청소 수준을 기록으로 관리하고, 라인별 청소율 추세와 재세척 필요 구간을 빠르게 파악하세요.
            </p>
          </div>
          <a
            href="/"
            class="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-emerald-500 hover:text-emerald-700"
          >
            ← 대시보드로 돌아가기
          </a>
        </div>
      </div>

      <main class="mx-auto max-w-6xl space-y-8 px-4 py-10">
        <section>
          <div class="grid gap-4 sm:grid-cols-3">
            <AnalyticsCard
              title="총 검사 횟수"
              value={`${totalInspections.toLocaleString('ko-KR')}회`}
              description="저장된 검사 기록의 총 횟수입니다."
            />
            <AnalyticsCard
              title="평균 청소율"
              value={`${avgCleaningRate.toFixed(2)}%`}
              description="선택된 검사 기록의 평균 청소율입니다."
            />
            <AnalyticsCard
              title="청소 필요 구멍 수"
              value={`${blockedTotal.toLocaleString('ko-KR')}개`}
              description="검사 기록에서 발견된 청소 필요 구멍의 총합입니다."
            />
          </div>
        </section>

        <section class="space-y-4">
          <header class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 class="text-lg font-semibold text-slate-900">검사 상세 목록</h2>
              <p class="text-sm text-slate-600">임시 데이터입니다. 실제 배포 시 D1 DB에서 실시간 조회하도록 연동할 예정입니다.</p>
            </div>
            <div class="flex flex-wrap gap-2">
              <HistoryTag label="Ver.2 알고리즘" />
              <HistoryTag label="임계값 조정" tone="warning" />
              <HistoryTag label="데모 데이터" />
            </div>
          </header>

          <div class="overflow-hidden rounded-2xl border border-slate-200/80 bg-white/60">
            <table class="min-w-full divide-y divide-slate-200/80 text-left text-sm">
              <thead class="bg-white/80 text-xs uppercase tracking-wide text-slate-600">
                <tr>
                  <th class="px-4 py-3 font-semibold">검사 제목 / 라인</th>
                  <th class="px-4 py-3 font-semibold">검사 ID · 시각</th>
                  <th class="px-4 py-3 font-semibold">구멍 통계</th>
                  <th class="px-4 py-3 font-semibold">청소율</th>
                  <th class="px-4 py-3 font-semibold">임계값</th>
                  <th class="px-4 py-3 font-semibold">판정 및 후속 조치</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-200/60">
                {sampleHistory.map((record) => (
                  <HistoryRow key={record.id} record={record} />
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      <footer class="border-t border-slate-200/60 bg-white/80 py-6 text-center text-xs text-slate-9000">
        ⓒ {new Date().getFullYear()} Mesh Cleanliness Inspector — Cloudflare Pages & Hono
      </footer>
    </div>
  )
}

// API Routes for inspections
app.post('/api/inspections', async (c) => {
  try {
    const body = await c.req.json()
    
    const {
      title,
      totalHoles,
      cleanedHoles,
      blockedHoles,
      totalArea,
      cleanedArea,
      blockedArea,
      missedArea,
      cleaningRateArea,
      cleaningRateCount,
      thresholdDark,
      thresholdGray,
      thresholdArea,
      manualEditsCount,
      roiX,
      roiY,
      roiWidth,
      roiHeight,
      virtualHolesCount
    } = body

    const result = await c.env.DB.prepare(`
      INSERT INTO inspections (
        title, total_holes, cleaned_holes, blocked_holes,
        total_area, cleaned_area, blocked_area, missed_area,
        cleaning_rate_area, cleaning_rate_count,
        threshold_dark, threshold_gray, threshold_area,
        manual_edits_count, roi_x, roi_y, roi_width, roi_height,
        virtual_holes_count
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      title,
      totalHoles,
      cleanedHoles,
      blockedHoles,
      totalArea,
      cleanedArea,
      blockedArea,
      missedArea,
      cleaningRateArea,
      cleaningRateCount,
      thresholdDark,
      thresholdGray,
      thresholdArea,
      manualEditsCount,
      roiX,
      roiY,
      roiWidth,
      roiHeight,
      virtualHolesCount
    ).run()

    return c.json({
      success: true,
      id: result.meta.last_row_id,
      message: '검사 결과가 저장되었습니다.'
    })
  } catch (error) {
    console.error('Error saving inspection:', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
    }, 500)
  }
})

app.get('/api/inspections', async (c) => {
  try {
    const limit = parseInt(c.req.query('limit') || '50')
    const offset = parseInt(c.req.query('offset') || '0')

    const { results } = await c.env.DB.prepare(`
      SELECT * FROM inspections
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).bind(limit, offset).all()

    const { results: countResults } = await c.env.DB.prepare(`
      SELECT COUNT(*) as total FROM inspections
    `).all()

    return c.json({
      success: true,
      data: results,
      total: countResults[0]?.total || 0,
      limit,
      offset
    })
  } catch (error) {
    console.error('Error fetching inspections:', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
    }, 500)
  }
})

app.get('/api/inspections/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const result = await c.env.DB.prepare(`
      SELECT * FROM inspections WHERE id = ?
    `).bind(id).first()

    if (!result) {
      return c.json({
        success: false,
        error: '검사 결과를 찾을 수 없습니다.'
      }, 404)
    }

    return c.json({
      success: true,
      data: result
    })
  } catch (error) {
    console.error('Error fetching inspection:', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
    }, 500)
  }
})

// Page Routes
app.get('/', (c) => c.render(<Home />))
app.get('/history', (c) => c.render(<HistoryPage />))
app.get('/healthz', (c) => c.json({ status: 'ok' }))

export default app
