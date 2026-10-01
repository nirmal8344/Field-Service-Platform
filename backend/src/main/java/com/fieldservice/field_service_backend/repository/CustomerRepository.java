package com.fieldservice.field_service_backend.repository;

import com.fieldservice.field_service_backend.model.Customer;
import com.fieldservice.field_service_backend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CustomerRepository extends JpaRepository<Customer, Long> {
    Optional<Customer> findByUser(User user);
    Optional<Customer> findByUserId(Long userId);
    Optional<Customer> findByUserEmail(String email);
}
