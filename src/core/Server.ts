import http from 'http'; // Node.js 기본 HTTP 모듈 임포트
import { AddressInfo } from 'net'; // 포트 번호 확인을 위한 타입
import { Request } from './Request'; // 사용자 정의 Request 클래스
import { Response } from './Response'; // 사용자 정의 Response 클래스

/**
 * HTTP 서버의 핵심 로직을 담당하는 클래스
 */
export class Server {
  private port: number; // 서버가 리스닝할 포트 번호
  private httpServer: http.Server | null = null; // 실제 Node.js HTTP 서버 인스턴스

  /**
   * Server 인스턴스를 생성합니다.
   * @param port 리스닝할 포트 번호 (기본값: 8080)
   */
  constructor(port: number = 8080) {
    this.port = port;
    // 생성자: 포트 번호 저장, httpServer는 null 초기화 (start에서 생성)
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
   * 개별 요청을 처리하는 메소드
   * 향후 라우팅 시스템으로 확장될 예정
   * @param request 추상화된 요청 객체
   * @param response 추상화된 응답 객체
   */
  private async handleRequest(request: Request, response: Response): Promise<void> {
    // 기본 라우팅 로직 (현재는 모든 요청에 동일한 응답)
    
    // 간단한 경로별 처리 예시
    if (request.path === '/') {
      response.html('<h1>Welcome to My TypeScript WAS!</h1><p>Server is running successfully.</p>');
    } else if (request.path === '/api/health') {
      response.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        method: request.method,
        path: request.path
      });
    } else if (request.path === '/hello') {
      const name = request.getQueryParam('name') || 'World';
      response.text(`Hello, ${name}!`);
    } else {
      // 404 처리
      response.status(404).html('<h1>404 - Page Not Found</h1>');
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
