import { Request } from '../core/Request';
import { Response } from '../core/Response';
import http from 'http';
import https from 'https';
import { URL } from 'url';

/**
 * Spring MVC 컨트롤러 매핑 정보
 */
export interface SpringMapping {
  path: string;
  method: string;
  produces?: string[];
  consumes?: string[];
  className: string;
  methodName: string;
}

/**
 * Spring 애플리케이션 메타데이터
 */
export interface SpringMetadata {
  mappings: SpringMapping[];
  contextPath: string;
  port: number;
  profiles: string[];
  properties: Record<string, string>;
}

/**
 * Spring Bridge 설정
 */
export interface SpringBridgeConfig {
  springHost: string;
  springPort: number;
  springContextPath: string;
  healthCheckPath: string;
  metadataPath: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
}

/**
 * Spring Framework와의 HTTP 프록시 브릿지
 * TypeScript WAS에서 Spring 애플리케이션으로 요청을 전달하고 응답을 반환
 */
export class SpringBridge {
  private config: SpringBridgeConfig;
  private springMetadata: SpringMetadata | null = null;
  private isSpringReady = false;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor(config: Partial<SpringBridgeConfig> = {}) {
    this.config = {
      springHost: 'localhost',
      springPort: 8081,
      springContextPath: '',
      healthCheckPath: '/actuator/health',
      metadataPath: '/actuator/mappings',
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000,
      ...config,
    };
  }

  /**
   * Spring 브릿지 시작
   */
  async start(): Promise<void> {
    console.log(`[SpringBridge] Starting bridge to ${this.config.springHost}:${this.config.springPort}`);
    
    // Spring 애플리케이션 연결 대기
    await this.waitForSpring();
    
    // 메타데이터 수집
    await this.loadSpringMetadata();
    
    // 주기적 헬스체크 시작
    this.startHealthCheck();
    
    console.log('[SpringBridge] Bridge started successfully');
  }

  /**
   * Spring 브릿지 종료
   */
  async stop(): Promise<void> {
    console.log('[SpringBridge] Stopping bridge...');
    
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    
    this.isSpringReady = false;
    this.springMetadata = null;
    
    console.log('[SpringBridge] Bridge stopped');
  }

  /**
   * Spring 애플리케이션이 준비될 때까지 대기
   */
  private async waitForSpring(): Promise<void> {
    console.log('[SpringBridge] Waiting for Spring application...');
    
    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        const isHealthy = await this.checkSpringHealth();
        if (isHealthy) {
          this.isSpringReady = true;
          console.log('[SpringBridge] Spring application ready');
          return;
        }
      } catch (error) {
        console.log(`[SpringBridge] Connection attempt ${attempt}/${this.config.retryAttempts} failed`);
      }
      
