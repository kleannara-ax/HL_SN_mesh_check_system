# Mesh Cleanliness Inspector

## 프로젝트 개요
- **이름**: Mesh Cleanliness Inspector
- **목표**: 필터 매쉬(육각 격자) 사진을 업로드하거나 촬영해 청소 상태를 빠르게 판정하고, 청소율을 개수 및 면적 기준으로 시각화합니다.
- **주요 기능**:
  - 캔버스 기반 이미지 전처리(그레이스케일 → 가우시안 블러 → 역임계처리 → 형태학적 연산)
  - 구멍 자동 분류(검정 = 청소 완료, 회색 = 청소 필요) 및 hex lattice 제외 처리
  - 면적 기반 청소율 계산(총 면적, 청소 완료 면적, 청소 필요 면적, 미분류 후보 면적)
  - ROI(Region of Interest) 지정 및 자동 재분석, 수동 교정, 분석 로그
  - 카메라 캡처(getUserMedia)와 파일 업로드 지원
  - 분석 이력 샘플 페이지(`/history`)

## 실행 / 빌드
```bash
npm install
npm run dev       # 로컬 개발 (Vite)
npm run build     # 프로덕션 빌드 (dist/_worker.js 생성)
npm run dev:sandbox # Cloudflare Pages 개발 서버 (필요 시)
npm run deploy    # Cloudflare Pages 배포 파이프라인 (사전 설정 필요)
```

> **주석**: Cloudflare Pages 환경을 사용하기 때문에 Node.js 전용 API(fs, child_process 등)는 사용할 수 없습니다. 서버리스 요청 처리는 `src/index.tsx`의 Hono 라우터에서 수행합니다.

## URL / 엔드포인트
- `/` : 메인 대시보드 (이미지 업로드, ROI 지정, 통계)
- `/history` : 임시 샘플 이력 테이블 (추후 D1 연동 예정)
- `/healthz` : 간단한 상태 확인 JSON `{ status: "ok" }`

## UI 구성 및 사용자 흐름
1. **이미지 확보**: 파일 업로드 또는 “카메라 활성화 → 촬영” 버튼으로 이미지 획득
2. **임계값 조정**: 청소 완료/필요 명도 기준, 구멍 면적 퍼센타일(P%) 슬라이더 설정
3. **ROI 지정(선택 사항)**: “검사 영역 지정” → 캔버스 드래그 → 자동 재분석, “영역 초기화” 클릭 시 전체 영역 재분석
4. **결과 확인**:
   - 총 구멍 수 / 청소 완료 / 청소 필요 (개수 기준)
   - 총 검사 면적, 청소 완료 면적, 청소 필요 면적, 미분류 후보 면적 (px² 기준)
   - 청소율 2종: 면적 기준(주지표)과 개수 기준(보조지표)
   - 캔버스 오버레이: 파랑(청소 완료), 빨강(청소 필요), 연두(hex lattice), 형광 초록(미분류 후보), 핑크(커버되지 않은 영역)
5. **수동 교정**: “편집 모드 전환” 활성화 후 구멍을 클릭하면 상태를 토글, “되돌리기”로 마지막 편집 취소
6. **결과 저장(향후)**: `saveInspection` 버튼은 현재 API 연동 대기 상태이며, 콘솔 프리뷰만 출력합니다.

## 분석 파이프라인 요약 (public/static/app.js)
1. `computeGrayscale` → `gaussianBlur5x5`
2. `thresholdBinaryInverse` + `morphologicalOpen/Close`로 후보 마스크 도출
3. ROI 적용 시 `applyROIMask`로 외곽 영역 제거
4. `segmentComponents`로 연결 요소 분석 → 면적 퍼센타일 필터
5. `classifyComponents`에서 평균 밝기 기반으로 상태 지정 및 hexMask 생성
6. `buildMissedMask`로 후보 대비 미분류 영역 추출
7. `recalculateMetrics`에서 면적·개수 기반 통계 산출 → `updateStats`로 UI 반영

## 데이터 및 저장소
- **영구 저장소**: 아직 없음. (향후 Cloudflare D1 / R2 / KV 연동 예정)
- **상태 관리**: 브라우저 메모리(state)와 DOM element 바인딩을 활용
- **히스토리 페이지**: 하드코딩된 샘플 데이터(향후 실제 DB 연동 시 교체)

## 개발 시 참고 사항
- ROI 지정/초기화 시 자동 재분석이 실행되며, 진행 중인 분석이 있을 경우 큐에 대기 후 순차 실행됩니다.
- 분석 중 추가 트리거(버튼/ROI)가 발생하면 `pendingReanalysis` 플래그를 통해 분석 완료 직후 재실행됩니다.
- `analyzeMesh`는 중복 실행을 방지하기 위해 `isAnalyzing` 플래그로 보호됩니다.
- 캔버스 크기는 업로드 이미지 최대 폭 1024px로 리사이즈하여 퍼포먼스를 유지합니다.
- 수동 교정 시 면적/개수 통계가 즉시 갱신되며, 편집 모드 종료·ROI 지정 시 교정 모드가 자동으로 비활성화됩니다.

## 향후 개선 아이디어
- Cloudflare D1 기반 검사 이력 CRUD 및 통계 대시보드 연동
- ROI 멀티 선택, 도형(원/다각형) 지원
- 분석 결과 다운로드(보고서 PDF/CSV)
- Hex lattice 자동 추정 알고리즘 고도화 및 파라미터 자동 튜닝
- Web Worker 도입으로 메인 스레드 부하 저감

## 업데이트 이력
- **2025-11-09**: ROI 지정 + 자동 재분석, 면적 기반 통계 카드 및 청소율 2종(면적/개수) 추가, 수동 교정/ROI와 분석 파이프라인 연동 개선.
