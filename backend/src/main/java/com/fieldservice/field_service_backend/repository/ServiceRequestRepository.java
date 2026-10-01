package com.fieldservice.field_service_backend.repository;

import com.fieldservice.field_service_backend.model.Customer;
import com.fieldservice.field_service_backend.model.RequestStatus;
import com.fieldservice.field_service_backend.model.ServiceRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ServiceRequestRepository extends JpaRepository<ServiceRequest, Long> {
    Optional<ServiceRequest> findByRequestNumber(String requestNumber);
    List<ServiceRequest> findByCustomer(Customer customer);
    List<ServiceRequest> findByCustomerId(Long customerId);
    List<ServiceRequest> findByStatus(RequestStatus status);
    List<ServiceRequest> findAllByOrderByCreatedAtDesc();
    List<ServiceRequest> findByCustomerIdOrderByCreatedAtDesc(Long customerId);
}
