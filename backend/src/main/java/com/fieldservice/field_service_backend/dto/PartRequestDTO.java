package com.fieldservice.field_service_backend.dto;

import com.fieldservice.field_service_backend.model.PartRequest;
import com.fieldservice.field_service_backend.model.PartRequestStatus;
import com.fieldservice.field_service_backend.model.Priority;

import java.time.LocalDateTime;

public class PartRequestDTO {
    private Long id;
    private String requestNumber;
    private Long partId;
    private String partName;
    private String category;
    private String sku;
    private Integer quantity;
    private String unit;
    private String reason;
    private Priority priority;
    private PartRequestStatus status;

    private Long requestedByTechnicianId;
    private String technicianName;
    private String technicianEmployeeCode;
    private String technicianEmail;
    private String technicianPhone;

    private Long workOrderId;
    private String workOrderNumber;
    private String workOrderTitle;

    private Long forwardedByUserId;
    private String forwardedByName;
    private LocalDateTime forwardedAt;
    private String dispatcherNotes;

    private Long reviewedByUserId;
    private String reviewedByName;
    private LocalDateTime reviewedAt;
    private String adminNotes;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public PartRequestDTO() {}

    public PartRequestDTO(PartRequest pr) {
        this.id = pr.getId();
        this.requestNumber = pr.getRequestNumber();
        this.partName = pr.getPartName();
        this.category = pr.getCategory();
        this.sku = pr.getSku();
        this.quantity = pr.getQuantity();
        this.unit = pr.getUnit();
        this.reason = pr.getReason();
        this.priority = pr.getPriority();
        this.status = pr.getStatus();

        try {
            if (pr.getPart() != null) {
                this.partId = pr.getPart().getId();
                if (pr.getPart().getPartName() != null) this.partName = pr.getPart().getPartName();
                if (pr.getPart().getCategory() != null) this.category = pr.getPart().getCategory();
                if (pr.getPart().getSku() != null) this.sku = pr.getPart().getSku();
            }
        } catch (Exception ignored) {}

        this.requestedByTechnicianId = pr.getRequestedByTechnicianId();
        this.technicianName = pr.getTechnicianName();
        this.technicianEmployeeCode = pr.getTechnicianEmployeeCode();

        try {
            if (pr.getTechnicianUser() != null) {
                if (this.technicianName == null) this.technicianName = pr.getTechnicianUser().getFullName();
                this.technicianEmail = pr.getTechnicianUser().getEmail();
                this.technicianPhone = pr.getTechnicianUser().getPhoneNumber();
            }
        } catch (Exception ignored) {}

        try {
            if (pr.getWorkOrder() != null) {
                this.workOrderId = pr.getWorkOrder().getId();
                this.workOrderNumber = pr.getWorkOrder().getWorkOrderNumber();
                this.workOrderTitle = pr.getWorkOrder().getTitle();
            }
        } catch (Exception ignored) {}

        try {
            if (pr.getForwardedBy() != null) {
                this.forwardedByUserId = pr.getForwardedBy().getId();
                this.forwardedByName = pr.getForwardedBy().getFullName();
            }
        } catch (Exception ignored) {}
        this.forwardedAt = pr.getForwardedAt();
        this.dispatcherNotes = pr.getDispatcherNotes();

        try {
            if (pr.getReviewedBy() != null) {
                this.reviewedByUserId = pr.getReviewedBy().getId();
                this.reviewedByName = pr.getReviewedBy().getFullName();
            }
        } catch (Exception ignored) {}
        this.reviewedAt = pr.getReviewedAt();
        this.adminNotes = pr.getAdminNotes();

        this.createdAt = pr.getCreatedAt();
        this.updatedAt = pr.getUpdatedAt();
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getRequestNumber() { return requestNumber; }
    public void setRequestNumber(String requestNumber) { this.requestNumber = requestNumber; }

    public Long getPartId() { return partId; }
    public void setPartId(Long partId) { this.partId = partId; }

    public String getPartName() { return partName; }
    public void setPartName(String partName) { this.partName = partName; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getSku() { return sku; }
    public void setSku(String sku) { this.sku = sku; }

    public Integer getQuantity() { return quantity; }
    public void setQuantity(Integer quantity) { this.quantity = quantity; }

    public String getUnit() { return unit; }
    public void setUnit(String unit) { this.unit = unit; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public Priority getPriority() { return priority; }
    public void setPriority(Priority priority) { this.priority = priority; }

    public PartRequestStatus getStatus() { return status; }
    public void setStatus(PartRequestStatus status) { this.status = status; }

    public Long getRequestedByTechnicianId() { return requestedByTechnicianId; }
    public void setRequestedByTechnicianId(Long requestedByTechnicianId) { this.requestedByTechnicianId = requestedByTechnicianId; }

    public String getTechnicianName() { return technicianName; }
    public void setTechnicianName(String technicianName) { this.technicianName = technicianName; }

    public String getTechnicianEmployeeCode() { return technicianEmployeeCode; }
    public void setTechnicianEmployeeCode(String technicianEmployeeCode) { this.technicianEmployeeCode = technicianEmployeeCode; }

    public String getTechnicianEmail() { return technicianEmail; }
    public void setTechnicianEmail(String technicianEmail) { this.technicianEmail = technicianEmail; }

    public String getTechnicianPhone() { return technicianPhone; }
    public void setTechnicianPhone(String technicianPhone) { this.technicianPhone = technicianPhone; }

    public Long getWorkOrderId() { return workOrderId; }
    public void setWorkOrderId(Long workOrderId) { this.workOrderId = workOrderId; }

    public String getWorkOrderNumber() { return workOrderNumber; }
    public void setWorkOrderNumber(String workOrderNumber) { this.workOrderNumber = workOrderNumber; }

    public String getWorkOrderTitle() { return workOrderTitle; }
    public void setWorkOrderTitle(String workOrderTitle) { this.workOrderTitle = workOrderTitle; }

    public Long getForwardedByUserId() { return forwardedByUserId; }
    public void setForwardedByUserId(Long forwardedByUserId) { this.forwardedByUserId = forwardedByUserId; }

    public String getForwardedByName() { return forwardedByName; }
    public void setForwardedByName(String forwardedByName) { this.forwardedByName = forwardedByName; }

    public LocalDateTime getForwardedAt() { return forwardedAt; }
    public void setForwardedAt(LocalDateTime forwardedAt) { this.forwardedAt = forwardedAt; }

    public String getDispatcherNotes() { return dispatcherNotes; }
    public void setDispatcherNotes(String dispatcherNotes) { this.dispatcherNotes = dispatcherNotes; }

    public Long getReviewedByUserId() { return reviewedByUserId; }
    public void setReviewedByUserId(Long reviewedByUserId) { this.reviewedByUserId = reviewedByUserId; }

    public String getReviewedByName() { return reviewedByName; }
    public void setReviewedByName(String reviewedByName) { this.reviewedByName = reviewedByName; }

    public LocalDateTime getReviewedAt() { return reviewedAt; }
    public void setReviewedAt(LocalDateTime reviewedAt) { this.reviewedAt = reviewedAt; }

    public String getAdminNotes() { return adminNotes; }
    public void setAdminNotes(String adminNotes) { this.adminNotes = adminNotes; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
