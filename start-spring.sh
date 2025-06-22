#!/bin/bash

echo "🌸 Spring Boot 애플리케이션 시작 중..."

# Spring 프로젝트 디렉토리로 이동
cd spring_example

# Gradle 빌드 실행
echo "📦 Gradle 빌드 실행 중..."
./gradlew build -x test

# 빌드 성공 확인
if [ $? -eq 0 ]; then
    echo "✅ 빌드 성공!"
    echo "🚀 Spring Boot 애플리케이션 실행 중... (포트: 8081)"
    
    # Spring Boot 애플리케이션 실행
    ./gradlew bootRun
else
    echo "❌ 빌드 실패!"
    exit 1
fi 