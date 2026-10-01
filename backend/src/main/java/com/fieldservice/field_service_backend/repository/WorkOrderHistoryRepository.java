package com.fieldservice.field_service_backend.repository;

import com.fieldservice.field_service_backend.model.WorkOrderHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface WorkOrderHistoryRepository extends JpaRepository<WorkOrderHistory, Long> {
    List<WorkOrderHistory> findByWorkOrderIdOrderByTimestampDesc(Long workOrderId);
}
