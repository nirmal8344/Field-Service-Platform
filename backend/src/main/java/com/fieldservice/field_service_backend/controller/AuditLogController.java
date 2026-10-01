package com.fieldservice.field_service_backend.controller;

import com.fieldservice.field_service_backend.config.RequireRole;
import com.fieldservice.field_service_backend.dto.AuditLogDTO;
import com.fieldservice.field_service_backend.model.Role;
import com.fieldservice.field_service_backend.service.AuditLogService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/audit-logs")
@RequireRole({Role.ADMINISTRATOR})
public class AuditLogController {

    private final AuditLogService auditLogService;

    public AuditLogController(AuditLogService auditLogService) {
        this.auditLogService = auditLogService;
    }

    @GetMapping
    public ResponseEntity<List<AuditLogDTO>> getAllAuditLogs() {
        return ResponseEntity.ok(auditLogService.getAllLogs());
    }
}
