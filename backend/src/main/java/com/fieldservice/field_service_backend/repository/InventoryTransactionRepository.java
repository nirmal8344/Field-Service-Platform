package com.fieldservice.field_service_backend.repository;

import com.fieldservice.field_service_backend.model.InventoryTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface InventoryTransactionRepository extends JpaRepository<InventoryTransaction, Long> {
    List<InventoryTransaction> findByPartIdOrderByTimestampDesc(Long partId);
    List<InventoryTransaction> findByWorkOrderIdOrderByTimestampDesc(Long workOrderId);
    List<InventoryTransaction> findAllByOrderByTimestampDesc();
}
