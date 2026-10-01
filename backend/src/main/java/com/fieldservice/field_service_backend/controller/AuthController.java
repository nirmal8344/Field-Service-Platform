package com.fieldservice.field_service_backend.controller;

import com.fieldservice.field_service_backend.config.RequireRole;
import com.fieldservice.field_service_backend.config.UserContext;
import com.fieldservice.field_service_backend.dto.AuthResponse;
import com.fieldservice.field_service_backend.dto.LoginRequest;
import com.fieldservice.field_service_backend.dto.RegisterRequest;
import com.fieldservice.field_service_backend.dto.UserDTO;
import com.fieldservice.field_service_backend.exception.UnauthorizedException;
import com.fieldservice.field_service_backend.model.Role;
import com.fieldservice.field_service_backend.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.ok(authService.register(request));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @GetMapping("/me")
    public ResponseEntity<UserDTO> getCurrentUser() {
        String email = UserContext.getCurrentUserEmail();
        if (email == null) {
            throw new UnauthorizedException("Invalid or missing authentication token");
        }
        return ResponseEntity.ok(authService.getUserProfile(email));
    }

    @GetMapping("/users")
    @RequireRole({Role.ADMINISTRATOR})
    public ResponseEntity<List<UserDTO>> getAllUsers() {
        return ResponseEntity.ok(authService.getAllUsers());
    }

    @PostMapping("/users")
    @RequireRole({Role.ADMINISTRATOR})
    public ResponseEntity<AuthResponse> adminCreateUser(@RequestBody RegisterRequest request) {
        return ResponseEntity.ok(authService.adminCreateUser(request));
    }

    @PutMapping("/users/{id}")
    @RequireRole({Role.ADMINISTRATOR})
    public ResponseEntity<UserDTO> updateUser(@PathVariable Long id, @RequestBody UserDTO dto) {
        return ResponseEntity.ok(authService.updateUser(id, dto));
    }

    @DeleteMapping("/users/{id}")
    @RequireRole({Role.ADMINISTRATOR})
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        authService.deleteUser(id);
        return ResponseEntity.noContent().build();
    }
}

