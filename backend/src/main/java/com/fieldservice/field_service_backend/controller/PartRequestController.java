package com.fieldservice.field_service_backend.controller;

import com.fieldservice.field_service_backend.config.RequireRole;
import com.fieldservice.field_service_backend.config.UserContext;
import com.fieldservice.field_service_backend.dto.CreatePartRequestDTO;
import com.fieldservice.field_service_backend.dto.ForwardPartRequestDTO;
import com.fieldservice.field_service_backend.dto.PartRequestDTO;
import com.fieldservice.field_service_backend.dto.ReviewPartRequestDTO;
import com.fieldservice.field_service_backend.model.Role;
import com.fieldservice.field_service_backend.service.PartRequestService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/inventory/requests")
public class PartRequestController {

    private final PartRequestService partRequestService;

    public PartRequestController(PartRequestService partRequestService) {
        this.partRequestService = partRequestService;
    }

    @GetMapping
    @RequireRole({Role.TECHNICIAN, Role.DISPATCHER, Role.ADMINISTRATOR})
    public ResponseEntity<List<PartRequestDTO>> getAllRequests() {
        String email = UserContext.getCurrentUserEmail();
        Role role = UserContext.getCurrentUserRole();
        return ResponseEntity.ok(partRequestService.getAllRequests(email, role));
    }

    @GetMapping("/{id}")
    @RequireRole({Role.TECHNICIAN, Role.DISPATCHER, Role.ADMINISTRATOR})
    public ResponseEntity<PartRequestDTO> getRequestById(@PathVariable Long id) {
        return ResponseEntity.ok(partRequestService.getRequestById(id));
    }

    @PostMapping
    @RequireRole({Role.TECHNICIAN, Role.DISPATCHER, Role.ADMINISTRATOR})
    public ResponseEntity<PartRequestDTO> createRequest(@Valid @RequestBody CreatePartRequestDTO dto) {
        String email = UserContext.getCurrentUserEmail();
        return ResponseEntity.ok(partRequestService.createRequest(dto, email));
    }

    @PutMapping("/{id}/forward")
    @RequireRole({Role.DISPATCHER, Role.ADMINISTRATOR})
    public ResponseEntity<PartRequestDTO> forwardToAdmin(
            @PathVariable Long id,
            @RequestBody(required = false) ForwardPartRequestDTO dto) {
        String email = UserContext.getCurrentUserEmail();
        return ResponseEntity.ok(partRequestService.forwardToAdmin(id, dto, email));
    }

    @PutMapping("/{id}/approve")
    @RequireRole({Role.ADMINISTRATOR})
    public ResponseEntity<PartRequestDTO> approveRequest(
            @PathVariable Long id,
            @RequestBody(required = false) ReviewPartRequestDTO dto) {
        String email = UserContext.getCurrentUserEmail();
        return ResponseEntity.ok(partRequestService.approveRequest(id, dto, email));
    }

    @PutMapping("/{id}/reject")
    @RequireRole({Role.ADMINISTRATOR, Role.DISPATCHER})
    public ResponseEntity<PartRequestDTO> rejectRequest(
            @PathVariable Long id,
            @RequestBody(required = false) ReviewPartRequestDTO dto) {
        String email = UserContext.getCurrentUserEmail();
        return ResponseEntity.ok(partRequestService.rejectRequest(id, dto, email));
    }
}
