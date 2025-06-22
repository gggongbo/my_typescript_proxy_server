import { HttpServlet, ServletConfig } from './HttpServlet';
import { Request } from '../core/Request';
import { Response } from '../core/Response';

/**
 * 서블릿 매핑 정보
 */
export interface ServletMapping {
  /** URL 패턴 */
  urlPattern: string;
  /** 서블릿 인스턴스 */
  servlet: HttpServlet;
  /** 서블릿 설정 */
  config: ServletConfig;
  /** 로드 시점 (숫자가 낮을수록 먼저 로드) */
  loadOnStartup?: number;
  /** 서블릿 생성 시간 */
  createdAt: Date;
  /** 마지막 접근 시간 */
  lastAccessed: Date;
  /** 요청 처리 횟수 */
  requestCount: number;
}

/**
 * 서블릿 컨테이너 통계
 */
export interface ContainerStats {
  /** 등록된 서블릿 수 */
  servletCount: number;
  /** 총 요청 처리 횟수 */
  totalRequests: number;
  /** 컨테이너 시작 시간 */
  startedAt: Date;
  /** 활성 서블릿 목록 */
  activeServlets: Array<{
    name: string;
    urlPattern: string;
    requestCount: number;
    lastAccessed: Date;
  }>;
}

/**
 * 서블릿 컨테이너 예외
 */
export class ServletContainerException extends Error {
  constructor(message: string, cause?: Error) {
    super(message);
    this.name = 'ServletContainerException';
    if (cause) {
      this.cause = cause;
    }
  }
  
  public cause?: Error;
}

/**
 * 서블릿 컨테이너 클래스
 * 서블릿들의 생명주기를 관리하고 요청을 적절한 서블릿으로 라우팅
 */
export class ServletContainer {
  private servletMappings: Map<string, ServletMapping> = new Map();
  private servletsByName: Map<string, ServletMapping> = new Map();
  private isStarted: boolean = false;
  private startedAt: Date | null = null;
  private totalRequests: number = 0;

  /**
   * 컨테이너 시작
   */
  public async start(): Promise<void> {
    if (this.isStarted) {
      throw new ServletContainerException('Container is already started');
    }

    this.log('Starting servlet container...');
    
    try {
      // loadOnStartup이 설정된 서블릿들을 우선순위에 따라 초기화
      const startupServlets = Array.from(this.servletMappings.values())
        .filter(mapping => mapping.loadOnStartup !== undefined)
        .sort((a, b) => (a.loadOnStartup || 0) - (b.loadOnStartup || 0));

      for (const mapping of startupServlets) {
        await this.initializeServlet(mapping);
      }

      this.isStarted = true;
      this.startedAt = new Date();
      this.log(`Servlet container started successfully with ${this.servletMappings.size} servlets`);
    } catch (error) {
      this.log('Failed to start servlet container', error as Error);
      throw new ServletContainerException('Container startup failed', error as Error);
    }
  }

  /**
   * 컨테이너 종료
   */
  public async stop(): Promise<void> {
    if (!this.isStarted) {
      this.log('Container is not started');
      return;
    }

    this.log('Stopping servlet container...');
    
    try {
      // 모든 서블릿 destroy 호출
      for (const mapping of this.servletMappings.values()) {
        try {
          await mapping.servlet.destroy();
          this.log(`Servlet destroyed: ${mapping.config.servletName}`);
        } catch (error) {
          this.log(`Error destroying servlet ${mapping.config.servletName}`, error as Error);
        }
      }

      this.isStarted = false;
      this.startedAt = null;
      this.log('Servlet container stopped successfully');
    } catch (error) {
      this.log('Error during container shutdown', error as Error);
      throw new ServletContainerException('Container shutdown failed', error as Error);
    }
  }

  /**
   * 서블릿 등록
   */
  public async registerServlet(
    urlPattern: string,
    servlet: HttpServlet,
    config: ServletConfig,
    loadOnStartup?: number
  ): Promise<void> {
    if (this.servletMappings.has(urlPattern)) {
      throw new ServletContainerException(`Servlet already mapped to URL pattern: ${urlPattern}`);
    }

    if (this.servletsByName.has(config.servletName)) {
      throw new ServletContainerException(`Servlet name already exists: ${config.servletName}`);
    }

    const mapping: ServletMapping = {
      urlPattern,
      servlet,
      config,
      loadOnStartup,
      createdAt: new Date(),
      lastAccessed: new Date(),
      requestCount: 0
    };

    this.servletMappings.set(urlPattern, mapping);
    this.servletsByName.set(config.servletName, mapping);

    // 컨테이너가 이미 시작된 경우 즉시 초기화
    if (this.isStarted) {
      await this.initializeServlet(mapping);
    }

    this.log(`Servlet registered: ${config.servletName} at ${urlPattern}`);
  }

