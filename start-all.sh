#!/bin/bash

echo "🚀 Spring Boot + TypeScript WAS 통합 실행"

# 백그라운드에서 Spring Boot 실행
echo "🌸 Spring Boot 애플리케이션 시작 중... (백그라운드)"
cd spring_example
nohup ./gradlew bootRun > ../spring.log 2>&1 &
SPRING_PID=$!
cd ..

# Spring Boot가 시작될 때까지 대기
echo "⏳ Spring Boot 시작 대기 중..."
sleep 10

# Spring Boot 상태 확인
for i in {1..30}; do
    if curl -s http://localhost:8081/actuator/health > /dev/null; then
        echo "✅ Spring Boot 애플리케이션이 성공적으로 시작되었습니다!"
        break
    fi
    echo "⏳ Spring Boot 시작 대기 중... ($i/30)"
    sleep 2
done

# TypeScript WAS 빌드 및 실행
echo "🔧 TypeScript WAS 빌드 중..."
npm run build

echo "🚀 TypeScript WAS 시작 중..."
npm run start

# 종료 시 Spring Boot 프로세스도 함께 종료
trap "echo '🛑 애플리케이션 종료 중...'; kill $SPRING_PID; exit" INT TERM

wait 