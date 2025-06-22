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
- ✅ 서블릿 컨테이너 기능 구현 (ServletContainer, HttpServlet)
- ✅ **Spring Framework 연동 브릿지 구현** (SpringBridge, ConfigParser, SessionManager)

## Spring Framework 연동

### 개요
TypeScript WAS는 HTTP 프록시 방식으로 Spring Framework 애플리케이션과 연동됩니다:
- **TypeScript WAS**: 포트 8080 (프론트엔드 WAS 역할)
- **Spring Application**: 포트 8081 (백엔드 애플리케이션 역할)

### 주요 기능

#### 1. 자동 Spring 컨트롤러 매핑
- Spring Boot Actuator의 `/actuator/mappings` 엔드포인트에서 메타데이터 수집
- `@RequestMapping`, `@GetMapping` 등의 Spring 컨트롤러 경로를 자동으로 TypeScript WAS 라우터에 등록
- 클라이언트 요청을 적절한 Spring 컨트롤러로 프록시

#### 2. 설정 파일 통합
- `application.properties` 파일 자동 파싱
- 환경 변수 오버라이드 지원
- Spring 애플리케이션 포트, 컨텍스트 경로 등 설정 동기화

#### 3. 세션 관리
- TypeScript WAS와 Spring 간 세션 정보 공유
- 쿠키 기반 세션 ID 관리
- Spring Security 인증 정보 동기화
- 메모리/Redis 기반 세션 저장소 지원

#### 4. 헬스체크 및 자동 재연결
- Spring 애플리케이션 상태 주기적 모니터링
- 연결 실패 시 자동 재시도
- Spring 재시작 시 자동 재연결 및 메타데이터 갱신

### 사용 방법

1. **Spring 애플리케이션 설정**
   ```bash
   # application.properties 복사
   cp application.properties.example application.properties
   ```

2. **TypeScript WAS 시작**
   ```bash
   npm run dev
   ```
   - Spring 애플리케이션이 없으면 독립 모드로 실행
   - Spring 애플리케이션이 감지되면 자동으로 연동 모드로 전환

3. **Spring 애플리케이션 시작** (별도 터미널)
   ```bash
   # Spring Boot 애플리케이션을 포트 8081에서 실행
   # Actuator 엔드포인트 활성화 필요
   ```

### 아키텍처
```
클라이언트 요청
      ↓
TypeScript WAS (8080)
├── 정적 파일 처리
├── 세션 관리
├── Spring 매핑 확인
└── Spring 프록시 (8081)
      ↓
Spring Application
├── @RestController
├── @Service
├── @Repository
└── 비즈니스 로직
```

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
