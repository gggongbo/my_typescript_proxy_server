# My TypeScript WAS 개발 계획

TypeScript 기반의 Spring Framework 호환 WAS 개발을 위해, 다음과 같은 순서로 기능을 구현합니다.

1.  **HTTP 서버 코어 구축 (`src/core`)**:

    - Node.js `http` 모듈 기반의 기본적인 HTTP 서버 뼈대를 구축합니다.
    - 목표: 기본적인 요청 수신 및 "Hello World" 수준의 응답 전송.

2.  **요청/응답 객체 추상화 (`src/core`)**:

    - Node.js의 기본 `IncomingMessage`, `ServerResponse` 대신 WAS 내부에서 사용하기 편리한 독자적인 `Request`, `Response` 클래스/인터페이스를 정의합니다.
    - 목표: 헤더, 메소드, URL, 파라미터, 본문 등의 쉬운 접근 및 응답 설정 표준화.

3.  **기본 라우팅 시스템 구현 (`src/core`)**:

    - 요청 URL 경로에 따라 다른 처리 로직을 연결하는 간단한 라우터를 구현합니다.
    - 목표: 경로 기반 핸들러 매핑 및 호출.

4.  **"서블릿" 개념 정의 및 핸들러 인터페이스 구현 (`src/servlet`)**:

    - Tomcat 서블릿과 유사한 요청 처리 단위("핸들러"/"컨트롤러")의 기본 인터페이스 (예: `handleRequest(request, response)`)를 정의합니다.

5.  **서블릿 컨테이너 기초 구현 (`src/servlet`)**:

    - 정의된 핸들러들을 로드/관리하고, 라우터를 통해 들어온 요청을 적절한 핸들러로 전달하는 컨테이너 로직을 구현합니다.
    - 목표: 핸들러 생명주기 관리 기초 마련.

6.  **Spring Framework 연동 인터페이스 개발 (`src/spring`, `src/servlet`)**:

    - Spring Boot 내장 서버로 사용될 수 있도록 표준 서블릿 API(예: `HttpServletRequest`, `HttpServletResponse`)와 유사한 호환 레이어를 구현합니다.
    - 또는 Spring Boot 내장 서버 연동 방식(`WebServerFactory` 등)을 분석하여 연동 포인트를 구현합니다.
    - **핵심 목표: Spring Framework와의 호환성 확보.**

7.  **고급 기능 및 Tomcat 호환성 고려**:

    - 핵심 기능 안정화 후 설정 파일 처리, 로깅, 에러 처리, 정적 파일, 세션 관리 등 고급 기능을 추가합니다.
    - 필요 시 Tomcat의 특정 설정/동작 방식과 호환성을 제공할 부분을 구현합니다.

8.  **테스트 및 리팩토링 (`tests/`)**:
    - 개발 초기부터 꾸준히 단위/통합 테스트를 작성하여 안정성을 확보합니다.
    - 지속적인 리팩토링으로 코드 품질 및 유지보수성을 개선합니다.
