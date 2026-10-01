package com.fieldservice.field_service_backend.repository;

import com.fieldservice.field_service_backend.model.Customer;
import com.fieldservice.field_service_backend.model.ServiceLocation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ServiceLocationRepository extends JpaRepository<ServiceLocation, Long> {
    List<ServiceLocation> findByCustomer(Customer customer);
    List<ServiceLocation> findByCustomerId(Long customerId);
    List<ServiceLocation> findByCustomerIdAndActiveTrue(Long customerId);
}
