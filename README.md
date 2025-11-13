# Mesh Cleanliness Inspector

## 프로젝트 개요
- **이름**: Mesh Cleanliness Inspector
- **목표**: 필터 매쉬(육각 격자) 사진을 업로드하거나 촬영해 청소 상태를 빠르게 판정하고, 청소율을 개수 및 면적 기준으로 시각화합니다.
- **주요 기능**:
  - 캔버스 기반 이미지 전처리(그레이스케일 → 가우시안 블러 → 역임계처리 → 형태학적 연산)
  - 구멍 자동 분류(검정 = 청소 완료, 회색 = 청소 필요) 및 hex lattice 제외 처리
  - 면적 기반 청소율 계산(총 면적, 청소 완료 면적, 청소 필요 면적, 미분류 후보 면적)
  - ROI(Region of Interest) 지정 및 자동 재분석, 수동 교정, 분석 로그
  - 가상 점(Virtual Holes) 탐지: 격자 패턴 분석을 통해 누락된 구멍을 보라색 점선 원으로 표시
  - 투명 배경 오버레이 이미지 다운로드: 원본 사진 없이 점 위치만 투명 배경에 표시한 PNG 다운로드
  - 카메라 캡처(getUserMedia)와 파일 업로드 지원
  - 분석 이력 샘플 페이지(`/history`)

## 실행 / 빌드
```bash
npm install

# 개발 환경
npm run dev              # 로컬 개발 (Vite)
npm run dev:sandbox      # Cloudflare Pages + D1 로컬 개발 서버
npm run build            # 프로덕션 빌드 (dist/_worker.js 생성)
npm run preview          # 빌드 결과 미리보기 (D1 로컬 모드)

# 데이터베이스 관리
npm run db:migrate:local # 로컬 D1 데이터베이스 마이그레이션 적용
npm run db:migrate:prod  # 프로덕션 D1 데이터베이스 마이그레이션 적용
npm run db:reset         # 로컬 D1 데이터베이스 초기화 및 재마이그레이션

# 배포
npm run deploy           # Cloudflare Pages 배포 파이프라인
```

> **주석**: 
> - Cloudflare Pages 환경을 사용하기 때문에 Node.js 전용 API(fs, child_process 등)는 사용할 수 없습니다.
> - 서버리스 요청 처리는 `src/index.tsx`의 Hono 라우터에서 수행합니다.
> - 로컬 개발 시 `--local` 플래그로 로컬 SQLite D1 데이터베이스를 사용합니다.

## URL / 엔드포인트

### 🌐 프로덕션 배포 URL
**Cloudflare Pages**: https://a0504845.mesh-inspector.pages.dev

### 페이지 라우트
- `/` : 메인 대시보드 (이미지 업로드, ROI 지정, 분석, 통계)
- `/history` : 검사 이력 전체보기 (D1 데이터베이스 연동)
- `/history/:id` : 검사 결과 상세 페이지 (오버레이 이미지 포함)
- `/healthz` : 간단한 상태 확인 JSON `{ status: "ok" }`

### API 라우트 (D1 데이터베이스)
- `POST /api/inspections` : 검사 결과 저장 (자동 호출)
  - Request body: `{ title, totalHoles, cleanedHoles, blockedHoles, totalArea, cleanedArea, blockedArea, missedArea, cleaningRateArea, cleaningRateCount, thresholdDark, thresholdGray, thresholdArea, manualEditsCount, roiX, roiY, roiWidth, roiHeight, virtualHolesCount, overlayImage }`
  - Response: `{ success, id, message }`
- `PUT /api/inspections/:id` : 검사 결과 업데이트 (자동 호출)
  - Request body: POST와 동일
  - Response: `{ success, message }`
- `GET /api/inspections?limit=50&offset=0` : 검사 이력 조회 (페이징 지원)
  - Response: `{ success, data, total, limit, offset }`
- `GET /api/inspections/:id` : 특정 검사 결과 상세 조회
  - Response: `{ success, data }`

## UI 구성 및 사용자 흐름

### Tab 1: 이미지 업로드 & 설정
1. **이미지 확보**: 
   - 파일 업로드: 파일 선택 시 하단에 "📎 파일명.jpg" 형식으로 표시
   - 카메라 촬영: "카메라 활성화 → 촬영" 버튼으로 이미지 획득
