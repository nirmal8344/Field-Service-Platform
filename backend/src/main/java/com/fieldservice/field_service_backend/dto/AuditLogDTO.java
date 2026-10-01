package com.fieldservice.field_service_backend.dto;

import com.fieldservice.field_service_backend.model.AuditLog;

import java.time.LocalDateTime;

public class AuditLogDTO {
    private Long id;
    private String userEmail;
    private String userRole;
    private String action;
    private String entityName;
    private String entityId;
    private String details;
    private String ipAddress;
    private LocalDateTime timestamp;

    public AuditLogDTO() {}

    public AuditLogDTO(AuditLog log) {
        this.id = log.getId();
        this.userEmail = log.getUserEmail();
        this.userRole = log.getUserRole();
        this.action = log.getAction();
        this.entityName = log.getEntityName();
        this.entityId = log.getEntityId();
        this.details = log.getDetails();
        this.ipAddress = log.getIpAddress();
        this.timestamp = log.getTimestamp();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getUserEmail() { return userEmail; }
    public void setUserEmail(String userEmail) { this.userEmail = userEmail; }

    public String getUserRole() { return userRole; }
    public void setUserRole(String userRole) { this.userRole = userRole; }

    public String getAction() { return action; }
    public void setAction(String action) { this.action = action; }

    public String getEntityName() { return entityName; }
    public void setEntityName(String entityName) { this.entityName = entityName; }

    public String getEntityId() { return entityId; }
    public void setEntityId(String entityId) { this.entityId = entityId; }

    public String getDetails() { return details; }
    public void setDetails(String details) { this.details = details; }

    public String getIpAddress() { return ipAddress; }
    public void setIpAddress(String ipAddress) { this.ipAddress = ipAddress; }

    public LocalDateTime getTimestamp() { return timestamp; }
    public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }
}
