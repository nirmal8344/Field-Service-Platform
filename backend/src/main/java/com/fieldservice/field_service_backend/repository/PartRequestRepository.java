package com.fieldservice.field_service_backend.repository;

import com.fieldservice.field_service_backend.model.PartRequest;
import com.fieldservice.field_service_backend.model.PartRequestStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PartRequestRepository extends JpaRepository<PartRequest, Long> {
    Optional<PartRequest> findByRequestNumber(String requestNumber);
    List<PartRequest> findAllByOrderByCreatedAtDesc();
    List<PartRequest> findByTechnicianUserIdOrderByCreatedAtDesc(Long userId);
    List<PartRequest> findByStatusOrderByCreatedAtDesc(PartRequestStatus status);
}
