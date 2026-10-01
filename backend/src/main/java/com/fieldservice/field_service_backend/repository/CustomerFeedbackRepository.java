package com.fieldservice.field_service_backend.repository;

import com.fieldservice.field_service_backend.model.CustomerFeedback;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CustomerFeedbackRepository extends JpaRepository<CustomerFeedback, Long> {
    Optional<CustomerFeedback> findByWorkOrderId(Long workOrderId);
    List<CustomerFeedback> findByCustomerId(Long customerId);
    List<CustomerFeedback> findAllByOrderByCreatedAtDesc();

    @Query("SELECT AVG(f.rating) FROM CustomerFeedback f")
    Double getAveragePlatformRating();
}
