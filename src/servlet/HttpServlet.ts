import { Request } from '../core/Request';
import { Response } from '../core/Response';

/**
 * 서블릿 설정 인터페이스
 */
export interface ServletConfig {
  /** 서블릿 이름 */
  servletName: string;
  /** 초기화 매개변수 */
  initParameters: Record<string, string>;
}

/**
 * 서블릿 기본 인터페이스
 */
export interface Servlet {
  /**
   * 서블릿 초기화
   */
  init(config: ServletConfig): Promise<void> | void;

  /**
   * 서블릿 설정 반환
   */
  getServletConfig(): ServletConfig | null;

  /**
   * 서블릿 정보 반환
   */
  getServletInfo(): string;

  /**
   * 요청 처리 메인 메소드
   */
  service(request: Request, response: Response): Promise<void> | void;

  /**
   * 서블릿 종료
   */
  destroy(): Promise<void> | void;
}

/**
 * 서블릿 예외 클래스
 */
export class ServletException extends Error {
  constructor(message: string, cause?: Error) {
    super(message);
    this.name = 'ServletException';
    if (cause) {
      this.cause = cause;
    }
  }
  
  public cause?: Error;
}

/**
 * 일반적인 서블릿 구현을 위한 추상 클래스
 */
export abstract class GenericServlet implements Servlet {
  private config: ServletConfig | null = null;

  /**
   * 서블릿 초기화
   */
  public async init(config: ServletConfig): Promise<void> {
    this.config = config;
    await this.initServlet();
  }

  /**
   * 사용자 정의 초기화 메소드
   * 하위 클래스에서 오버라이드 가능
   */
  protected async initServlet(): Promise<void> {
    // 기본 구현 - 아무것도 하지 않음
  }

  /**
   * 서블릿 설정 반환
   */
  public getServletConfig(): ServletConfig | null {
    return this.config;
  }

  /**
   * 초기화 매개변수 조회
   */
  public getInitParameter(name: string): string | undefined {
    return this.config?.initParameters[name];
  }

  /**
   * 모든 초기화 매개변수 이름 조회
   */
  public getInitParameterNames(): string[] {
    return Object.keys(this.config?.initParameters || {});
  }

  /**
   * 서블릿 정보 반환
   */
  public getServletInfo(): string {
    return 'My TypeScript WAS Generic Servlet';
  }

  /**
   * 추상 메소드 - 하위 클래스에서 반드시 구현해야 함
   */
  public abstract service(request: Request, response: Response): Promise<void> | void;

  /**
   * 서블릿 종료
   * 하위 클래스에서 오버라이드 가능
   */
  public async destroy(): Promise<void> {
    // 기본 구현 - 아무것도 하지 않음
  }

  /**
   * 로깅 유틸리티
   */
  protected log(message: string, error?: Error): void {
    const timestamp = new Date().toISOString();
    const servletName = this.config?.servletName || 'Unknown';
    
    if (error) {
      console.error(`[${timestamp}] [${servletName}] ${message}`, error);
    } else {
      console.log(`[${timestamp}] [${servletName}] ${message}`);
    }
  }
}

/**
 * HTTP 서블릿 추상 클래스
 * javax.servlet.http.HttpServlet과 유사한 구조
 */
export abstract class HttpServlet extends GenericServlet {
  private static readonly METHOD_DELETE = 'DELETE';
  private static readonly METHOD_HEAD = 'HEAD';
  private static readonly METHOD_GET = 'GET';
  private static readonly METHOD_OPTIONS = 'OPTIONS';
  private static readonly METHOD_POST = 'POST';
  private static readonly METHOD_PUT = 'PUT';
  private static readonly METHOD_TRACE = 'TRACE';

  /**
   * 서블릿 정보 반환
   */
  public getServletInfo(): string {
    return 'My TypeScript WAS HTTP Servlet';
  }

  /**
   * 메인 서비스 메소드
   * HTTP 메소드에 따라 적절한 do* 메소드를 호출
   */
  public async service(request: Request, response: Response): Promise<void> {
    const method = request.method.toUpperCase();

    try {
      switch (method) {
        case HttpServlet.METHOD_GET:
          await this.doGet(request, response);
          break;
        case HttpServlet.METHOD_HEAD:
          await this.doHead(request, response);
          break;
        case HttpServlet.METHOD_POST:
          await this.doPost(request, response);
          break;
        case HttpServlet.METHOD_PUT:
          await this.doPut(request, response);
          break;
        case HttpServlet.METHOD_DELETE:
          await this.doDelete(request, response);
          break;
        case HttpServlet.METHOD_OPTIONS:
          await this.doOptions(request, response);
          break;
        case HttpServlet.METHOD_TRACE:
          await this.doTrace(request, response);
          break;
        default:
          // 지원하지 않는 메소드
          response.status(501).text(`Method ${method} is not supported`);
      }
    } catch (error) {
      this.log('Error processing request', error as Error);
      response.status(500).text('Internal Server Error');
    }
  }

  /**
   * GET 요청 처리
   * 하위 클래스에서 오버라이드
   */
  protected async doGet(request: Request, response: Response): Promise<void> {
    response.status(405).text('Method GET is not supported');
  }

  /**
   * HEAD 요청 처리
   * 기본적으로 doGet을 호출하되 본문은 제외
   */
  protected async doHead(request: Request, response: Response): Promise<void> {
    await this.doGet(request, response);
  }

  /**
   * POST 요청 처리
   * 하위 클래스에서 오버라이드
   */
  protected async doPost(request: Request, response: Response): Promise<void> {
    response.status(405).text('Method POST is not supported');
  }

  /**
   * PUT 요청 처리
   * 하위 클래스에서 오버라이드
   */
  protected async doPut(request: Request, response: Response): Promise<void> {
    response.status(405).text('Method PUT is not supported');
  }

  /**
   * DELETE 요청 처리
   * 하위 클래스에서 오버라이드
   */
  protected async doDelete(request: Request, response: Response): Promise<void> {
    response.status(405).text('Method DELETE is not supported');
  }

  /**
   * OPTIONS 요청 처리
   * 지원하는 메소드들을 Allow 헤더에 포함
   */
  protected async doOptions(request: Request, response: Response): Promise<void> {
    const allowedMethods: string[] = [];
    
    // 각 메소드가 오버라이드되었는지 확인하여 지원 메소드 목록 구성
    if (this.doGet !== HttpServlet.prototype.doGet) allowedMethods.push('GET', 'HEAD');
    if (this.doPost !== HttpServlet.prototype.doPost) allowedMethods.push('POST');
    if (this.doPut !== HttpServlet.prototype.doPut) allowedMethods.push('PUT');
    if (this.doDelete !== HttpServlet.prototype.doDelete) allowedMethods.push('DELETE');
    
    allowedMethods.push('OPTIONS');
    
    response.setHeader('Allow', allowedMethods.join(', ')).status(200).text('');
  }

  /**
   * TRACE 요청 처리
   * 보안상 기본적으로 비활성화
   */
  protected async doTrace(request: Request, response: Response): Promise<void> {
    response.status(405).text('Method TRACE is not supported for security reasons');
  }
} 