import { IncomingMessage } from 'http';
import { URL } from 'url';

/**
 * HTTP 요청을 추상화한 클래스
 * Node.js의 IncomingMessage를 래핑하여 편리한 API 제공
 */
export class Request {
  private readonly _raw: IncomingMessage;
  private _body: string | null = null;
  private _bodyParsed = false;
  private _parsedUrl: URL | null = null;

  constructor(req: IncomingMessage) {
    this._raw = req;
  }

  /**
   * 원본 Node.js IncomingMessage 객체에 접근
   */
  public get raw(): IncomingMessage {
    return this._raw;
  }

  /**
   * HTTP 메소드 (GET, POST, PUT, DELETE 등)
   */
  public get method(): string {
    return this._raw.method || 'GET';
  }

  /**
   * 요청 URL (전체)
   */
  public get url(): string {
    return this._raw.url || '/';
  }

  /**
   * 요청 경로 (쿼리 파라미터 제외)
   */
  public get path(): string {
    return this.getParsedUrl().pathname;
  }

  /**
   * HTTP 버전
   */
  public get httpVersion(): string {
    return this._raw.httpVersion;
  }

  /**
   * 요청 헤더 객체
   */
  public get headers(): Record<string, string | string[] | undefined> {
    return this._raw.headers;
  }

  /**
   * 특정 헤더 값 조회
   * @param name 헤더 이름 (대소문자 구분 없음)
   */
  public getHeader(name: string): string | string[] | undefined {
    return this._raw.headers[name.toLowerCase()];
  }

  /**
   * Content-Type 헤더 조회
   */
  public getContentType(): string | undefined {
    const contentType = this.getHeader('content-type');
    return Array.isArray(contentType) ? contentType[0] : contentType;
  }

  /**
   * Content-Length 헤더 조회
   */
  public getContentLength(): number {
    const contentLength = this.getHeader('content-length');
    const length = Array.isArray(contentLength) ? contentLength[0] : contentLength;
    return length ? parseInt(length, 10) : 0;
  }

  /**
   * 쿼리 파라미터 객체 조회
   */
  public get queryParams(): Record<string, string | string[]> {
    const searchParams = this.getParsedUrl().searchParams;
    const params: Record<string, string | string[]> = {};
    
    for (const [key, value] of searchParams.entries()) {
      if (params[key]) {
        // 이미 존재하는 키면 배열로 변환
        if (Array.isArray(params[key])) {
          (params[key] as string[]).push(value);
        } else {
          params[key] = [params[key] as string, value];
        }
      } else {
        params[key] = value;
      }
    }
    
    return params;
  }

  /**
   * 특정 쿼리 파라미터 값 조회
   * @param name 파라미터 이름
   */
  public getQueryParam(name: string): string | string[] | undefined {
    return this.queryParams[name];
  }

  /**
   * 요청 본문을 문자열로 조회 (비동기)
   */
  public async getBody(): Promise<string> {
    if (this._bodyParsed) {
      return this._body || '';
    }

    return new Promise((resolve, reject) => {
      let body = '';
      
      this._raw.on('data', (chunk) => {
        body += chunk.toString();
      });
      
      this._raw.on('end', () => {
        this._body = body;
        this._bodyParsed = true;
        resolve(body);
      });
      
      this._raw.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * 요청 본문을 JSON으로 파싱 (비동기)
   */
  public async getBodyAsJson<T = any>(): Promise<T> {
    const body = await this.getBody();
    try {
      return JSON.parse(body);
    } catch (error) {
      throw new Error(`Failed to parse request body as JSON: ${error}`);
    }
  }

  /**
   * User-Agent 헤더 조회
   */
  public getUserAgent(): string | undefined {
    const userAgent = this.getHeader('user-agent');
    return Array.isArray(userAgent) ? userAgent[0] : userAgent;
  }

  /**
   * 클라이언트 IP 주소 조회 (프록시 고려)
   */
  public getClientIP(): string {
    // X-Forwarded-For 헤더 확인 (프록시를 통한 요청인 경우)
    const xForwardedFor = this.getHeader('x-forwarded-for');
    if (xForwardedFor) {
      const ips = Array.isArray(xForwardedFor) ? xForwardedFor[0] : xForwardedFor;
      return ips.split(',')[0].trim();
    }

    // X-Real-IP 헤더 확인
    const xRealIp = this.getHeader('x-real-ip');
    if (xRealIp) {
      return Array.isArray(xRealIp) ? xRealIp[0] : xRealIp;
    }

    // 소켓에서 직접 IP 주소 조회
    return this._raw.socket.remoteAddress || 'unknown';
  }

  /**
   * 요청이 HTTPS인지 확인
   */
  public isSecure(): boolean {
    // TLS 소켓인지 확인
    if ((this._raw.socket as any).encrypted) {
      return true;
    }

    // X-Forwarded-Proto 헤더 확인 (프록시를 통한 HTTPS 요청인 경우)
    const xForwardedProto = this.getHeader('x-forwarded-proto');
    if (xForwardedProto) {
      const proto = Array.isArray(xForwardedProto) ? xForwardedProto[0] : xForwardedProto;
      return proto.toLowerCase() === 'https';
    }

    return false;
  }

  /**
   * URL 파싱 결과를 캐시하여 반환
   */
  private getParsedUrl(): URL {
    if (!this._parsedUrl) {
      // 기본 호스트 설정 (Host 헤더가 있으면 사용, 없으면 localhost)
      const host = this.getHeader('host') || 'localhost';
      const protocol = this.isSecure() ? 'https:' : 'http:';
      this._parsedUrl = new URL(this.url, `${protocol}//${host}`);
    }
    return this._parsedUrl;
  }
} 