2. **임계값 조정**: 청소 완료/필요 명도 기준, 구멍 면적 퍼센타일(P%) 슬라이더 설정
3. **분석 시작**: "분석 시작" 버튼 클릭하여 자동 분석 실행

### Tab 2: 분석 결과 시각화
1. **ROI 지정(선택 사항)**: 
   - "검사 영역 지정" 버튼 → 캔버스 드래그 → 자동 재분석
   - "영역 초기화" 클릭 시 전체 영역 재분석
2. **결과 확인**:
   - 총 구멍 수 / 청소 완료 / 청소 필요 (개수 기준)
   - 총 검사 면적, 청소 완료 면적, 청소 필요 면적, 미분류 후보 면적 (px² 기준)
   - 청소율 2종: 면적 기준(주지표)과 개수 기준(보조지표)
   - 캔버스 오버레이: 파랑(청소 완료), 빨강(청소 필요), 연두(hex lattice), 형광 초록(미분류 후보), 보라색 점선(가상 점)
3. **수동 교정**: "편집 모드 전환" 활성화 후 구멍을 클릭하면 상태를 토글, "되돌리기"로 마지막 편집 취소
4. **결과 저장**: "검사 결과 저장" 버튼 클릭 시 D1 데이터베이스에 저장

### Tab 3: 검사 이력 전체보기
- 저장된 모든 검사 기록을 데이터베이스에서 불러와 표시
- 검사 통계 및 상세 정보 조회

## 결과 내보내기 기능

### 투명 배경 오버레이 다운로드
분석 완료 후 "결과 내보내기" 섹션의 "점 위치 이미지 다운로드" 버튼을 클릭하면:
- 원본 사진을 제외하고 점 위치만 투명 배경에 표시한 PNG 이미지 다운로드
- 파란색 점 (청소 완료), 빨간색 점 (청소 필요), 보라색 점선 원 (가상 점) 모두 포함
- 파일명: `{검사제목}_overlay_{타임스탬프}.png`
- 이미지는 투명 배경(알파 채널)으로 저장되어 다른 도구에서 활용 가능

### 활용 예시
- 보고서 작성 시 원본 사진과 오버레이를 겹쳐서 표시
- 다른 이미지 편집 도구에서 추가 가공 및 분석
- 프레젠테이션 자료 제작

## 분석 파이프라인 요약 (public/static/app.js)
1. `computeGrayscale` → `gaussianBlur5x5`
2. `thresholdBinaryInverse` + `morphologicalOpen/Close`로 후보 마스크 도출
3. ROI 적용 시 `applyROIMask`로 외곽 영역 제거
4. `segmentComponents`로 연결 요소 분석 → 면적 퍼센타일 필터
5. `classifyComponents`에서 평균 밝기 기반으로 상태 지정 및 hexMask 생성
6. `buildMissedMask`로 후보 대비 미분류 영역 추출
7. `recalculateMetrics`에서 면적·개수 기반 통계 산출 → `updateStats`로 UI 반영

## 데이터 및 저장소
- **영구 저장소**: ✅ **Cloudflare D1 SQLite 데이터베이스** 연동 완료
  - 로컬 개발: `.wrangler/state/v3/d1` 디렉토리에 로컬 SQLite DB 자동 생성
  - 프로덕션: Cloudflare D1 분산 SQLite 데이터베이스 사용
- **데이터베이스 테이블**: `inspections` (검사 결과 저장)
  - 저장 항목: 제목, 구멍 통계(개수/면적), 청소율, 임계값, ROI, 가상 점 수, 생성/수정 시각
- **API 엔드포인트**:
  - `POST /api/inspections` - 검사 결과 저장
  - `GET /api/inspections` - 저장된 검사 이력 조회 (페이징 지원)
  - `GET /api/inspections/:id` - 특정 검사 결과 상세 조회
- **상태 관리**: 브라우저 메모리(state)와 DOM element 바인딩을 활용
- **히스토리 페이지**: 하드코딩된 샘플 데이터 (향후 DB 연동으로 실제 데이터 표시 예정)

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

