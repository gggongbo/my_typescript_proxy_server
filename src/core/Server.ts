import http from 'http'; // Node.js 기본 HTTP 모듈 임포트
import { AddressInfo } from 'net'; // 포트 번호 확인을 위한 타입

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
      (req: http.IncomingMessage, res: http.ServerResponse) => {
        // 2. 요청 핸들러 콜백 내부 구현:
        //    2-1. [로깅] 요청 메소드 및 URL 기록
        console.log(
          `[${new Date().toISOString()}] Received ${req.method} ${req.url}`
        );

        //    2-2. [기본 응답 처리]
        res.statusCode = 200; // 상태 코드 200 (OK)
        res.setHeader('Content-Type', 'text/plain; charset=utf-8'); // 헤더 설정
        res.end('Hello World from My TypeScript WAS!\n'); // 응답 본문 전송

        //    2-3. [향후 확장] 요청 파싱, 라우팅 등 로직 추가 위치
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
