import http from 'http'; // Node.js 기본 HTTP 모듈 임포트
import { AddressInfo } from 'net'; // 포트 번호 확인을 위한 타입
import { Request } from './Request'; // 사용자 정의 Request 클래스
import { Response } from './Response'; // 사용자 정의 Response 클래스
import { Router } from './Router'; // 라우팅 시스템
import { ServletContainer } from '../servlet/ServletContainer'; // 서블릿 컨테이너
import { HelloServlet } from '../servlet/examples/HelloServlet'; // Hello World 서블릿
import { ApiServlet } from '../servlet/examples/ApiServlet'; // API 서블릿
import { SpringBridge } from '../spring/SpringBridge'; // Spring Framework 브릿지
import { ConfigParser } from '../spring/ConfigParser'; // Spring 설정 파서
import { SessionManager, MemorySessionStore } from '../spring/SessionManager'; // 세션 관리자



/**
 * HTTP 서버의 핵심 로직을 담당하는 클래스
 */
export class Server {
  private port: number; // 서버가 리스닝할 포트 번호
  private httpServer: http.Server | null = null; // 실제 Node.js HTTP 서버 인스턴스
  private router: Router; // 라우팅 시스템
  private servletContainer: ServletContainer; // 서블릿 컨테이너
  private springBridge: SpringBridge | null = null; // Spring Framework 브릿지
  private configParser: ConfigParser; // Spring 설정 파서
  private sessionManager: SessionManager; // 세션 관리자
  private springEnabled = false; // Spring 연동 활성화 여부

  /**
   * Server 인스턴스를 생성합니다.
   * @param port 리스닝할 포트 번호 (기본값: 8080)
   */
  constructor(port: number = 8080) {
    this.port = port;
    this.router = new Router();
    this.servletContainer = new ServletContainer();
    
    // Spring 관련 컴포넌트 초기화
    this.configParser = new ConfigParser();
    this.sessionManager = new SessionManager(new MemorySessionStore());
    
    // 기본 라우트들 설정
    this.setupDefaultRoutes();
  }

