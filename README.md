# Tagmoa Web

Tagmoa Web은 **“태그”를 중심으로 작업을 정리하는 개인 생산성 웹 앱**입니다. 단순한 할 일 리스트가 아니라 프로젝트·일정·작업을 하나의 기준(태그)으로 묶어 **어디서든 동일한 워크스페이스**를 이어갈 수 있도록 설계했습니다.  
Android에서 먼저 선보인 Tagmoa의 철학을 웹으로 옮겨, 브라우저만 있으면 동일한 경험을 제공합니다.

## 💡 Tagmoa는 왜 태그 기반인가?

전통적인 “프로젝트 → 작업” 구조는 계속 쌓이는 일정/요청을 유연하게 재배치하기 어렵습니다. Tagmoa는 태그 중심 구조로 다음 문제를 해결합니다.

- 하나의 작업을 여러 카테고리로 묶고 싶을 때
- 프로젝트·업무·개인 일정이 섞여 있어 재분류가 필요할 때
- 날짜/중요도/진행 상태를 한 화면에서 보고 싶을 때

**Tag(대) → Main Task(중) → Sub Task(소)** 3단계 모델 덕분에 작업을 체계적으로 관리하면서도, 필요할 땐 순식간에 재구성할 수 있습니다.

## ✨ 주요 기능 소개

### 🏠 1. 홈(Home)
- 오늘 마감되는 작업 요약
- 완료율·일정 밀도 같은 핵심 지표
- 원하는 화면으로 이동하는 퀵 액션

앱에 들어오자마자 지금 집중해야 할 일과 우선순위를 즉시 파악할 수 있습니다.

### 🗂 2. 태그 기반 작업 관리
- 태그 생성/삭제/숨김/재정렬
- 자동 색상 추천 및 태그별 작업 모아보기

모든 작업이 태그를 기준으로 그룹화되므로 작업 흐름과 병목을 빠르게 찾아낼 수 있습니다.

### 📝 3. 메인/서브 테스크
- 하나의 메인 테스크에 여러 서브 테스크 연결
- 마감일, 중요도, 색상, 설명, 완료 체크, 진행률 표시

복잡한 프로젝트도 **큰 목표(Main)**와 **세부 단계(Sub)**로 나눠 자연스럽게 관리할 수 있습니다.

### 📅 4. 캘린더 뷰
- 월별 마감 일정과 일정 밀도 시각화
- 날짜 선택 시 해당 날짜의 작업 리스트 표시

“이날은 바쁘군” 같은 패턴을 한눈에 확인하거나 빠르게 일정 밀도를 파악할 수 있습니다.

### 👤 5. 프로필 & 설정
- Google 로그인 / 로그아웃
- 알림 시간 설정, 온보딩 초기화
- 계정 삭제(재인증)까지 Firebase Auth 기반으로 제공

간단하면서도 안전하게 계정을 관리할 수 있습니다.

### 🧪 6. 샘플 데이터 자동 생성
- Firebase가 연결되지 않아도 `localStorage`에 샘플 데이터를 생성
- 클론 직후 설치 없이 UI/기능을 체험 가능

## 🖥 어떤 경험을 목표로 하나요?

Tagmoa Web은 아래 사용자에게 최적화되어 있습니다.

- 프로젝트/과제/일정을 직관적으로 정리하고 싶은 사람
- 리스트가 많아질수록 구조가 복잡해져 관리가 어려웠던 사람
- Android와 Web에서 동일한 데이터를 사용하고 싶은 사람
- 태그 기반 정리에 익숙한 스케줄러·기획자·개발자·학생 등

“작업을 만들고 완료하는 과정이 조금 더 가볍고 즐겁도록” 만드는 것이 목표입니다.

## 🧩 기술 개요

- **프런트엔드**: Vue 3 + TypeScript + Vite
- **상태 관리**: Pinia, Vue Router, @vueuse/core
- **인증**: Firebase Authentication (Google Provider)
- **데이터**: Firebase Realtime Database + 로컬 샘플 스토리지
- **배포**: Firebase Hosting (`dist/`를 public으로 사용)
- **스타일**: CSS Custom Properties + 전역 유틸리티 (`src/assets`)
- **개발 도구**: vue-tsc, Prettier, npm-run-all2, vite-plugin-vue-devtools

