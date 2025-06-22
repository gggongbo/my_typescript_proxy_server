import { HttpServlet } from '../HttpServlet';
import { Request } from '../../core/Request';
import { Response } from '../../core/Response';

/**
 * API 서블릿 구현
 * RESTful API 스타일의 예제 서블릿
 */
export class ApiServlet extends HttpServlet {
  public getServletInfo(): string {
    return 'API Servlet - RESTful API demo servlet';
  }

  protected async doGet(request: Request, response: Response): Promise<void> {
    const version = this.getInitParameter('version') || '1.0.0';
    
    const apiData = {
      message: 'API가 정상적으로 작동중입니다.',
      version: version,
      server: 'My TypeScript WAS',
      servletInfo: {
        name: this.getServletConfig()?.servletName,
        info: this.getServletInfo(),
        initParameters: Object.fromEntries(
          this.getInitParameterNames().map(name => [name, this.getInitParameter(name)])
        )
      },
      timestamp: new Date().toISOString(),
      endpoints: {
        'GET /servlet/api': '이 메시지 (API 정보)',
        'POST /servlet/api': '데이터 생성 (JSON 본문 필요)',
        'PUT /servlet/api': '데이터 업데이트 (JSON 본문 필요)',
        'DELETE /servlet/api?id=값': '데이터 삭제 (id 파라미터 필요)'
      },
      exampleRequests: {
        'POST': {
          url: '/servlet/api',
          headers: { 'Content-Type': 'application/json' },
          body: { name: 'test', value: 123 }
        },
        'PUT': {
          url: '/servlet/api',
          headers: { 'Content-Type': 'application/json' },
          body: { id: 1, name: 'updated', value: 456 }
        },
        'DELETE': {
          url: '/servlet/api?id=1',
          headers: {},
          body: null
        }
      }
    };

    response.json(apiData);
    this.log('API 정보 요청 처리 완료');
  }

  protected async doPost(request: Request, response: Response): Promise<void> {
    try {
      const data = await request.getBodyAsJson();
      
      // 간단한 데이터 검증
      if (!data || typeof data !== 'object') {
        response.status(400).json({
          success: false,
          error: 'Invalid data format',
          message: 'JSON 객체가 필요합니다.'
        });
        return;
      }

      const responseData = {
        success: true,
        message: '데이터가 성공적으로 생성되었습니다.',
        operation: 'CREATE',
        createdData: data,
        metadata: {
          id: Math.floor(Math.random() * 10000),
          timestamp: new Date().toISOString(),
          servletName: this.getServletConfig()?.servletName,
          clientIP: request.getClientIP(),
          userAgent: request.getUserAgent()
        }
      };

      response.status(201).json(responseData);
      this.log(`API POST 요청 처리 완료: 새 리소스 생성 (ID: ${responseData.metadata.id})`);
    } catch (error) {
      this.log('API POST 요청 처리 중 오류 발생', error as Error);
      response.status(400).json({
        success: false,
        error: 'Invalid JSON data',
        message: (error as Error).message,
        servletName: this.getServletConfig()?.servletName
      });
    }
  }

  protected async doPut(request: Request, response: Response): Promise<void> {
    try {
      const data = await request.getBodyAsJson();
      
      // 간단한 데이터 검증
      if (!data || typeof data !== 'object') {
        response.status(400).json({
          success: false,
          error: 'Invalid data format',
          message: 'JSON 객체가 필요합니다.'
        });
        return;
      }

      const responseData = {
        success: true,
        message: '데이터가 성공적으로 업데이트되었습니다.',
        operation: 'UPDATE',
        updatedData: data,
        metadata: {
          timestamp: new Date().toISOString(),
          servletName: this.getServletConfig()?.servletName,
          clientIP: request.getClientIP(),
          userAgent: request.getUserAgent()
        }
      };

      response.json(responseData);
      this.log('API PUT 요청 처리 완료: 리소스 업데이트');
    } catch (error) {
      this.log('API PUT 요청 처리 중 오류 발생', error as Error);
      response.status(400).json({
        success: false,
        error: 'Invalid JSON data',
        message: (error as Error).message,
        servletName: this.getServletConfig()?.servletName
      });
    }
  }

  protected async doDelete(request: Request, response: Response): Promise<void> {
    const id = request.getQueryParam('id');
    
    if (!id) {
      response.status(400).json({
        success: false,
        error: 'Missing required parameter',
        message: 'id 파라미터가 필요합니다.',
        example: '/servlet/api?id=123'
      });
      return;
    }

    const idValue = Array.isArray(id) ? id[0] : id;

    const responseData = {
      success: true,
      message: `ID ${idValue}의 데이터가 성공적으로 삭제되었습니다.`,
      operation: 'DELETE',
      deletedId: idValue,
      metadata: {
        timestamp: new Date().toISOString(),
        servletName: this.getServletConfig()?.servletName,
        clientIP: request.getClientIP(),
        userAgent: request.getUserAgent()
      }
    };

    response.json(responseData);
    this.log(`API DELETE 요청 처리 완료: ID ${idValue} 삭제`);
  }

  protected async doOptions(request: Request, response: Response): Promise<void> {
    // CORS 헤더 설정 (실제 프로덕션에서는 더 세밀한 설정 필요)
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    await super.doOptions(request, response);
    this.log('API OPTIONS 요청 처리 완료: CORS preflight');
  }
} 