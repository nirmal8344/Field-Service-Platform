package com.fieldservice.field_service_backend.repository;

import com.fieldservice.field_service_backend.model.WorkOrderPhoto;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface WorkOrderPhotoRepository extends JpaRepository<WorkOrderPhoto, Long> {
    List<WorkOrderPhoto> findByWorkOrderIdOrderByUploadedAtDesc(Long workOrderId);
}
