package com.example.test;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.core.env.Environment;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@SpringBootApplication
@RestController
@MapperScan("com.example.test.mapper")
public class TestApplication {

    private final Environment environment;

    public TestApplication(Environment environment) {
        this.environment = environment;
    }

    @GetMapping("/hello")
    public String hello(@RequestParam(value = "name", defaultValue = "World") String name) {
        String[] profiles = environment.getActiveProfiles();
        if (profiles.length == 0) {
            System.out.println("활성화된 프로필이 없습니다.");
        } else {
            System.out.println("활성화된 프로필: " + String.join(", ", profiles));
        }
        return "Hello " + name + "!";
    }

    public static void main(String[] args) {
        SpringApplication.run(TestApplication.class, args);
    }
} 