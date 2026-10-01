package com.fieldservice.field_service_backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class FieldServiceBackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(FieldServiceBackendApplication.class, args);
	}

}
