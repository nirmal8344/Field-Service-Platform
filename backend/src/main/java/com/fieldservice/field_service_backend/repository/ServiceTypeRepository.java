package com.fieldservice.field_service_backend.repository;

import com.fieldservice.field_service_backend.model.ServiceType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ServiceTypeRepository extends JpaRepository<ServiceType, Long> {
    List<ServiceType> findByCategoryId(Long categoryId);
    List<ServiceType> findByCategoryIdAndActiveTrue(Long categoryId);
    Optional<ServiceType> findByCode(String code);
}