### 프로젝트 구조

```
├── public/                 # 정적 리소스 및 Google Search Console 인증 파일
├── src/
│   ├── assets/             # 글로벌 스타일, 디자인 토큰
│   ├── components/         # UI 및 레이아웃 컴포넌트
│   ├── layouts/            # 라우팅된 뷰 래퍼(AppLayout 등)
│   ├── router/             # Vue Router 설정
│   ├── services/           # Firebase 초기화, DB 접근, 스토리지 헬퍼
│   ├── stores/             # Pinia 스토어(auth, workspace)
│   ├── utils/              # 날짜/ID 유틸
│   └── views/              # 페이지 단위 뷰
├── dist/                   # `npm run build` 산출물
├── firebase.json           # Hosting 설정 (Git에 포함되지 않음)
└── database.rules.json     # Realtime DB 규칙 (Git에 포함되지 않음)
```

## 🚀 시작하기

1. **환경 준비**
   - Node.js 20.19.0 이상 (또는 22.12.0 이상)
   - npm 10.x

2. **의존성 설치 & 개발 서버 실행**

   ```bash
   npm install
   npm run dev
   ```

   브라우저에서 <http://localhost:5173>에 접속하면 바로 테스트할 수 있습니다.

## 🔧 Firebase 연동

1. Firebase 프로젝트에서 **Authentication( Google )**, **Realtime Database**, **Hosting**을 활성화합니다.
2. 루트에 `.env` 혹은 `.env.local`을 만들어 Firebase Config를 보관합니다.
3. `src/services/firebase.ts` 파일을 생성해 다음 템플릿에 자신의 값을 채웁니다.

   ```ts
   import { initializeApp } from 'firebase/app'
   import { getAnalytics, isSupported } from 'firebase/analytics'
   import { getAuth } from 'firebase/auth'

   const firebaseConfig = {
     apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
     authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
     databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
     projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
     storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
     messagingSenderId: import.meta.env.VITE_FIREBASE_SENDER_ID,
     appId: import.meta.env.VITE_FIREBASE_APP_ID,
     measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
   }

   export const firebaseApp = initializeApp(firebaseConfig)
   export const firebaseAuth = getAuth(firebaseApp)

   if (typeof window !== 'undefined') {
     isSupported().then((ok) => ok && getAnalytics(firebaseApp)).catch(() => {})
   }
   ```

`.gitignore`에 `.env*`, `firebase.json`, `src/services/firebase.ts` 등이 이미 포함되어 있으므로 민감 정보가 Git에 올라가지 않습니다.

## 📦 NPM 스크립트

- `npm run dev` – Vite 개발 서버
- `npm run build` – `vue-tsc --build` 이후 프로덕션 번들(`dist/`)
- `npm run preview` – 빌드 결과 미리보기
- `npm run type-check` – Vue/TS 타입 검사만 실행
- `npm run build-only` – 타입 검사 없이 번들만 생성
- `npm run format` – `src/` 이하를 Prettier로 포맷

## ☁️ 배포 (Firebase Hosting)

```bash
npm run build
firebase deploy --only hosting
```

`firebase.json`은 SPA 라우팅을 위해 `rewrites: [{ "source": "**", "destination": "/index.html" }]`를 사용하고 public 디렉터리는 `dist`로 설정되어 있습니다.

## 📄 라이선스

MIT License (필요에 따라 수정 가능)

## 🎯 마무리

Tagmoa Web은 **“해야 할 일이 많은 사람들의 머릿속을 정리해주는 앱”**을 목표로 합니다.  
앱 구조, 데이터 모델, UI 흐름 모두 **태그 중심의 사고방식**이 주는 단순함과 유연함에 집중했습니다.  
필요한 워크플로와 기술 세부사항은 이 README와 `/src` 구조를 참고하며 자유롭게 확장해 주세요!
