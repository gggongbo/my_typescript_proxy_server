import * as fs from 'fs';
import * as path from 'path';

/**
 * Spring 설정 인터페이스
 */
export interface SpringConfig {
  server: {
    port: number;
    contextPath: string;
    ssl?: {
      enabled: boolean;
      keyStore?: string;
      keyStorePassword?: string;
    };
  };
  spring: {
    profiles: {
      active: string[];
    };
    application: {
      name: string;
    };
  };
  management: {
    endpoints: {
      web: {
        basePath: string;
        exposure: {
          include: string[];
        };
      };
    };
  };
  [key: string]: any;
}

/**
 * Spring Framework 설정 파일 파서
 * application.properties와 application.yml을 지원
 */
export class ConfigParser {
  private config: SpringConfig;

  constructor() {
    this.config = this.getDefaultConfig();
  }

  /**
   * 기본 설정값 반환
   */
  private getDefaultConfig(): SpringConfig {
    return {
      server: {
        port: 8081,
        contextPath: '',
      },
      spring: {
        profiles: {
          active: ['default'],
        },
        application: {
          name: 'spring-app',
        },
      },
      management: {
        endpoints: {
          web: {
            basePath: '/actuator',
            exposure: {
              include: ['health', 'info', 'mappings'],
            },
          },
        },
      },
    };
  }

  /**
   * 설정 파일 로드
   * @param configPath 설정 파일 경로 (기본값: ./application.properties)
   */
  async loadConfig(configPath = './application.properties'): Promise<SpringConfig> {
    try {
      if (fs.existsSync(configPath)) {
        console.log(`[ConfigParser] Loading config from: ${configPath}`);
        
        if (configPath.endsWith('.properties')) {
          await this.loadPropertiesFile(configPath);
        } else if (configPath.endsWith('.yml') || configPath.endsWith('.yaml')) {
          await this.loadYamlFile(configPath);
        } else {
          console.warn(`[ConfigParser] Unsupported config file format: ${configPath}`);
        }
      } else {
        console.log(`[ConfigParser] Config file not found: ${configPath}, using defaults`);
      }

      // 프로파일별 설정 파일 로드
      await this.loadProfileConfigs(path.dirname(configPath));

    } catch (error) {
      console.error('[ConfigParser] Error loading config:', error);
    }

    return this.config;
  }

