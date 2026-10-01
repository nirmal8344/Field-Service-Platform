package com.fieldservice.field_service_backend.service;

import com.fieldservice.field_service_backend.dto.AuditLogDTO;
import com.fieldservice.field_service_backend.model.AuditLog;
import com.fieldservice.field_service_backend.repository.AuditLogRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;

    public AuditLogService(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    public void log(String userEmail, String userRole, String action, String entityName, String entityId, String details) {
        try {
            AuditLog log = new AuditLog(userEmail, userRole, action, entityName, entityId, details, "127.0.0.1");
            auditLogRepository.save(log);
        } catch (Exception e) {
            // Non-blocking log failure
            System.err.println("Failed to write audit log: " + e.getMessage());
        }
    }

    public List<AuditLogDTO> getAllLogs() {
        return auditLogRepository.findAllByOrderByTimestampDesc().stream()
                .map(AuditLogDTO::new)
                .collect(Collectors.toList());
    }
}