  /**
   * HTTP 서버를 시작하고 요청 리스닝을 시작합니다.
   */
  public async start(): Promise<void> {
    if (this.httpServer) {
      console.log('Server is already running.');
      return;
    }

    // 서블릿 컨테이너 설정 및 시작
    await this.setupDefaultServlets();
    await this.servletContainer.start();

    // Spring 브릿지 초기화 (선택적)
    await this.setupSpringBridge();

    // 1. http.createServer()로 서버 인스턴스 생성 및 요청 핸들러 등록
    this.httpServer = http.createServer(
      async (req: http.IncomingMessage, res: http.ServerResponse) => {
        // 2. 추상화된 Request/Response 객체 생성
        const request = new Request(req);
        const response = new Response(res);

        try {
          // 3. 요청 로깅 (추상화된 API 사용)
          console.log(
            `[${new Date().toISOString()}] ${request.method} ${request.url} from ${request.getClientIP()}`
          );

          // 4. 기본 응답 처리 (새로운 Response API 사용)
          await this.handleRequest(request, response);
        } catch (error) {
          // 5. 에러 처리
          console.error('Request handling error:', error);
          if (!response.finished) {
            response.status(500).text('Internal Server Error');
          }
        }
      }
    );

    // 3. 서버 에러 처리 리스너 등록
    this.httpServer.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`Error: Port ${this.port} is already in use.`);
      } else {
        console.error('Server Error:', error);
      }
      // 실제 서비스에서는 더 정교한 에러 처리 필요
      this.httpServer = null; // 에러 발생 시 서버 인스턴스 정리
    });

    // 4. 지정된 포트에서 리스닝 시작 및 로그 기록
    this.httpServer.listen(this.port, () => {
      const address = this.httpServer?.address(); // listen 성공 후 address 호출 보장
      const listenPort = typeof address === 'string' ? address : address?.port;
      console.log(`Server listening on port ${listenPort || this.port}`);
    });
  }

  /**
   * 기본 라우트들을 설정하는 메소드
   */
  private setupDefaultRoutes(): void {
    // 홈 페이지
    this.router.get('/', (request, response) => {
      response.html(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>My TypeScript WAS</title>
            <style>
              body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
              h1 { color: #2c3e50; }
              .info { background: #ecf0f1; padding: 15px; border-radius: 5px; margin: 20px 0; }
              .endpoint { font-family: monospace; background: #34495e; color: white; padding: 2px 6px; border-radius: 3px; }
            </style>
          </head>
          <body>
            <h1>Welcome to My TypeScript WAS!</h1>
            <p>서버가 성공적으로 실행되고 있습니다.</p>
            
            <div class="info">
              <h3>🌐 기본 라우트 엔드포인트:</h3>
              <ul>
                <li><span class="endpoint">GET /</span> - 이 페이지</li>
                <li><span class="endpoint">GET /api/health</span> - 서버 상태 정보</li>
                <li><span class="endpoint">GET /hello?name=이름</span> - 인사말</li>
                <li><span class="endpoint">GET /users/:id</span> - 사용자 정보 (매개변수 예시)</li>
                <li><span class="endpoint">POST /api/echo</span> - 요청 본문 에코</li>
              </ul>
            </div>
            
            <div class="info">
              <h3>⚙️ 서블릿 엔드포인트:</h3>
              <ul>
                <li><span class="endpoint">GET /servlet/hello?name=이름</span> - Hello World 서블릿</li>
                <li><span class="endpoint">POST /servlet/hello</span> - Hello World 서블릿 (POST)</li>
                <li><span class="endpoint">GET /servlet/api</span> - API 서블릿 정보</li>
                <li><span class="endpoint">POST /servlet/api</span> - API 서블릿 (데이터 생성)</li>
                <li><span class="endpoint">PUT /servlet/api</span> - API 서블릿 (데이터 업데이트)</li>
                <li><span class="endpoint">DELETE /servlet/api?id=값</span> - API 서블릿 (데이터 삭제)</li>
              </ul>
            </div>
            
            <div class="info">
              <h3>🌸 Spring Framework 연동:</h3>
              <p><strong>상태:</strong> ${this.springEnabled ? '🟢 연결됨' : '🔴 비활성화'}</p>
              ${this.springEnabled ? `
                <p>Spring 애플리케이션(포트 ${this.springBridge?.getMetadata()?.port || 8081})과 연동되어 있습니다.</p>
                <p>Spring 컨트롤러의 모든 엔드포인트가 자동으로 프록시됩니다.</p>
              ` : `
                <p>Spring 애플리케이션을 포트 8081에서 실행하고 application.properties 파일을 제공하면 자동으로 연동됩니다.</p>
              `}
            </div>
          </body>
        </html>
      `);
    });

    // 서버 상태 API
    this.router.get('/api/health', (request, response) => {
      response.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        method: request.method,
        path: request.path,
        routes: this.router.getRouteCount()
      });
    });

    // 인사말 (쿼리 파라미터 예시)
    this.router.get('/hello', (request, response) => {
      const name = request.getQueryParam('name') || 'World';
      response.text(`Hello, ${name}! 🎉`);
    });

    // 경로 매개변수 예시
    this.router.get('/users/:id', (request, response, params) => {
      const userId = params?.id || 'unknown';
      response.json({
        message: '사용자 정보',
        userId: userId,
        userAgent: request.getUserAgent(),
        clientIP: request.getClientIP()
      });
    });

    // POST 요청 예시 (요청 본문 처리)
    this.router.post('/api/echo', async (request, response) => {
      try {
        const body = await request.getBody();
        const contentType = request.getContentType();
        
        response.json({
          message: '요청 본문을 그대로 반환합니다',
          originalBody: body,
          contentType: contentType,
          contentLength: request.getContentLength()
        });
      } catch (error) {
        response.status(400).json({
          error: '요청 본문을 읽을 수 없습니다',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });
  }

  /**
   * 기본 서블릿들을 설정하는 메소드
   */
  private async setupDefaultServlets(): Promise<void> {
    // Hello World 서블릿
    const helloServlet = new HelloServlet();
    await this.servletContainer.registerServlet('/servlet/hello', helloServlet, {
      servletName: 'HelloServlet',
      initParameters: {
        'greeting': 'Hello from TypeScript WAS!'
      }
    }, 1); // loadOnStartup: 1

    // API 서블릿
    const apiServlet = new ApiServlet();
    await this.servletContainer.registerServlet('/servlet/api', apiServlet, {
      servletName: 'ApiServlet',
      initParameters: {
        'version': '1.0.0'
      }
    }, 2); // loadOnStartup: 2
  }

  /**
   * 서블릿 컨테이너에 접근
   */
  public getServletContainer(): ServletContainer {
    return this.servletContainer;
  }

  /**
   * 요청을 라우터 또는 서블릿으로 전달하는 메소드
   * @param request 추상화된 요청 객체
   * @param response 추상화된 응답 객체
   */
  private async handleRequest(request: Request, response: Response): Promise<void> {
    // 먼저 서블릿 컨테이너에서 처리 시도
    const servletHandled = await this.servletContainer.handleRequest(request, response);
    
    if (!servletHandled) {
      // 서블릿에서 처리되지 않으면 라우터에 위임
      await this.router.handle(request, response);
    }
  }

  /**
   * 라우터에 접근하여 추가 라우트를 등록할 수 있습니다
   * @returns Router 인스턴스
   */
  public getRouter(): Router {
    return this.router;
  }

  /**
   * Spring 브릿지를 설정하는 메소드
   */
  private async setupSpringBridge(): Promise<void> {
    try {
      // 설정 파일 로드
      const config = await this.configParser.loadConfig('./application.properties');
      console.log('[Server] Spring config loaded:', {
        springPort: config.server.port,
        contextPath: config.server.contextPath,
        profiles: config.spring.profiles.active
      });

      // 환경 변수 오버라이드
      this.configParser.loadEnvironmentOverrides();

      // Spring 애플리케이션이 있는지 확인하고 브릿지 초기화
      this.springBridge = new SpringBridge({
        springPort: config.server.port,
        springContextPath: config.server.contextPath,
        healthCheckPath: `${config.management.endpoints.web.basePath}/health`,
        metadataPath: `${config.management.endpoints.web.basePath}/mappings`,
      });

      try {
        await this.springBridge.start();
        this.springEnabled = true;
        console.log('[Server] Spring integration enabled');

        // Spring 매핑을 라우터에 동적으로 추가
        await this.registerSpringRoutes();

      } catch (error) {
        console.log('[Server] Spring application not available, running without Spring integration');
        this.springBridge = null;
        this.springEnabled = false;
      }

    } catch (error) {
      console.log('[Server] Spring configuration not found or invalid, running in standalone mode');
      this.springEnabled = false;
    }
  }

  /**
   * Spring 매핑을 TypeScript WAS 라우터에 등록
   */
  private async registerSpringRoutes(): Promise<void> {
    if (!this.springBridge || !this.springBridge.isReady()) {
      return;
    }

    const metadata = this.springBridge.getMetadata();
    if (!metadata) {
      return;
    }

    console.log(`[Server] Registering ${metadata.mappings.length} Spring routes...`);

    // Spring 매핑을 TypeScript WAS 라우터에 동적으로 추가
    for (const mapping of metadata.mappings) {
      // Spring 컨트롤러로 프록시하는 핸들러 생성
      const proxyHandler = async (request: Request, response: Response) => {
        // 세션 처리
        const session = await this.sessionManager.getOrCreateSession(request, response);
        
        // Spring으로 세션 정보 전달
        const sessionHeaders = this.sessionManager.createSpringSessionHeaders(session);
        Object.assign(request.headers, sessionHeaders);

        // Spring으로 요청 프록시
        await this.springBridge!.proxyRequest(request, response);
      };

      // 라우터에 Spring 매핑 등록
      const method = mapping.method.toLowerCase() as 'get' | 'post' | 'put' | 'delete';
      if (['get', 'post', 'put', 'delete'].includes(method)) {
        this.router[method](mapping.path, proxyHandler);
        console.log(`[Server] Registered Spring route: ${mapping.method} ${mapping.path} -> ${mapping.className}.${mapping.methodName}`);
      }
    }
  }

  /**
   * HTTP 서버를 중지합니다.
   * Promise를 반환하여 비동기 완료를 알립니다.
   * @returns 서버 중지 완료 시 resolve되는 Promise
   */
  public stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      // 1. httpServer 인스턴스 확인
      if (this.httpServer && this.httpServer.listening) {
        console.log('Stopping server...');
        // 2. 서버 중지
        this.httpServer.close(async (error) => {
          if (error) {
            // 4. 에러 처리
            console.error('Error closing server:', error);
            reject(error); // Promise reject
            return;
          }
          
          // 5. 서블릿 컨테이너 정리
          try {
            await this.servletContainer.stop();
          } catch (containerError) {
            console.error('Error stopping servlet container:', containerError);
          }

          // 6. Spring 브릿지 정리
          if (this.springBridge) {
            try {
              await this.springBridge.stop();
            } catch (springError) {
              console.error('Error stopping Spring bridge:', springError);
            }
          }

          // 7. 세션 매니저 정리
          try {
            await this.sessionManager.destroy();
          } catch (sessionError) {
            console.error('Error destroying session manager:', sessionError);
          }
          
          // 6. 중지 완료 로그 및 Promise resolve
          console.log('Server stopped successfully.');
          this.httpServer = null; // 서버 인스턴스 정리
          resolve(); // Promise resolve
        });
      } else {
        console.log('Server is not running or already stopped.');
        resolve(); // 이미 멈춰있어도 성공으로 간주
      }
    });
  }
}