  /**
   * 서블릿 해제
   */
  public async unregisterServlet(urlPattern: string): Promise<void> {
    const mapping = this.servletMappings.get(urlPattern);
    if (!mapping) {
      throw new ServletContainerException(`No servlet mapped to URL pattern: ${urlPattern}`);
    }

    try {
      await mapping.servlet.destroy();
      this.servletMappings.delete(urlPattern);
      this.servletsByName.delete(mapping.config.servletName);
      
      this.log(`Servlet unregistered: ${mapping.config.servletName} from ${urlPattern}`);
    } catch (error) {
      this.log(`Error unregistering servlet from ${urlPattern}`, error as Error);
      throw new ServletContainerException(`Failed to unregister servlet: ${urlPattern}`, error as Error);
    }
  }

  /**
   * 요청 처리
   */
  public async handleRequest(request: Request, response: Response): Promise<boolean> {
    if (!this.isStarted) {
      throw new ServletContainerException('Container is not started');
    }

    // URL 패턴 매칭 (가장 구체적인 패턴부터 확인)
    const matchedMapping = this.findMatchingServlet(request.path);
    
    if (!matchedMapping) {
      return false; // 매칭되는 서블릿 없음
    }

    try {
      // 통계 업데이트
      matchedMapping.lastAccessed = new Date();
      matchedMapping.requestCount++;
      this.totalRequests++;

      // 서블릿이 아직 초기화되지 않았다면 초기화
      if (!this.isServletInitialized(matchedMapping)) {
        await this.initializeServlet(matchedMapping);
      }

      // 서블릿에 요청 위임
      await matchedMapping.servlet.service(request, response);
      
      this.log(`Request handled by servlet: ${matchedMapping.config.servletName} (${request.method} ${request.path})`);
      return true;
    } catch (error) {
      this.log(`Error handling request in servlet ${matchedMapping.config.servletName}`, error as Error);
      
      // 서블릿 에러를 응답으로 변환
      if (!response.headersSent) {
        response.status(500).json({
          error: 'Servlet Error',
          message: (error as Error).message,
          servlet: matchedMapping.config.servletName,
          timestamp: new Date().toISOString()
        });
      }
      return true;
    }
  }

  /**
   * 컨테이너 통계 조회
   */
  public getStats(): ContainerStats {
    return {
      servletCount: this.servletMappings.size,
      totalRequests: this.totalRequests,
      startedAt: this.startedAt || new Date(),
      activeServlets: Array.from(this.servletMappings.values()).map(mapping => ({
        name: mapping.config.servletName,
        urlPattern: mapping.urlPattern,
        requestCount: mapping.requestCount,
        lastAccessed: mapping.lastAccessed
      }))
    };
  }

  /**
   * 등록된 모든 서블릿 목록 조회
   */
  public getServletMappings(): ServletMapping[] {
    return Array.from(this.servletMappings.values());
  }

  /**
   * 특정 서블릿 정보 조회
   */
  public getServletByName(name: string): ServletMapping | undefined {
    return this.servletsByName.get(name);
  }

  /**
   * 서블릿 초기화
   */
  private async initializeServlet(mapping: ServletMapping): Promise<void> {
    try {
      await mapping.servlet.init(mapping.config);
      this.log(`Servlet initialized: ${mapping.config.servletName}`);
    } catch (error) {
      this.log(`Failed to initialize servlet: ${mapping.config.servletName}`, error as Error);
      throw new ServletContainerException(`Servlet initialization failed: ${mapping.config.servletName}`, error as Error);
    }
  }

  /**
   * 서블릿 초기화 여부 확인
   */
  private isServletInitialized(mapping: ServletMapping): boolean {
    // 서블릿의 getServletConfig()가 null이 아니면 초기화된 것으로 간주
    return mapping.servlet.getServletConfig() !== null;
  }

  /**
   * 요청 경로에 매칭되는 서블릿 찾기
   */
  private findMatchingServlet(requestPath: string): ServletMapping | null {
    // 정확한 경로 매칭 우선
    for (const [pattern, mapping] of this.servletMappings) {
      if (requestPath === pattern) {
        return mapping;
      }
    }

    // 접두사 매칭 (가장 긴 매칭부터)
    const prefixMatches: Array<{ pattern: string; mapping: ServletMapping }> = [];
    
    for (const [pattern, mapping] of this.servletMappings) {
      if (requestPath.startsWith(pattern)) {
        prefixMatches.push({ pattern, mapping });
      }
    }

    // 가장 긴 패턴 매칭 반환
    if (prefixMatches.length > 0) {
      prefixMatches.sort((a, b) => b.pattern.length - a.pattern.length);
      return prefixMatches[0].mapping;
    }

    return null;
  }

  /**
   * 로깅 유틸리티
   */
  private log(message: string, error?: Error): void {
    const timestamp = new Date().toISOString();
    
    if (error) {
      console.error(`[${timestamp}] [ServletContainer] ${message}`, error);
    } else {
      console.log(`[${timestamp}] [ServletContainer] ${message}`);
    }
  }
} 