package com.fieldservice.field_service_backend.service;

import com.fieldservice.field_service_backend.dto.CustomerFeedbackDTO;
import com.fieldservice.field_service_backend.exception.ResourceNotFoundException;
import com.fieldservice.field_service_backend.model.CustomerFeedback;
import com.fieldservice.field_service_backend.repository.CustomerFeedbackRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class FeedbackService {

    private final CustomerFeedbackRepository feedbackRepository;

    public FeedbackService(CustomerFeedbackRepository feedbackRepository) {
        this.feedbackRepository = feedbackRepository;
    }

    public List<CustomerFeedbackDTO> getAllFeedback() {
        return feedbackRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(CustomerFeedbackDTO::new)
                .collect(Collectors.toList());
    }

    public List<CustomerFeedbackDTO> getFeedbackByCustomerId(Long customerId) {
        return feedbackRepository.findByCustomerId(customerId).stream()
                .map(CustomerFeedbackDTO::new)
                .collect(Collectors.toList());
    }

    public CustomerFeedbackDTO getFeedbackByWorkOrderId(Long workOrderId) {
        CustomerFeedback fb = feedbackRepository.findByWorkOrderId(workOrderId)
                .orElseThrow(() -> new ResourceNotFoundException("Feedback not found for work order: " + workOrderId));
        return new CustomerFeedbackDTO(fb);
    }
}
