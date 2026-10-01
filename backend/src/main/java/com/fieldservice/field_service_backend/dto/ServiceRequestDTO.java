package com.fieldservice.field_service_backend.dto;

import com.fieldservice.field_service_backend.model.Priority;
import com.fieldservice.field_service_backend.model.RequestStatus;
import com.fieldservice.field_service_backend.model.ServiceRequest;

import java.time.LocalDate;
import java.time.LocalDateTime;

public class ServiceRequestDTO {
    private Long id;
    private String requestNumber;
    private Long customerId;
    private String customerName;
    private String customerEmail;
    private String customerPhone;
    private Long serviceLocationId;
    private String serviceLocationAddress;
    private String serviceLocationCity;
    private Long categoryId;
    private String categoryName;
    private String categoryIcon;
    private Long serviceTypeId;
    private String serviceTypeName;
    private String problemDescription;
    private Priority priority;
    private LocalDate preferredDate;
    private String preferredTimeSlot;
    private String attachmentsJson;
    private String notes;
    private LocalDateTime requestDate;
    private RequestStatus status;
    private Long workOrderId;
    private LocalDateTime createdAt;

    public ServiceRequestDTO() {}

    public ServiceRequestDTO(ServiceRequest req) {
        this.id = req.getId();
        this.requestNumber = req.getRequestNumber();
        if (req.getCustomer() != null) {
            this.customerId = req.getCustomer().getId();
            if (req.getCustomer().getUser() != null) {
                this.customerName = req.getCustomer().getUser().getFullName();
                this.customerEmail = req.getCustomer().getUser().getEmail();
                this.customerPhone = req.getCustomer().getUser().getPhoneNumber();
            }
        }
        if (req.getServiceLocation() != null) {
            this.serviceLocationId = req.getServiceLocation().getId();
            this.serviceLocationAddress = req.getServiceLocation().getAddress();
            this.serviceLocationCity = req.getServiceLocation().getCity();
        }
        if (req.getServiceCategory() != null) {
            this.categoryId = req.getServiceCategory().getId();
            this.categoryName = req.getServiceCategory().getName();
            this.categoryIcon = req.getServiceCategory().getIcon();
        }
        if (req.getServiceType() != null) {
            this.serviceTypeId = req.getServiceType().getId();
            this.serviceTypeName = req.getServiceType().getName();
        }
        this.problemDescription = req.getProblemDescription();
        this.priority = req.getPriority();
        this.preferredDate = req.getPreferredDate();
        this.preferredTimeSlot = req.getPreferredTimeSlot();
        this.attachmentsJson = req.getAttachmentsJson();
        this.notes = req.getNotes();
        this.requestDate = req.getRequestDate();
        this.status = req.getStatus();
        this.createdAt = req.getCreatedAt();
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getRequestNumber() { return requestNumber; }
    public void setRequestNumber(String requestNumber) { this.requestNumber = requestNumber; }

    public Long getCustomerId() { return customerId; }
    public void setCustomerId(Long customerId) { this.customerId = customerId; }

    public String getCustomerName() { return customerName; }
    public void setCustomerName(String customerName) { this.customerName = customerName; }

    public String getCustomerEmail() { return customerEmail; }
    public void setCustomerEmail(String customerEmail) { this.customerEmail = customerEmail; }

    public String getCustomerPhone() { return customerPhone; }
    public void setCustomerPhone(String customerPhone) { this.customerPhone = customerPhone; }

    public Long getServiceLocationId() { return serviceLocationId; }
    public void setServiceLocationId(Long serviceLocationId) { this.serviceLocationId = serviceLocationId; }

    public String getServiceLocationAddress() { return serviceLocationAddress; }
    public void setServiceLocationAddress(String serviceLocationAddress) { this.serviceLocationAddress = serviceLocationAddress; }

    public String getServiceLocationCity() { return serviceLocationCity; }
    public void setServiceLocationCity(String serviceLocationCity) { this.serviceLocationCity = serviceLocationCity; }

    public Long getCategoryId() { return categoryId; }
    public void setCategoryId(Long categoryId) { this.categoryId = categoryId; }

    public String getCategoryName() { return categoryName; }
    public void setCategoryName(String categoryName) { this.categoryName = categoryName; }

    public String getCategoryIcon() { return categoryIcon; }
    public void setCategoryIcon(String categoryIcon) { this.categoryIcon = categoryIcon; }

    public Long getServiceTypeId() { return serviceTypeId; }
    public void setServiceTypeId(Long serviceTypeId) { this.serviceTypeId = serviceTypeId; }

    public String getServiceTypeName() { return serviceTypeName; }
    public void setServiceTypeName(String serviceTypeName) { this.serviceTypeName = serviceTypeName; }

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

    public LocalDateTime getRequestDate() { return requestDate; }
    public void setRequestDate(LocalDateTime requestDate) { this.requestDate = requestDate; }

    public RequestStatus getStatus() { return status; }
    public void setStatus(RequestStatus status) { this.status = status; }

    public Long getWorkOrderId() { return workOrderId; }
    public void setWorkOrderId(Long workOrderId) { this.workOrderId = workOrderId; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
