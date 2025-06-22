#!/bin/bash

echo "🧪 Spring Boot + TypeScript WAS 연동 테스트"

# 테스트할 엔드포인트들
ENDPOINTS=(
    "http://localhost:8080/"
    "http://localhost:8080/api/health"
    "http://localhost:8080/hello?name=TypeScript"
    "http://localhost:8081/actuator/health"
    "http://localhost:8081/hello?name=Spring"
)

echo "📡 연동 테스트 시작..."

for endpoint in "${ENDPOINTS[@]}"; do
    echo "🔍 테스트 중: $endpoint"
    
    response=$(curl -s -o /dev/null -w "%{http_code}" "$endpoint")
    
    if [ "$response" = "200" ]; then
        echo "✅ 성공: $endpoint (HTTP $response)"
    else
        echo "❌ 실패: $endpoint (HTTP $response)"
    fi
    echo
done

echo "🎯 Spring Boot 매핑 정보 확인..."
curl -s "http://localhost:8081/actuator/mappings" | head -20

echo
echo "🏁 테스트 완료!" 