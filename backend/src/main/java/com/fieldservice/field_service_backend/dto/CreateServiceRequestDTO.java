package com.fieldservice.field_service_backend.dto;

import com.fieldservice.field_service_backend.model.Priority;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public class CreateServiceRequestDTO {

    private Long customerId; // Optional if derived from authenticated user

    @NotNull(message = "Service location is required")
    private Long serviceLocationId;

    @NotNull(message = "Service category is required")
    private Long categoryId;

    private Long serviceTypeId;

    @NotBlank(message = "Problem description is required")
    private String problemDescription;

    private Priority priority = Priority.MEDIUM;

    private LocalDate preferredDate;

    private String preferredTimeSlot;

    private String attachmentsJson;

    private String notes;

    public CreateServiceRequestDTO() {}

    public Long getCustomerId() { return customerId; }
    public void setCustomerId(Long customerId) { this.customerId = customerId; }

    public Long getServiceLocationId() { return serviceLocationId; }
    public void setServiceLocationId(Long serviceLocationId) { this.serviceLocationId = serviceLocationId; }

    public Long getCategoryId() { return categoryId; }
    public void setCategoryId(Long categoryId) { this.categoryId = categoryId; }

    public Long getServiceTypeId() { return serviceTypeId; }
    public void setServiceTypeId(Long serviceTypeId) { this.serviceTypeId = serviceTypeId; }

    public String getProblemDescription() { return problemDescription; }
    public void setProblemDescription(String problemDescription) { this.problemDescription = problemDescription; }

    public Priority getPriority() { return priority; }
    public void setPriority(Priority priority) { this.priority = priority; }

    public LocalDate getPreferredDate() { return preferredDate; }
    public void setPreferredDate(LocalDate preferredDate) { this.preferredDate = preferredDate; }

    public String getPreferredTimeSlot() { return preferredTimeSlot; }
    public void setPreferredTimeSlot(String preferredTimeSlot) { this.preferredTimeSlot = preferredTimeSlot; }

    public String getAttachmentsJson() { return attachmentsJson; }
    public void setAttachmentsJson(String attachmentsJson) { this.attachmentsJson = attachmentsJson; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
}
