package com.company;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication(scanBasePackages = "com.company")
public class CompanyPlatformApplication {

    public static void main(String[] args) {
        SpringApplication.run(CompanyPlatformApplication.class, args);
    }
}
