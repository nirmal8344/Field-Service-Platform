package com.fieldservice.field_service_backend.controller;

import com.fieldservice.field_service_backend.dto.CustomerFeedbackDTO;
import com.fieldservice.field_service_backend.service.FeedbackService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/feedbacks")
public class FeedbackController {

    private final FeedbackService feedbackService;

    public FeedbackController(FeedbackService feedbackService) {
        this.feedbackService = feedbackService;
    }

    @GetMapping
    public ResponseEntity<List<CustomerFeedbackDTO>> getAllFeedback(@RequestParam(required = false) Long customerId) {
        if (customerId != null) {
            return ResponseEntity.ok(feedbackService.getFeedbackByCustomerId(customerId));
        }
        return ResponseEntity.ok(feedbackService.getAllFeedback());
    }

    @GetMapping("/work-order/{workOrderId}")
    public ResponseEntity<CustomerFeedbackDTO> getFeedbackByWorkOrder(@PathVariable Long workOrderId) {
        return ResponseEntity.ok(feedbackService.getFeedbackByWorkOrderId(workOrderId));
    }
}
