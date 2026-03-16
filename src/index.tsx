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

const InspectionDetail = ({ inspection }: { inspection: any }) => (
  <div class="min-h-screen bg-slate-50 text-slate-900">
    <div class="border-b border-slate-200 bg-white">
      <div class="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-6">
        <div>
          <p class="text-xs font-semibold uppercase tracking-wide text-emerald-600">검사 결과 상세</p>
          <h1 class="text-2xl font-bold text-slate-900">{inspection.title || '제목 없음'}</h1>
          <p class="mt-1 text-sm text-slate-600">
            검사 시각: {new Date(inspection.created_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}
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

    <main class="mx-auto max-w-6xl space-y-6 px-4 py-10">
      {(inspection.original_image || inspection.overlay_image) && (
        <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
          <h2 class="text-lg font-semibold text-slate-900">검사 이미지</h2>
          <p class="mt-1 text-sm text-slate-600">업로드한 원본 사진과 분석 결과를 비교할 수 있습니다.</p>
          <div class={`mt-4 grid gap-4 ${inspection.original_image && inspection.overlay_image ? 'lg:grid-cols-2' : ''}`}>
            {inspection.original_image && (
              <div>
                <h3 class="mb-2 text-sm font-semibold text-slate-700">원본 사진</h3>
                <div class="overflow-hidden rounded-xl border border-slate-200">
                  <img src={inspection.original_image} alt="업로드한 원본 사진" class="w-full" />
                </div>
              </div>
            )}
            {inspection.overlay_image && (
              <div>
                <h3 class="mb-2 text-sm font-semibold text-slate-700">분석 결과 오버레이</h3>
                <div class="overflow-hidden rounded-xl border border-slate-200">
                  <img src={inspection.overlay_image} alt="검사 결과 오버레이" class="w-full" />
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <h2 class="text-lg font-semibold text-slate-900">검사 통계</h2>
        <div class="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div class="rounded-xl border border-emerald-500/30 bg-emerald-50 p-4 text-center">
            <p class="text-xs font-medium uppercase tracking-wide text-emerald-700">청소율 (면적)</p>
            <p class="mt-2 text-3xl font-bold text-emerald-700">{inspection.cleaning_rate_area.toFixed(1)}%</p>
          </div>
          <div class="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
            <p class="text-xs font-medium uppercase tracking-wide text-slate-700">총 구멍 수</p>
            <p class="mt-2 text-3xl font-bold text-slate-900">{inspection.total_holes}</p>
          </div>
          <div class="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
            <p class="text-xs font-medium uppercase tracking-wide text-slate-700">가상 구멍</p>
            <p class="mt-2 text-3xl font-bold text-purple-600">{inspection.virtual_holes_count || 0}</p>
          </div>
        </div>

        <div class="mt-4 grid gap-4 sm:grid-cols-4">
          <div class="rounded-xl border border-slate-300/40 bg-slate-50 p-4 text-center">
            <p class="text-xs font-medium text-slate-700">전체 면적</p>
            <p class="mt-2 text-2xl font-bold text-slate-900">{inspection.total_area.toLocaleString('ko-KR')}</p>
            <p class="mt-1 text-xs text-slate-600">px2</p>
          </div>
          <div class="rounded-xl border border-sky-400/40 bg-sky-50 p-4 text-center">
            <p class="text-xs font-medium text-sky-700">청소 완료</p>
            <p class="mt-2 text-2xl font-bold text-sky-700">{inspection.cleaned_area.toLocaleString('ko-KR')}</p>
            <p class="mt-1 text-xs text-slate-600">px2</p>
          </div>
          <div class="rounded-xl border border-rose-400/40 bg-rose-50 p-4 text-center">
            <p class="text-xs font-medium text-rose-700">청소 필요</p>
            <p class="mt-2 text-2xl font-bold text-rose-700">{inspection.blocked_area.toLocaleString('ko-KR')}</p>
            <p class="mt-1 text-xs text-slate-600">px2</p>
          </div>
          <div class="rounded-xl border border-lime-400/40 bg-lime-50 p-4 text-center">
            <p class="text-xs font-medium text-lime-700">미분류 후보</p>
            <p class="mt-2 text-2xl font-bold text-lime-700">{inspection.missed_area.toLocaleString('ko-KR')}</p>
            <p class="mt-1 text-xs text-slate-600">px2</p>
          </div>
        </div>
      </section>

      <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <h2 class="text-lg font-semibold text-slate-900">분석 설정</h2>
        <div class="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <h3 class="text-sm font-semibold text-slate-700">임계값 설정</h3>
            <dl class="mt-2 space-y-1 text-sm">
              <div class="flex justify-between">
                <dt class="text-slate-600">청소 완료(검정) 기준:</dt>
                <dd class="font-semibold text-slate-900">&le; {inspection.threshold_dark}</dd>
              </div>
              <div class="flex justify-between">
                <dt class="text-slate-600">청소 필요(회색) 상한:</dt>
                <dd class="font-semibold text-slate-900">&le; {inspection.threshold_gray}</dd>
              </div>
              <div class="flex justify-between">
                <dt class="text-slate-600">구멍 면적 필터:</dt>
                <dd class="font-semibold text-slate-900">P{inspection.threshold_area} (상위 {100 - inspection.threshold_area}%)</dd>
              </div>
            </dl>
          </div>
          <div>
            <h3 class="text-sm font-semibold text-slate-700">ROI 설정</h3>
            {inspection.roi_x !== null ? (
              <dl class="mt-2 space-y-1 text-sm">
                <div class="flex justify-between">
                  <dt class="text-slate-600">X 좌표:</dt>
                  <dd class="font-semibold text-slate-900">{Math.round(inspection.roi_x)} px</dd>
                </div>
                <div class="flex justify-between">
                  <dt class="text-slate-600">Y 좌표:</dt>
                  <dd class="font-semibold text-slate-900">{Math.round(inspection.roi_y)} px</dd>
                </div>
                <div class="flex justify-between">
                  <dt class="text-slate-600">크기:</dt>
                  <dd class="font-semibold text-slate-900">{Math.round(inspection.roi_width)} x {Math.round(inspection.roi_height)} px</dd>
                </div>
              </dl>
            ) : (
              <p class="mt-2 text-sm text-slate-600">ROI가 설정되지 않았습니다 (전체 영역 분석)</p>
            )}
          </div>
        </div>
        {inspection.manual_edits_count > 0 && (
          <div class="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3">
            <p class="text-sm font-semibold text-amber-900">수동 교정 횟수: {inspection.manual_edits_count}회</p>
            <p class="mt-1 text-xs text-amber-700">사용자가 수동으로 구멍 상태를 변경한 횟수입니다.</p>
          </div>
        )}
      </section>
    </main>

    <footer class="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-600">
      Mesh Cleanliness Inspector v2 — Cloudflare Pages & Hono
    </footer>
  </div>
)

const Home = () => (
  <div class="min-h-screen bg-white text-slate-900">
    <div class="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 lg:flex-row">
      <main class="flex-1 space-y-8">
        <header class="space-y-3">
          <p class="text-sm font-semibold text-emerald-600">Mesh Cleanliness Inspector v2</p>
          <h1 class="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            매쉬 구멍 청소 상태 판별 대시보드
          </h1>
          <p class="text-sm leading-relaxed text-slate-600">
            이 도구는 검정색 구멍(청소 완료)과 회색 구멍(청소 필요)을 분류해 청소율을 계산합니다.
            반사(하이라이트) 자동 제외, 조명 불균일 보정, 품질 게이트를 지원합니다.
          </p>
        </header>

        {/* 탭 네비게이션 */}
        <div class="border-b border-slate-200">
          <nav class="flex gap-2" aria-label="Tabs">
            <button
              id="tab-upload"
              class="tab-button active border-b-2 border-emerald-600 px-4 py-3 text-sm font-semibold text-emerald-600"
              data-tab="upload"
            >
              1. 이미지 업로드 & 설정
            </button>
            <button
              id="tab-result"
              class="tab-button border-b-2 border-transparent px-4 py-3 text-sm font-medium text-slate-600 hover:border-slate-300 hover:text-slate-900"
              data-tab="result"
            >
              2. 분석 결과 시각화
            </button>
            <button
              id="tab-history"
              class="tab-button border-b-2 border-transparent px-4 py-3 text-sm font-medium text-slate-600 hover:border-slate-300 hover:text-slate-900"
              data-tab="history"
            >
              3. 검사 이력 전체보기
            </button>
          </nav>
        </div>

        {/* 탭 1: 이미지 업로드 & 설정 */}
        <div id="content-upload" class="tab-content">
        <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/40">
          <h2 class="text-lg font-semibold text-slate-900">1. 이미지 업로드 & 기본 설정</h2>
          <p class="mt-1 text-sm text-slate-600">
            매쉬가 선명하게 보이도록 촬영한 사진을 선택하세요. 밝기/대비 조정은 추후 분석 단계에서 자동으로 적용됩니다.
          </p>
          <p class="mt-2 text-xs font-medium text-emerald-700">
            권장 명도 기준: 청소 완료(검정) 80, 청소 필요(회색) 상한 145 — 환경에 따라 +/-10 내에서 조정하세요.
          </p>
          <div class="mt-6 grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
            <label class="flex flex-col gap-2 text-sm font-medium text-slate-700">
              검사 제목 (선택)
              <input
                id="inspectionTitle"
                type="text"
                placeholder="예: 패드 매쉬 청소 검증"
                class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-600 focus:border-emerald-500 focus:outline-none"
                maxLength={80}
              />
              <span class="text-xs font-normal text-slate-600">미기재 시 업로드/촬영 시각이 자동으로 제목에 반영됩니다.</span>
            </label>
            <div class="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h3 class="text-sm font-semibold text-slate-900">검사 목적</h3>
              <p class="mt-2 text-xs leading-relaxed text-slate-600">
                출고 또는 공정 투입 직전에 필터 매쉬 청소 상태를 검증하여, 막힌 구멍이 있는지 조기에 확인합니다. 청소 완료 기준은
                "검정색 구멍"이며, 회색 구멍은 추가 세척이 필요합니다.
              </p>
            </div>
          </div>

          <div class="mt-6 flex flex-col gap-2">
            <label class="text-sm font-medium text-slate-700">검사 이미지 선택</label>
            <div class="flex flex-wrap items-center gap-3">
              <label class="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-emerald-500 hover:text-emerald-700">
                <span>파일 선택</span>
                <input
                  id="imageInput"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  class="hidden"
                />
              </label>
              <span id="selectedFileName" class="text-sm text-slate-500 italic">선택된 파일 없음</span>
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
              class="hidden relative overflow-hidden rounded-xl border border-slate-200 bg-white/60"
            >
              <video id="cameraPreview" class="h-full w-full object-cover" playsInline muted></video>
              <div class="pointer-events-none absolute inset-0">
                <div class="absolute inset-[10%] border-2 border-dashed border-emerald-400 bg-emerald-400/5">
                  <div class="absolute left-1/2 top-2 -translate-x-1/2 rounded bg-emerald-600 px-2 py-1 text-[10px] font-semibold text-white shadow-lg">
                    권장 촬영 영역 (80%)
                  </div>
                  <div class="absolute left-0 top-0 h-4 w-4 border-l-4 border-t-4 border-emerald-500"></div>
                  <div class="absolute right-0 top-0 h-4 w-4 border-r-4 border-t-4 border-emerald-500"></div>
                  <div class="absolute bottom-0 left-0 h-4 w-4 border-b-4 border-l-4 border-emerald-500"></div>
                  <div class="absolute bottom-0 right-0 h-4 w-4 border-b-4 border-r-4 border-emerald-500"></div>
                </div>
              </div>
            </div>
            <p class="text-xs leading-relaxed text-slate-600">
              카메라 활성화 시 화면에 표시되는 <span class="text-emerald-600 font-semibold">초록색 가이드 박스(80% 영역)</span> 안에 매쉬가 들어오도록 촬영하세요. 
              이렇게 하면 일관된 조건에서 청소율을 측정할 수 있습니다.
            </p>
          </div>

          {/* 하이라이트 제외 설정 (NEW v2) */}
          <div class="mt-6 space-y-3 rounded-xl border border-amber-200 bg-amber-50/50 p-4">
            <div class="flex items-center justify-between">
              <h3 class="text-sm font-semibold text-amber-900">반사 하이라이트 자동 제외</h3>
              <label class="relative inline-flex cursor-pointer items-center">
                <input id="highlightToggle" type="checkbox" class="peer sr-only" checked />
                <div class="peer h-5 w-9 rounded-full bg-slate-300 after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:border after:border-slate-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-amber-500 peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
              </label>
            </div>
            <p class="text-xs text-slate-600">
              촬영 시 발생하는 정반사(하이라이트) 영역을 자동으로 감지하여 분석 분모에서 제외합니다.
              포화된 밝은 픽셀(밝기 &gt; 임계값)을 마스킹하고, 해당 영역의 구멍은 "제외됨"으로 분류합니다.
            </p>
            <div class="grid gap-3 sm:grid-cols-2">
              <label class="flex flex-col gap-1 text-xs text-slate-600">
                하이라이트 임계값 (밝기)
                <input id="highlightThreshold" type="range" min="200" max="255" value="245" class="accent-amber-400" />
                <span id="highlightThresholdValue" class="font-semibold text-amber-700">245</span>
              </label>
              <label class="flex flex-col gap-1 text-xs text-slate-600">
                마스크 팽창 (px)
                <input id="highlightDilate" type="range" min="0" max="15" value="5" class="accent-amber-400" />
                <span id="highlightDilateValue" class="font-semibold text-amber-700">5</span>
              </label>
            </div>
          </div>

          {/* 품질 게이트 설정 */}
          <div class="mt-6 space-y-3 rounded-xl border border-sky-200 bg-sky-50/50 p-4">
            <h3 class="text-sm font-semibold text-sky-900">품질 게이트 설정</h3>
            <p class="text-xs text-slate-600">
              유효 분석 영역이 부족하거나 선명도가 낮으면 "재촬영 권장" 경고가 표시됩니다.
            </p>
            <label class="flex flex-col gap-1 text-xs text-slate-600">
              최소 유효면적 (%)
              <input id="validAreaMin" type="range" min="30" max="95" step="5" value="70" class="accent-sky-400" />
              <span id="validAreaMinValue" class="font-semibold text-sky-700">70</span>
            </label>
          </div>

          {/* ROI 그리드 프리셋 */}
          <div class="mt-6 space-y-3 rounded-xl border border-purple-200 bg-purple-50/50 p-4">
            <div class="flex items-center justify-between">
              <h3 class="text-sm font-semibold text-purple-900">ROI 그리드 프리셋</h3>
              <label class="relative inline-flex cursor-pointer items-center">
                <input id="roiGridToggle" type="checkbox" class="peer sr-only" />
                <div class="peer h-5 w-9 rounded-full bg-slate-300 after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:border after:border-slate-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-purple-500 peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
              </label>
            </div>
            <p class="text-xs text-slate-600">
              목표 구멍 수(N x M)를 설정하면, 검출된 구멍 수가 예상 범위에서 벗어날 때 경고합니다.
            </p>
            <select id="roiGridPreset" class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900">
              <option value="20x20">20 x 20 (400개)</option>
              <option value="25x25">25 x 25 (625개)</option>
              <option value="30x30">30 x 30 (900개)</option>
              <option value="35x35">35 x 35 (1225개)</option>
              <option value="40x40">40 x 40 (1600개)</option>
            </select>
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
              <p class="text-xs text-slate-600">이미지 전처리/분류 과정을 단계별로 기록합니다.</p>
              <div
                id="logPanel"
                class="h-40 overflow-y-auto rounded-xl border border-slate-200 bg-white/40 p-3 text-xs text-slate-600"
              ></div>
            </div>
          </div>
        </section>
        </div>

        {/* 탭 2: 분석 결과 시각화 */}
        <div id="content-result" class="tab-content hidden">
        <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/40">
          <h2 class="text-lg font-semibold text-slate-900">2. 분석 결과 시각화</h2>
          <div class="mt-1 flex items-center gap-3 flex-wrap">
            <p class="text-sm text-slate-600">
              원본 이미지 위에 분석 결과 오버레이를 겹쳐 표시합니다. 오렌지색 반투명 영역은 하이라이트 마스크(제외),
              파란색 원은 청소 완료, 빨간색 원은 청소 필요를 의미합니다.
            </p>
            <span id="analysisModeBadge" class="hidden inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold bg-slate-100 text-slate-500 border border-slate-200 whitespace-nowrap"></span>
          </div>

          {/* 품질 게이트 상태 표시 */}
          <div id="qualityGatePanel" class="mt-4 space-y-3 rounded-xl border border-slate-200 bg-white p-4">
            <div class="flex items-center justify-between">
              <h3 class="text-sm font-semibold text-slate-700">품질 게이트</h3>
              <span id="qualityGateStatus" class="text-sm font-bold text-slate-500">—</span>
            </div>
            <ul id="qualityReasons" class="space-y-1"></ul>
            <div class="grid grid-cols-3 gap-3 text-center">
              <div class="rounded-lg bg-slate-50 p-2">
                <p class="text-[10px] text-slate-600">선명도</p>
                <p id="sharpnessDisplay" class="text-sm font-bold text-slate-900">—</p>
              </div>
              <div class="rounded-lg bg-slate-50 p-2">
                <p class="text-[10px] text-slate-600">포화 비율</p>
                <p id="saturationDisplay" class="text-sm font-bold text-slate-900">—</p>
              </div>
              <div class="rounded-lg bg-slate-50 p-2">
                <p class="text-[10px] text-slate-600">유효 면적</p>
                <p id="validAreaPercent" class="text-sm font-bold text-slate-900">—</p>
              </div>
            </div>
          </div>

          <div class="mt-4 space-y-3 rounded-xl border border-slate-200 bg-emerald-50 p-4">
            <h3 class="text-sm font-semibold text-slate-700">검사 영역 지정 (ROI)</h3>
            <p class="text-xs text-slate-600">
              특정 영역만 집중적으로 분석하고 싶다면 "검사 영역 지정" 버튼을 누른 뒤 캔버스 위를 드래그하여 ROI를 설정하세요.
            </p>
            <div class="flex flex-wrap items-center gap-3">
              <button
                id="roiSelectButton"
                type="button"
                class="inline-flex items-center gap-2 rounded-lg border border-sky-400/70 px-3 py-2 text-xs font-semibold text-sky-700 transition hover:bg-sky-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-500"
                disabled
              >
                검사 영역 지정
              </button>
              <button
                id="roiClearButton"
                type="button"
                class="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-500"
                disabled
              >
                영역 초기화
              </button>
              <span class="text-[11px] text-slate-600">ROI를 변경한 뒤에는 "분석 시작"을 다시 실행해 주세요.</span>
            </div>
            <div class="mt-2 rounded-lg bg-slate-50 p-2">
              <p class="text-[10px] text-slate-600">ROI 그리드 추정</p>
              <p id="roiGridInfo" class="text-sm font-bold text-slate-900">—</p>
            </div>
          </div>

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
                  <span>이미지를 업로드한 뒤 "분석 시작" 버튼을 눌러 결과를 확인하세요.</span>
                </div>
              </div>
              {/* 오버레이 마킹만 보이는 이미지 */}
              <div
                id="overlayOnlyWrapper"
                class="hidden relative w-full overflow-hidden rounded-2xl border border-slate-200 bg-white"
              >
                <h3 class="px-4 pt-3 text-sm font-semibold text-slate-700">오버레이 마킹 (흰 배경)</h3>
                <p class="px-4 text-[11px] text-slate-500">원본 이미지를 제외한 마킹만 표시합니다. 구멍 위치와 상태를 명확하게 확인할 수 있습니다.</p>
                <div class="p-3">
                  <canvas id="overlayOnlyCanvas" class="block w-full rounded-xl border border-slate-100"></canvas>
                </div>
              </div>

              {/* 구멍/셀 단위 통계 */}
              <div class="grid gap-3 sm:grid-cols-4">
                <div class="rounded-xl border border-slate-200 bg-white/60 p-3 text-center">
                  <p id="totalHolesLabel" class="text-[10px] text-slate-600">전체 구멍</p>
                  <p id="totalHoles" class="mt-1 text-xl font-bold text-slate-900">—</p>
                </div>
                <div class="rounded-xl border border-sky-400/40 bg-sky-500/10 p-3 text-center">
                  <p id="cleanedHolesLabel" class="text-[10px] text-sky-700">청소 완료</p>
                  <p id="cleanedHoles" class="mt-1 text-xl font-bold text-sky-600">—</p>
                </div>
                <div class="rounded-xl border border-rose-400/40 bg-rose-500/10 p-3 text-center">
                  <p id="blockedHolesLabel" class="text-[10px] text-rose-700">청소 필요</p>
                  <p id="blockedHoles" class="mt-1 text-xl font-bold text-rose-600">—</p>
                </div>
                <div class="rounded-xl border border-amber-400/40 bg-amber-500/10 p-3 text-center">
                  <p id="excludedHolesLabel" class="text-[10px] text-amber-700">제외(반사)</p>
                  <p id="excludedHoles" class="mt-1 text-xl font-bold text-amber-600">—</p>
                </div>
              </div>
              {/* 미세 매쉬 셀 밀도 정보 패널 (fine-mesh mode only, hidden by default) */}
              <div id="fineMeshDensityPanel" class="hidden grid gap-3 sm:grid-cols-3">
                <div class="rounded-xl border border-violet-300/50 bg-violet-50 p-3 text-center">
                  <p class="text-[10px] text-violet-600">평균 밀도</p>
                  <p id="avgDensityDisplay" class="mt-1 text-xl font-bold text-violet-700">—</p>
                </div>
                <div class="rounded-xl border border-violet-300/50 bg-violet-50 p-3 text-center">
                  <p class="text-[10px] text-violet-600">FFT 피치</p>
                  <p id="fftPitchDisplay" class="mt-1 text-xl font-bold text-violet-700">—</p>
                </div>
                <div class="rounded-xl border border-violet-300/50 bg-violet-50 p-3 text-center">
                  <p class="text-[10px] text-violet-600">셀 수</p>
                  <p id="totalCellsDisplay" class="mt-1 text-xl font-bold text-violet-700">—</p>
                </div>
              </div>
            </div>
            <aside class="space-y-4">
              <div class="rounded-xl border border-slate-200 bg-white/50 p-5">
                <h3 class="text-sm font-semibold text-slate-900">청소율</h3>
                <p class="text-[11px] uppercase tracking-wide text-slate-600">유효 구멍/셀 기준 (제외 영역 제외)</p>
                <p class="mt-2 text-4xl font-black text-emerald-700" id="cleaningRateHole">—</p>
                <p class="mt-2 text-xs text-slate-600">
                  하이라이트로 제외된 영역을 뺀 나머지 중 "청소 완료"의 비율입니다. 마스크가 인위적 개선을 방지합니다.
                  미세 매쉬 모드에서는 셀 내 어두운 픽셀 밀도로 청소 상태를 판단합니다.
                </p>
              </div>
              <div class="rounded-xl border border-slate-200 bg-white/50 p-5">
                <h3 class="text-sm font-semibold text-slate-900">결과 내보내기</h3>
                <p class="mt-2 text-xs text-slate-600">
                  분석 결과를 이미지, JSON, CSV 형식으로 내보낼 수 있습니다.
                </p>
                <div class="mt-3 flex flex-col gap-2">
                  <button
                    id="downloadOverlayButton"
                    type="button"
                    class="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-sky-500 px-3 py-2 text-xs font-semibold text-sky-700 transition hover:bg-sky-50 disabled:cursor-not-allowed disabled:border-slate-300 disabled:text-slate-400"
                    disabled
                  >
                    오버레이 이미지 다운로드
                  </button>
                  <div class="grid grid-cols-2 gap-2">
                    <button
                      id="exportJsonButton"
                      type="button"
                      class="inline-flex items-center justify-center gap-1 rounded-lg border border-violet-500 px-3 py-2 text-xs font-semibold text-violet-700 transition hover:bg-violet-50 disabled:cursor-not-allowed disabled:border-slate-300 disabled:text-slate-400"
                      disabled
                    >
                      JSON 내보내기
                    </button>
                    <button
                      id="exportCsvButton"
                      type="button"
                      class="inline-flex items-center justify-center gap-1 rounded-lg border border-teal-500 px-3 py-2 text-xs font-semibold text-teal-700 transition hover:bg-teal-50 disabled:cursor-not-allowed disabled:border-slate-300 disabled:text-slate-400"
                      disabled
                    >
                      CSV 내보내기
                    </button>
                  </div>
                </div>
              </div>
              <div class="rounded-xl border border-emerald-200 bg-emerald-50/50 p-5">
                <h3 class="text-sm font-semibold text-emerald-900">검사 결과 저장</h3>
                <p class="mt-2 text-xs text-slate-600">
                  분석이 완료되면 자동으로 저장됩니다. 수정 후 다시 저장하거나 새로운 레코드로 저장하려면 아래 버튼을 클릭하세요.
                </p>
                <button
                  id="saveInspection"
                  type="button"
                  class="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600 disabled:shadow-none"
                  disabled
                >
                  검사 결과 저장
                </button>
                <p class="mt-2 text-[10px] text-slate-500">
                  자동 저장 후 수동 교정을 한 경우, 이 버튼으로 변경사항을 새 레코드로 저장할 수 있습니다.
                </p>
              </div>

            </aside>
          </div>
        </section>
        </div>

        {/* 탭 3: 검사 이력 전체보기 */}
        <div id="content-history" class="tab-content hidden">
          <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/40">
            <h2 class="text-lg font-semibold text-slate-900">검사 이력 전체보기</h2>
            <p class="mt-2 text-sm text-slate-600">
              저장된 모든 검사 기록을 확인할 수 있습니다. 데이터베이스에 저장된 이력이 표시됩니다.
            </p>
            <div id="historyList" class="mt-6 space-y-4">
              <p class="text-center text-sm text-slate-500">로딩 중...</p>
            </div>
          </section>
        </div>

      </main>

      <aside class="w-full max-w-sm space-y-6 lg:sticky lg:top-10">
        <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/40">
          <h2 class="text-lg font-semibold text-slate-900">분석 가이드</h2>
          <ul class="mt-4 space-y-3 text-sm text-slate-600">
            <li>촬영 시 육각형 격자가 선명하게 보이도록 조명 각도를 맞춰 주세요.</li>
            <li>매쉬 구멍은 일정 간격으로 배열되어 있으므로, 프레임 중앙이 잘리지 않도록 촬영합니다.</li>
            <li>모바일/태블릿에서는 "카메라 활성화 → 촬영" 버튼으로 즉시 이미지를 확보할 수 있습니다.</li>
            <li>반사(하이라이트)가 심한 영역은 자동으로 제외됩니다. 오렌지색 반투명 영역이 제외 마스크입니다.</li>
            <li>품질 게이트가 "경고" 또는 "검사 불가"일 때는 재촬영을 권장합니다.</li>
            <li>분석 후 결과를 저장하면 이력 페이지에서 통계와 이미지를 다시 확인할 수 있습니다.</li>
          </ul>
        </section>
        <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/40">
          <h2 class="text-lg font-semibold text-slate-900">색상 범례</h2>
          <dl class="mt-4 space-y-3 text-sm text-slate-600">
            <div class="flex items-center gap-3">
              <span class="h-3 w-3 rounded-full bg-sky-400"></span>
              <dt class="font-semibold text-slate-900">청소 완료</dt>
              <dd class="text-xs text-slate-600">검정색 구멍 / 밀도 &ge; 40%</dd>
            </div>
            <div class="flex items-center gap-3">
              <span class="h-3 w-3 rounded-full bg-amber-400"></span>
              <dt class="font-semibold text-slate-900">부분 청소</dt>
              <dd class="text-xs text-slate-600">미세 매쉬 모드에서 밀도 15-40%</dd>
            </div>
            <div class="flex items-center gap-3">
              <span class="h-3 w-3 rounded-full bg-rose-400"></span>
              <dt class="font-semibold text-slate-900">청소 필요</dt>
              <dd class="text-xs text-slate-600">회색 구멍 / 밀도 &lt; 15%</dd>
            </div>
            <div class="flex items-center gap-3">
              <span class="inline-flex h-3 w-3 rounded-full" style="background: rgba(255,140,0,0.7)"></span>
              <dt class="font-semibold text-slate-900">제외됨 (반사)</dt>
              <dd class="text-xs text-slate-600">하이라이트 마스크에 의해 분석에서 제외된 영역</dd>
            </div>
          </dl>
        </section>
      </aside>
    </div>
    <footer class="border-t border-slate-200 bg-slate-50 py-6 text-center text-xs text-slate-600">
      Mesh Cleanliness Inspector v2 — Cloudflare Pages & Hono
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
        <span>Dark &le; {record.thresholds.dark}</span>
        <span>Grey &le; {record.thresholds.gray}</span>
        {typeof record.thresholds.areaPercentile === 'number' && (
          <span>
            면적 &ge; P{record.thresholds.areaPercentile}
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
                  <th class="px-4 py-3 font-semibold">검사 ID / 시각</th>
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
        Mesh Cleanliness Inspector v2 — Cloudflare Pages & Hono
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
      virtualHolesCount,
      originalImage
    } = body

    const result = await c.env.DB.prepare(`
      INSERT INTO inspections (
        title, total_holes, cleaned_holes, blocked_holes,
        total_area, cleaned_area, blocked_area, missed_area,
        cleaning_rate_area, cleaning_rate_count,
        threshold_dark, threshold_gray, threshold_area,
        manual_edits_count, roi_x, roi_y, roi_width, roi_height,
        virtual_holes_count, original_image
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      virtualHolesCount,
      originalImage || null
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
      SELECT id, title, total_holes, cleaned_holes, blocked_holes,
        total_area, cleaned_area, blocked_area, missed_area,
        cleaning_rate_area, cleaning_rate_count,
        threshold_dark, threshold_gray, threshold_area,
        manual_edits_count, roi_x, roi_y, roi_width, roi_height,
        virtual_holes_count, created_at, updated_at,
        CASE WHEN original_image IS NOT NULL AND original_image != '' THEN 1 ELSE 0 END as has_original_image
      FROM inspections
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

app.put('/api/inspections/:id', async (c) => {
  try {
    const id = c.req.param('id')
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
      virtualHolesCount,
      overlayImage,
      originalImage
    } = body

    const result = await c.env.DB.prepare(`
      UPDATE inspections SET
        title = ?,
        total_holes = ?,
        cleaned_holes = ?,
        blocked_holes = ?,
        total_area = ?,
        cleaned_area = ?,
        blocked_area = ?,
        missed_area = ?,
        cleaning_rate_area = ?,
        cleaning_rate_count = ?,
        threshold_dark = ?,
        threshold_gray = ?,
        threshold_area = ?,
        manual_edits_count = ?,
        roi_x = ?,
        roi_y = ?,
        roi_width = ?,
        roi_height = ?,
        virtual_holes_count = ?,
        overlay_image = ?,
        original_image = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
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
      virtualHolesCount,
      overlayImage,
      originalImage || null,
      id
    ).run()

    return c.json({
      success: true,
      message: '검사 결과가 업데이트되었습니다.'
    })
  } catch (error) {
    console.error('Error updating inspection:', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
    }, 500)
  }
})

// Page Routes
app.get('/', (c) => c.render(<Home />))
app.get('/history', (c) => c.render(<HistoryPage />))
app.get('/history/:id', async (c) => {
  const id = c.req.param('id')
  
  try {
    const result = await c.env.DB.prepare(`
      SELECT * FROM inspections WHERE id = ?
    `).bind(id).first()
    
    if (!result) {
      return c.html(`
        <div class="min-h-screen flex items-center justify-center bg-slate-50">
          <div class="text-center">
            <h1 class="text-2xl font-bold text-slate-900">검사 결과를 찾을 수 없습니다</h1>
            <a href="/" class="mt-4 inline-block text-emerald-600 hover:underline">대시보드로 돌아가기</a>
          </div>
        </div>
      `)
    }
    
    return c.render(<InspectionDetail inspection={result as any} />)
  } catch (error) {
    console.error('Error fetching inspection detail:', error)
    return c.html(`
      <div class="min-h-screen flex items-center justify-center bg-slate-50">
        <div class="text-center">
          <h1 class="text-2xl font-bold text-rose-600">오류가 발생했습니다</h1>
          <p class="mt-2 text-slate-600">${error instanceof Error ? error.message : '알 수 없는 오류'}</p>
          <a href="/" class="mt-4 inline-block text-emerald-600 hover:underline">대시보드로 돌아가기</a>
        </div>
      </div>
    `)
  }
})
app.get('/healthz', (c) => c.json({ status: 'ok' }))

export default app