  /**
   * Properties 파일 로드
   */
  private async loadPropertiesFile(filePath: string): Promise<void> {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // 주석이나 빈 줄 건너뛰기
      if (!trimmedLine || trimmedLine.startsWith('#') || trimmedLine.startsWith('!')) {
        continue;
      }

      // key=value 형태 파싱
      const equalIndex = trimmedLine.indexOf('=');
      if (equalIndex === -1) {
        continue;
      }

      const key = trimmedLine.substring(0, equalIndex).trim();
      const value = trimmedLine.substring(equalIndex + 1).trim();

      this.setNestedProperty(this.config, key, this.parseValue(value));
    }
  }

  /**
   * YAML 파일 로드 (간단한 구현)
   */
  private async loadYamlFile(filePath: string): Promise<void> {
    // 실제 프로덕션에서는 yaml 라이브러리 사용 권장
    console.warn('[ConfigParser] YAML support is limited. Consider using properties file.');
    
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    let currentPath: string[] = [];
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // 주석이나 빈 줄 건너뛰기
      if (!trimmedLine || trimmedLine.startsWith('#')) {
        continue;
      }

      // 들여쓰기 레벨 계산
      const indentLevel = line.length - line.trimStart().length;
      const depth = Math.floor(indentLevel / 2);

      // 현재 경로 조정
      currentPath = currentPath.slice(0, depth);

      // key: value 형태 파싱
      const colonIndex = trimmedLine.indexOf(':');
      if (colonIndex === -1) {
        continue;
      }

      const key = trimmedLine.substring(0, colonIndex).trim();
      const value = trimmedLine.substring(colonIndex + 1).trim();

      currentPath.push(key);

      if (value) {
        // 값이 있는 경우
        const fullKey = currentPath.join('.');
        this.setNestedProperty(this.config, fullKey, this.parseValue(value));
        currentPath.pop(); // 값이 있으면 더 이상 중첩되지 않음
      }
    }
  }

  /**
   * 프로파일별 설정 파일 로드
   */
  private async loadProfileConfigs(configDir: string): Promise<void> {
    const activeProfiles = this.config.spring.profiles.active;
    
    for (const profile of activeProfiles) {
      if (profile === 'default') continue;
      
      const profileConfigPath = path.join(configDir, `application-${profile}.properties`);
      if (fs.existsSync(profileConfigPath)) {
        console.log(`[ConfigParser] Loading profile config: ${profile}`);
        await this.loadPropertiesFile(profileConfigPath);
      }
    }
  }

  /**
   * 점으로 구분된 키를 사용하여 중첩된 객체에 값 설정
   */
  private setNestedProperty(obj: any, key: string, value: any): void {
    const keys = key.split('.');
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (!(k in current) || typeof current[k] !== 'object') {
        current[k] = {};
      }
      current = current[k];
    }

    const lastKey = keys[keys.length - 1];
    current[lastKey] = value;
  }

  /**
   * 문자열 값을 적절한 타입으로 파싱
   */
  private parseValue(value: string): any {
    const trimmedValue = value.trim();

    // 불린 값
    if (trimmedValue.toLowerCase() === 'true') return true;
    if (trimmedValue.toLowerCase() === 'false') return false;

    // 숫자 값
    if (/^\d+$/.test(trimmedValue)) {
      return parseInt(trimmedValue, 10);
    }
    if (/^\d+\.\d+$/.test(trimmedValue)) {
      return parseFloat(trimmedValue);
    }

    // 배열 값 (쉼표로 구분)
    if (trimmedValue.includes(',')) {
      return trimmedValue.split(',').map(v => v.trim());
    }

    // 문자열 값 (따옴표 제거)
    if ((trimmedValue.startsWith('"') && trimmedValue.endsWith('"')) ||
        (trimmedValue.startsWith("'") && trimmedValue.endsWith("'"))) {
      return trimmedValue.slice(1, -1);
    }

    return trimmedValue;
  }

  /**
   * 현재 설정 반환
   */
  getConfig(): SpringConfig {
    return this.config;
  }

  /**
   * 특정 속성값 조회
   */
  getProperty(key: string, defaultValue?: any): any {
    const keys = key.split('.');
    let current = this.config;

    for (const k of keys) {
      if (current && typeof current === 'object' && k in current) {
        current = current[k];
      } else {
        return defaultValue;
      }
    }

    return current;
  }

  /**
   * 설정을 Properties 형태 문자열로 출력
   */
  toPropertiesString(): string {
    const lines: string[] = [];
    this.flattenObject(this.config, '', lines);
    return lines.join('\n');
  }

  /**
   * 중첩된 객체를 평평하게 만들어 Properties 형태로 변환
   */
  private flattenObject(obj: any, prefix: string, lines: string[]): void {
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;

      if (value && typeof value === 'object' && !Array.isArray(value)) {
        this.flattenObject(value, fullKey, lines);
      } else if (Array.isArray(value)) {
        lines.push(`${fullKey}=${value.join(',')}`);
      } else {
        lines.push(`${fullKey}=${value}`);
      }
    }
  }

  /**
   * 환경변수에서 설정 오버라이드
   */
  loadEnvironmentOverrides(): void {
    console.log('[ConfigParser] Loading environment variable overrides...');
    
    // 일반적인 Spring Boot 환경변수들
    const envMappings = {
      'SERVER_PORT': 'server.port',
      'SERVER_SERVLET_CONTEXT_PATH': 'server.servlet.context-path',
      'SPRING_PROFILES_ACTIVE': 'spring.profiles.active',
      'SPRING_APPLICATION_NAME': 'spring.application.name',
      'MANAGEMENT_ENDPOINTS_WEB_BASE_PATH': 'management.endpoints.web.base-path',
    };

    for (const [envKey, configKey] of Object.entries(envMappings)) {
      const envValue = process.env[envKey];
      if (envValue) {
        console.log(`[ConfigParser] Override from env: ${configKey} = ${envValue}`);
        this.setNestedProperty(this.config, configKey, this.parseValue(envValue));
      }
    }
  }
} 