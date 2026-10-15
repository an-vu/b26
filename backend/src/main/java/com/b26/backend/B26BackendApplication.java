package com.b26.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class B26BackendApplication {
  public static void main(String[] args) {
    SpringApplication.run(B26BackendApplication.class, args);
  }
}
