package com.fieldservice.field_service_backend.repository;

import com.fieldservice.field_service_backend.model.InventoryStatus;
import com.fieldservice.field_service_backend.model.Part;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PartRepository extends JpaRepository<Part, Long> {
    Optional<Part> findBySku(String sku);
    List<Part> findByStatus(InventoryStatus status);
    List<Part> findByCategory(String category);

    @Query("SELECT p FROM Part p WHERE p.quantity <= p.minimumStock")
    List<Part> findLowStockParts();

    @Query("SELECT p FROM Part p WHERE p.quantity = 0")
    List<Part> findOutOfStockParts();
}
