import { HttpServlet } from '../HttpServlet';
import { Request } from '../../core/Request';
import { Response } from '../../core/Response';

/**
 * Hello World 서블릿 구현
 */
export class HelloServlet extends HttpServlet {
  public getServletInfo(): string {
    return 'Hello World Servlet - Demo servlet for My TypeScript WAS';
  }

  protected async doGet(request: Request, response: Response): Promise<void> {
    const name = request.getQueryParam('name') || 'World';
    const greeting = this.getInitParameter('greeting') || 'Hello';
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Hello Servlet</title>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
          h1 { color: #2c3e50; }
          .info { background: #ecf0f1; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .param { background: #e8f5e8; padding: 10px; border-radius: 3px; margin: 10px 0; }
        </style>
      </head>
      <body>
        <h1>${greeting}, ${Array.isArray(name) ? name[0] : name}!</h1>
        <div class="info">
          <h3>🔧 서블릿 정보:</h3>
          <ul>
            <li><strong>서블릿 이름:</strong> ${this.getServletConfig()?.servletName}</li>
            <li><strong>서블릿 정보:</strong> ${this.getServletInfo()}</li>
            <li><strong>초기화 매개변수:</strong></li>
            <ul>
              ${this.getInitParameterNames().map(name => 
                `<li>${name}: ${this.getInitParameter(name)}</li>`
              ).join('')}
            </ul>
          </ul>
        </div>
        
        <div class="info">
          <h3>📡 요청 정보:</h3>
          <ul>
            <li><strong>HTTP 메소드:</strong> ${request.method}</li>
            <li><strong>요청 경로:</strong> ${request.path}</li>
            <li><strong>클라이언트 IP:</strong> ${request.getClientIP()}</li>
            <li><strong>User-Agent:</strong> ${request.getUserAgent() || 'Unknown'}</li>
            <li><strong>HTTPS 여부:</strong> ${request.isSecure() ? '예' : '아니오'}</li>
            <li><strong>HTTP 버전:</strong> ${request.httpVersion}</li>
          </ul>
        </div>

        <div class="param">
          <h3>💡 사용법:</h3>
          <p><code>?name=홍길동</code> 을 URL에 추가해보세요!</p>
          <p>예시: <code>/servlet/hello?name=TypeScript개발자</code></p>
        </div>

        <div class="info">
          <h3>🧪 테스트해볼 수 있는 것들:</h3>
          <ul>
            <li>POST 요청으로 데이터 전송</li>
            <li>다양한 쿼리 파라미터 테스트</li>
            <li>헤더 정보 확인</li>
          </ul>
        </div>
      </body>
      </html>
    `;
    
    response.html(html);
    this.log(`GET 요청 처리 완료: ${request.path}`);
  }

  protected async doPost(request: Request, response: Response): Promise<void> {
    try {
      const body = await request.getBody();
      const contentType = request.getContentType();
      
      let parsedData: any = body;
      if (contentType && contentType.includes('application/json')) {
        try {
          parsedData = await request.getBodyAsJson();
        } catch {
          // JSON 파싱 실패 시 문자열 그대로 사용
        }
      }

      const responseData = {
        message: 'POST 요청이 성공적으로 처리되었습니다.',
        servletInfo: {
          name: this.getServletConfig()?.servletName,
          info: this.getServletInfo(),
          initParameters: Object.fromEntries(
            this.getInitParameterNames().map(name => [name, this.getInitParameter(name)])
          )
        },
        requestInfo: {
          method: request.method,
          path: request.path,
          contentType: contentType,
          contentLength: request.getContentLength(),
          clientIP: request.getClientIP(),
          userAgent: request.getUserAgent()
        },
        receivedData: parsedData,
        timestamp: new Date().toISOString()
      };

      response.json(responseData);
      this.log(`POST 요청 처리 완료: ${request.path}`);
    } catch (error) {
      this.log('POST 요청 처리 중 오류 발생', error as Error);
      response.status(400).json({
        error: 'Invalid request data',
        message: (error as Error).message,
        servletName: this.getServletConfig()?.servletName
      });
    }
  }
} 