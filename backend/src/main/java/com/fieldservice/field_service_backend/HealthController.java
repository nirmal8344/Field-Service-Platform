package com.fieldservice.field_service_backend;

import com.fieldservice.field_service_backend.repository.UserRepository;
import com.fieldservice.field_service_backend.service.SeedDataService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api")
public class HealthController {

    private final SeedDataService seedDataService;
    private final UserRepository userRepository;

    public HealthController(SeedDataService seedDataService, UserRepository userRepository) {
        this.seedDataService = seedDataService;
        this.userRepository = userRepository;
    }

    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> health() {
        long userCount = 0;
        try {
            userCount = userRepository.count();
        } catch (Exception ignored) {}
        return ResponseEntity.ok(Map.of(
            "status", "UP",
            "version", "1.0.2",
            "userCount", userCount
        ));
    }

    @GetMapping("/seed")
    public ResponseEntity<Map<String, Object>> seedGet() {
        seedDataService.seedAll(true);
        long count = userRepository.count();
        return ResponseEntity.ok(Map.of(
            "status", "SUCCESS",
            "message", "FieldHub master and demo seed data initialized successfully",
            "userCount", count
        ));
    }

    @PostMapping("/seed")
    public ResponseEntity<Map<String, Object>> seedPost() {
        seedDataService.seedAll(true);
        long count = userRepository.count();
        return ResponseEntity.ok(Map.of(
            "status", "SUCCESS",
            "message", "FieldHub master and demo seed data initialized successfully",
            "userCount", count
        ));
    }
}