## 최근 업데이트
- **2025-11-13 (최신)**:
  - ✅ **500px² 최대 면적 필터 추가**: 큰 패턴(손상 영역, 테이프 등)을 자동 제외하여 오탐지 방지
  - ✅ **검사 이력 로딩 성능 최적화**: overlay_image 제외로 조회 속도 2,700배 개선 (2분+ → 0.03초)
  - ✅ **실시간 미리보기 기능**: 다운로드 버튼 없이도 분석/편집 시 즉시 이미지 미리보기 표시
  - ✅ **점 추가 기능**: "청소 완료 점 추가" / "청소 필요 점 추가" 버튼으로 수동 점 추가 가능
  - ✅ **가상 점 경고 배너**: 가상 점 감지 시 품질 경고 메시지 표시
  - ✅ **디버그 로그 추가**: 개발자 콘솔에서 미리보기 생성 과정 추적 가능
  - 🌐 **Cloudflare Pages 배포**: https://a0504845.mesh-inspector.pages.dev
- **2025-11-11**: 
  - ✅ **ROI 색상 가시성 개선**: 주황색/골드 계열로 변경하여 육안 구분 용이
    - 완료된 ROI: 진한 주황색 외곽선 (rgba(255, 100, 0, 1.0)), 밝은 주황색 채우기
    - 드래그 중 ROI: 밝은 골드 외곽선 (rgba(255, 165, 0, 1.0)), 황금색 채우기
    - 선 두께 증가 및 점선 패턴 강화로 가시성 향상
  - ✅ **청소 필요 면적 계산 수정**: "청소 필요 면적 및 골격 제외 면적"으로 라벨 변경
    - 수식 변경: (전체 면적 - 파란색 점 면적) = ROI 면적 - 청소 완료 면적
  - ✅ **파일 선택 UI 개선**: 
    - 파일명 표시를 "파일 선택" 버튼 바로 옆으로 이동
    - "분석 시작"과 "초기화" 버튼을 같은 줄에 배치하여 공간 효율 향상
    - 반응형 flex-wrap으로 모바일/데스크탑 대응
  - ✅ **파일명 표시 버그 수정**: 파일 업로드 후 초기화 시에도 파일명이 올바르게 표시되도록 수정
- **2025-11-10**: 
  - ✅ **자동 저장 기능**: 이미지 업로드 시 분석 완료되면 자동으로 DB에 저장
  - ✅ **실시간 업데이트**: ROI/임계값 변경 시 기존 레코드를 자동으로 UPDATE
  - ✅ **오버레이 이미지 저장**: 분석 결과 캔버스를 base64로 변환하여 DB에 저장
  - ✅ **검사 이력 상세 페이지**: `/history/:id`에서 오버레이 이미지와 상세 통계 표시
  - ✅ **탭 기반 UI 네비게이션 추가**: 3개 탭으로 구분하여 스크롤 최소화 (1. 업로드 & 설정, 2. 분석 결과, 3. 검사 이력)
  - ✅ **ROI 컨트롤을 Tab 2로 이동**: 분석 결과 페이지에서 직접 검사 영역 설정 가능
  - ✅ **업로드 파일명 표시 기능**: 파일 선택 시 "📎 파일명.jpg" 형식으로 표시 (초록색 강조)
  - ✅ **Cloudflare D1 데이터베이스 연동 완료**: 검사 결과 영구 저장 및 이력 조회 기능 구현
  - ✅ **API 엔드포인트 4개 추가**: POST/PUT/GET 검사 결과 저장/업데이트/조회
  - ✅ 로컬 D1 SQLite 데이터베이스 자동 생성 및 마이그레이션 시스템
  - ✅ 프론트엔드에서 자동으로 DB 저장 및 업데이트
- **2025-11-09**: 
  - ✅ 투명 배경 오버레이 이미지 다운로드 기능 추가: 원본 사진 없이 점 위치만 투명 PNG로 내보내기
  - ✅ 가상 점(Virtual Holes) 탐지 기능 추가: 격자 패턴 분석으로 누락된 구멍을 보라색 점선 원으로 표시
  - ✅ ROI 지정 + 자동 재분석, 면적 기반 통계 카드 및 청소율 2종(면적/개수) 추가
  - ✅ 수동 교정/ROI와 분석 파이프라인 연동 개선
  - ✅ 화이트 테마로 전환하여 가시성 향상
