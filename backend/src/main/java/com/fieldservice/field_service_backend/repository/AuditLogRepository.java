package com.fieldservice.field_service_backend.repository;

import com.fieldservice.field_service_backend.model.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {
    List<AuditLog> findAllByOrderByTimestampDesc();
    List<AuditLog> findByEntityNameOrderByTimestampDesc(String entityName);
    List<AuditLog> findByUserEmailOrderByTimestampDesc(String userEmail);
}
