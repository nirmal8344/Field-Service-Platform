package com.fieldservice.field_service_backend;

import com.fieldservice.field_service_backend.service.SeedDataService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api")
public class HealthController {

    private final SeedDataService seedDataService;

    public HealthController(SeedDataService seedDataService) {
        this.seedDataService = seedDataService;
    }

    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> health() {
        return ResponseEntity.ok(Map.of("status", "UP"));
    }

    @GetMapping("/seed")
    public ResponseEntity<Map<String, Object>> seedGet() {
        seedDataService.run();
        return ResponseEntity.ok(Map.of("status", "SUCCESS", "message", "FieldHub master and demo seed data initialized successfully"));
    }

    @PostMapping("/seed")
    public ResponseEntity<Map<String, Object>> seedPost() {
        seedDataService.run();
        return ResponseEntity.ok(Map.of("status", "SUCCESS", "message", "FieldHub master and demo seed data initialized successfully"));
    }
}