      if (attempt < this.config.retryAttempts) {
        await this.sleep(this.config.retryDelay);
      }
    }
    
    throw new Error('Spring application not available after maximum retry attempts');
  }

  /**
   * Spring 애플리케이션 헬스체크
   */
  private async checkSpringHealth(): Promise<boolean> {
    return new Promise((resolve) => {
      const url = `http://${this.config.springHost}:${this.config.springPort}${this.config.healthCheckPath}`;
      const request = http.get(url, { timeout: 5000 }, (res) => {
        resolve(res.statusCode === 200);
      });
      
      request.on('error', () => resolve(false));
      request.on('timeout', () => {
        request.destroy();
        resolve(false);
      });
    });
  }

  /**
   * Spring 메타데이터 로드
   */
  private async loadSpringMetadata(): Promise<void> {
    console.log('[SpringBridge] Loading Spring metadata...');
    
    try {
      const response = await this.makeHttpRequest('GET', this.config.metadataPath);
      const data = JSON.parse(response.body);
      
      // Spring Boot Actuator mappings 형식 파싱
      const mappings: SpringMapping[] = [];
      
      if (data.contexts && data.contexts.application && data.contexts.application.mappings) {
        const dispatcherServlets = data.contexts.application.mappings.dispatcherServlets || {};
        
        Object.values(dispatcherServlets).forEach((servlet: any) => {
          if (servlet && Array.isArray(servlet)) {
            servlet.forEach((mapping: any) => {
              if (mapping.details && mapping.details.requestMappingConditions) {
                const conditions = mapping.details.requestMappingConditions;
                const methods = conditions.methods || ['GET'];
                const patterns = conditions.patterns || ['/'];
                
                methods.forEach((method: string) => {
                  patterns.forEach((pattern: string) => {
                    mappings.push({
                      path: pattern,
                      method: method.toUpperCase(),
                      produces: conditions.produces || [],
                      consumes: conditions.consumes || [],
                      className: mapping.details.handlerMethod?.className || 'Unknown',
                      methodName: mapping.details.handlerMethod?.name || 'unknown',
                    });
                  });
                });
              }
            });
          }
        });
      }
      
      this.springMetadata = {
        mappings,
        contextPath: this.config.springContextPath,
        port: this.config.springPort,
        profiles: [], // TODO: 프로파일 정보 수집
        properties: {}, // TODO: 프로퍼티 정보 수집
      };
      
      console.log(`[SpringBridge] Loaded ${mappings.length} Spring mappings`);
      
    } catch (error) {
      console.error('[SpringBridge] Failed to load Spring metadata:', error);
      throw error;
    }
  }

  /**
   * 주기적 헬스체크 시작
   */
  private startHealthCheck(): void {
    this.healthCheckInterval = setInterval(async () => {
      const isHealthy = await this.checkSpringHealth();
      if (this.isSpringReady !== isHealthy) {
        this.isSpringReady = isHealthy;
        console.log(`[SpringBridge] Spring health status changed: ${isHealthy ? 'UP' : 'DOWN'}`);
        
        if (isHealthy) {
          // 다시 연결되면 메타데이터 재로드
          try {
            await this.loadSpringMetadata();
          } catch (error) {
            console.error('[SpringBridge] Failed to reload metadata after reconnection:', error);
          }
        }
      }
    }, 30000); // 30초마다 체크
  }

  /**
   * Spring으로 HTTP 요청 프록시
   */
  async proxyRequest(request: Request, response: Response): Promise<void> {
    if (!this.isSpringReady) {
      response.status(503).json({ 
        error: 'Spring application not available',
        timestamp: new Date().toISOString()
      });
      return;
    }

    try {
      const springResponse = await this.makeHttpRequest(
        request.method,
        request.path,
        request.headers as Record<string, string>,
        await request.getBody()
      );

      // Spring 응답을 클라이언트로 전달
      response.status(springResponse.statusCode);
      
      // 헤더 복사 (일부 제외)
      Object.entries(springResponse.headers).forEach(([key, value]) => {
        if (!this.shouldSkipHeader(key)) {
          response.setHeader(key, value);
        }
      });
      
      response.send(springResponse.body);
      
    } catch (error) {
      console.error('[SpringBridge] Proxy request failed:', error);
      response.status(502).json({
        error: 'Bad Gateway - Spring request failed',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * HTTP 요청 실행
   */
  private async makeHttpRequest(
    method: string,
    path: string,
    headers: Record<string, string> = {},
    body?: string
  ): Promise<{ statusCode: number; headers: Record<string, string>; body: string }> {
    return new Promise((resolve, reject) => {
      const url = new URL(path, `http://${this.config.springHost}:${this.config.springPort}`);
      
      const options = {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method: method.toUpperCase(),
        headers: {
          ...headers,
          'Host': `${this.config.springHost}:${this.config.springPort}`,
        },
        timeout: this.config.timeout,
      };

      const request = http.request(options, (res) => {
        let responseBody = '';
        
        res.on('data', (chunk) => {
          responseBody += chunk;
        });
        
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode || 500,
            headers: res.headers as Record<string, string>,
            body: responseBody,
          });
        });
      });

      request.on('error', (error) => {
        reject(error);
      });

      request.on('timeout', () => {
        request.destroy();
        reject(new Error('Request timeout'));
      });

      if (body) {
        request.write(body);
      }
      
      request.end();
    });
  }

  /**
   * 전달하지 말아야 할 헤더 체크
   */
  private shouldSkipHeader(headerName: string): boolean {
    const skipHeaders = [
      'connection',
      'transfer-encoding',
      'content-encoding',
      'content-length',
    ];
    return skipHeaders.includes(headerName.toLowerCase());
  }

  /**
   * 유틸리티: sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Spring 준비 상태 반환
   */
  isReady(): boolean {
    return this.isSpringReady;
  }

  /**
   * Spring 메타데이터 반환
   */
  getMetadata(): SpringMetadata | null {
    return this.springMetadata;
  }

  /**
   * 특정 경로가 Spring에서 처리되는지 확인
   */
  hasSpringMapping(method: string, path: string): boolean {
    if (!this.springMetadata) {
      return false;
    }

    return this.springMetadata.mappings.some(mapping => {
      const methodMatches = mapping.method === method.toUpperCase() || mapping.method === 'REQUEST';
      const pathMatches = this.matchPath(mapping.path, path);
      return methodMatches && pathMatches;
    });
  }

  /**
   * 경로 매칭 (간단한 패턴 매칭)
   */
  private matchPath(pattern: string, path: string): boolean {
    // 정확한 매치
    if (pattern === path) {
      return true;
    }
    
    // 와일드카드 패턴 (Spring의 /** 패턴)
    if (pattern.endsWith('/**')) {
      const basePath = pattern.slice(0, -3);
      return path.startsWith(basePath);
    }
    
    // 단일 와일드카드 (Spring의 /* 패턴)
    if (pattern.endsWith('/*')) {
      const basePath = pattern.slice(0, -2);
      const remainingPath = path.slice(basePath.length);
      return path.startsWith(basePath) && !remainingPath.includes('/');
    }
    
    // TODO: 더 복잡한 Spring 경로 패턴 지원 (PathVariable 등)
    
    return false;
  }
} 