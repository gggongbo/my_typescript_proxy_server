import http from 'http'; // Node.js 기본 HTTP 모듈 임포트
import { AddressInfo } from 'net'; // 포트 번호 확인을 위한 타입
import { Request } from './Request'; // 사용자 정의 Request 클래스
import { Response } from './Response'; // 사용자 정의 Response 클래스
import { Router } from './Router'; // 라우팅 시스템

/**
 * HTTP 서버의 핵심 로직을 담당하는 클래스
 */
export class Server {
  private port: number; // 서버가 리스닝할 포트 번호
  private httpServer: http.Server | null = null; // 실제 Node.js HTTP 서버 인스턴스
  private router: Router; // 라우팅 시스템

  /**
   * Server 인스턴스를 생성합니다.
   * @param port 리스닝할 포트 번호 (기본값: 8080)
   */
  constructor(port: number = 8080) {
    this.port = port;
    this.router = new Router();
    
    // 기본 라우트들 설정
    this.setupDefaultRoutes();
  }

  /**
   * HTTP 서버를 시작하고 요청 리스닝을 시작합니다.
   */
  public start(): void {
    if (this.httpServer) {
      console.log('Server is already running.');
      return;
    }

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
              <h3>사용 가능한 엔드포인트:</h3>
              <ul>
                <li><span class="endpoint">GET /</span> - 이 페이지</li>
                <li><span class="endpoint">GET /api/health</span> - 서버 상태 정보</li>
                <li><span class="endpoint">GET /hello?name=이름</span> - 인사말</li>
                <li><span class="endpoint">GET /users/:id</span> - 사용자 정보 (매개변수 예시)</li>
                <li><span class="endpoint">POST /api/echo</span> - 요청 본문 에코</li>
              </ul>
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
   * 요청을 라우터로 전달하는 메소드
   * @param request 추상화된 요청 객체
   * @param response 추상화된 응답 객체
   */
  private async handleRequest(request: Request, response: Response): Promise<void> {
    // 라우터에 요청 처리 위임
    await this.router.handle(request, response);
  }

  /**
   * 라우터에 접근하여 추가 라우트를 등록할 수 있습니다
   * @returns Router 인스턴스
   */
  public getRouter(): Router {
    return this.router;
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
        this.httpServer.close((error) => {
          if (error) {
            // 4. 에러 처리
            console.error('Error closing server:', error);
            reject(error); // Promise reject
            return;
          }
          // 3. 중지 완료 로그 및 Promise resolve
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
