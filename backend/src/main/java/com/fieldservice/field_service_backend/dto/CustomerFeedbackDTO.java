package com.fieldservice.field_service_backend.dto;

import com.fieldservice.field_service_backend.model.CustomerFeedback;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDateTime;

public class CustomerFeedbackDTO {
    private Long id;
    private Long workOrderId;
    private String workOrderNumber;
    private Long customerId;
    private String customerName;

    @NotNull(message = "Rating is required")
    @Min(value = 1, message = "Rating must be between 1 and 5")
    @Max(value = 5, message = "Rating must be between 1 and 5")
    private Integer rating;

    private String feedbackText;
    private String satisfactionCategory;
    private boolean verified;
    private boolean reopened;
    private LocalDateTime createdAt;

    public CustomerFeedbackDTO() {}

    public CustomerFeedbackDTO(CustomerFeedback fb) {
        this.id = fb.getId();
        if (fb.getWorkOrder() != null) {
            this.workOrderId = fb.getWorkOrder().getId();
            this.workOrderNumber = fb.getWorkOrder().getWorkOrderNumber();
        }
        if (fb.getCustomer() != null) {
            this.customerId = fb.getCustomer().getId();
            if (fb.getCustomer().getUser() != null) {
                this.customerName = fb.getCustomer().getUser().getFullName();
            }
        }
        this.rating = fb.getRating();
        this.feedbackText = fb.getFeedbackText();
        this.satisfactionCategory = fb.getSatisfactionCategory();
        this.verified = fb.isVerified();
        this.reopened = fb.isReopened();
        this.createdAt = fb.getCreatedAt();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getWorkOrderId() { return workOrderId; }
    public void setWorkOrderId(Long workOrderId) { this.workOrderId = workOrderId; }

    public String getWorkOrderNumber() { return workOrderNumber; }
    public void setWorkOrderNumber(String workOrderNumber) { this.workOrderNumber = workOrderNumber; }

    public Long getCustomerId() { return customerId; }
    public void setCustomerId(Long customerId) { this.customerId = customerId; }

    public String getCustomerName() { return customerName; }
    public void setCustomerName(String customerName) { this.customerName = customerName; }

    public Integer getRating() { return rating; }
    public void setRating(Integer rating) { this.rating = rating; }

    public String getFeedbackText() { return feedbackText; }
    public void setFeedbackText(String feedbackText) { this.feedbackText = feedbackText; }

    public String getSatisfactionCategory() { return satisfactionCategory; }
    public void setSatisfactionCategory(String satisfactionCategory) { this.satisfactionCategory = satisfactionCategory; }

    public boolean isVerified() { return verified; }
    public void setVerified(boolean verified) { this.verified = verified; }

    public boolean isReopened() { return reopened; }
    public void setReopened(boolean reopened) { this.reopened = reopened; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
