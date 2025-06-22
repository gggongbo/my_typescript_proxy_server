# My TypeScript WAS

TypeScript로 개발하는 WAS(Web Application Server) 프로젝트입니다.

## 목표

- Tomcat과 유사한 기능을 제공하는 WAS 구현
- Spring Framework와 연동하여 사용할 수 있도록 호환성 확보
- TypeScript를 사용하여 개발

## 개발 환경

- Node.js
- TypeScript

## 프로젝트 구조

```
my_typescript_was/
├── src/              # 소스 코드 루트
│   ├── core/         # HTTP 서버, 요청/응답 처리 등 핵심 로직
│   ├── servlet/      # 서블릿 컨테이너 관련 구현
│   ├── spring/       # Spring Framework 연동 관련 구현
│   └── utils/        # 유틸리티 함수
├── tests/            # 테스트 코드
├── dist/             # 컴파일된 JavaScript 파일 (빌드 후 생성)
├── node_modules/     # Node.js 모듈 (npm install 후 생성)
├── package.json      # 프로젝트 설정 및 의존성 관리
├── tsconfig.json     # TypeScript 컴파일 설정
├── README.md         # 프로젝트 개요 (현재 파일)
├── PRD.korean.md     # 요구사항 정의서 (한국어)
├── PRD.english.md    # 요구사항 정의서 (영어)
└── NEW_FILE_REQUESTS.md # 파일 생성 요청 기록
```

## 관련 문서

- [요구사항 정의서 (한국어)](PRD.korean.md)
- [Project Requirements Document (English)](PRD.english.md)

## 구현 내용

- ✅ 기본 HTTP 요청/응답 처리 구현 (Request/Response 추상화)
- ✅ 기본 라우팅 시스템 구현 (Router, Route 클래스)
- 🚧 서블릿 컨테이너 기능 구현
- 🚧 Spring Framework 연동 모듈 개발

## 테스트

### 테스트 실행
```bash
# 모든 테스트 실행
npm test

# 테스트 watch 모드 (파일 변경 시 자동 재실행)
npm run test:watch

# 테스트 커버리지 확인
npm run test:coverage
```

### 테스트 종류
- **API 테스트** (`test/api.test.ts`): 실제 HTTP 요청/응답 테스트
- **Router 테스트** (`test/router.test.ts`): 라우팅 시스템 단위 테스트

### 테스트 결과
- ✅ 15개 테스트 모두 통과
- 📊 테스트 커버리지: 58.06% (핵심 로직 위주)
