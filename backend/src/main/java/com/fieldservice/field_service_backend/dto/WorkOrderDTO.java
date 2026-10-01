package com.fieldservice.field_service_backend.dto;

import com.fieldservice.field_service_backend.model.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

public class WorkOrderDTO {
    private Long id;
    private String workOrderNumber;
    private Long serviceRequestId;
    private String serviceRequestNumber;
    private Long customerId;
    private String customerName;
    private String customerEmail;
    private String customerPhone;
    private Long serviceLocationId;
    private String serviceLocationAddress;
    private String serviceLocationCity;
    private String serviceLocationContactPerson;
    private String serviceLocationContactPhone;
    private Long categoryId;
    private String categoryName;
    private String categoryIcon;
    private Long serviceTypeId;
    private String serviceTypeName;
    private String title;
    private String description;
    private Priority priority;
    private LocalDate scheduledDate;
    private LocalTime scheduledStartTime;
    private LocalTime scheduledEndTime;
    private Long assignedTechnicianId;
    private String assignedTechnicianName;
    private String assignedTechnicianPhone;
    private String assignedTechnicianEmployeeCode;
    private Long dispatcherId;
    private String dispatcherName;
    private WorkOrderStatus status;
    private LocalDateTime responseDueTime;
    private LocalDateTime resolutionDueTime;
    private SlaStatus slaStatus;
    private Double totalAmount;
    private Double amountPaid;
    private String workPerformed;
    private String completionNotes;
    private String rejectionReason;
    private String reopenReason;
    private String onHoldReason;
    private LocalDateTime startedAt;
    private LocalDateTime completedAt;
    private LocalDateTime verifiedAt;
    private LocalDateTime closedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    private List<WorkOrderPhotoDTO> photos = new ArrayList<>();
    private List<WorkOrderPartDTO> partsUsed = new ArrayList<>();
    private List<WorkOrderHistoryDTO> history = new ArrayList<>();
    private CustomerFeedbackDTO feedback;

    public WorkOrderDTO() {}

    public WorkOrderDTO(WorkOrder wo) {
        this.id = wo.getId();
        this.workOrderNumber = wo.getWorkOrderNumber();
        if (wo.getServiceRequest() != null) {
            this.serviceRequestId = wo.getServiceRequest().getId();
            this.serviceRequestNumber = wo.getServiceRequest().getRequestNumber();
        }
        if (wo.getCustomer() != null) {
            this.customerId = wo.getCustomer().getId();
            if (wo.getCustomer().getUser() != null) {
                this.customerName = wo.getCustomer().getUser().getFullName();
                this.customerEmail = wo.getCustomer().getUser().getEmail();
                this.customerPhone = wo.getCustomer().getUser().getPhoneNumber();
            }
        }
        if (wo.getServiceLocation() != null) {
            this.serviceLocationId = wo.getServiceLocation().getId();
            this.serviceLocationAddress = wo.getServiceLocation().getAddress();
            this.serviceLocationCity = wo.getServiceLocation().getCity();
            this.serviceLocationContactPerson = wo.getServiceLocation().getContactPerson();
            this.serviceLocationContactPhone = wo.getServiceLocation().getContactPhone();
        }
        if (wo.getServiceCategory() != null) {
            this.categoryId = wo.getServiceCategory().getId();
            this.categoryName = wo.getServiceCategory().getName();
            this.categoryIcon = wo.getServiceCategory().getIcon();
        }
        if (wo.getServiceType() != null) {
            this.serviceTypeId = wo.getServiceType().getId();
            this.serviceTypeName = wo.getServiceType().getName();
        }
        this.title = wo.getTitle();
        this.description = wo.getDescription();
        this.priority = wo.getPriority();
        this.scheduledDate = wo.getScheduledDate();
        this.scheduledStartTime = wo.getScheduledStartTime();
        this.scheduledEndTime = wo.getScheduledEndTime();
        if (wo.getAssignedTechnician() != null) {
            this.assignedTechnicianId = wo.getAssignedTechnician().getId();
            this.assignedTechnicianEmployeeCode = wo.getAssignedTechnician().getEmployeeCode();
            if (wo.getAssignedTechnician().getUser() != null) {
                this.assignedTechnicianName = wo.getAssignedTechnician().getUser().getFullName();
                this.assignedTechnicianPhone = wo.getAssignedTechnician().getUser().getPhoneNumber();
            }
        }
        if (wo.getDispatcher() != null) {
            this.dispatcherId = wo.getDispatcher().getId();
            this.dispatcherName = wo.getDispatcher().getFullName();
        }
        this.status = wo.getStatus();
        this.responseDueTime = wo.getResponseDueTime();
        this.resolutionDueTime = wo.getResolutionDueTime();
        this.slaStatus = wo.getSlaStatus();
        this.totalAmount = wo.getTotalAmount();
        this.amountPaid = wo.getAmountPaid();
        this.workPerformed = wo.getWorkPerformed();
        this.completionNotes = wo.getCompletionNotes();
        this.rejectionReason = wo.getRejectionReason();
        this.reopenReason = wo.getReopenReason();
        this.onHoldReason = wo.getOnHoldReason();
        this.startedAt = wo.getStartedAt();
        this.completedAt = wo.getCompletedAt();
        this.verifiedAt = wo.getVerifiedAt();
        this.closedAt = wo.getClosedAt();
        this.createdAt = wo.getCreatedAt();
        this.updatedAt = wo.getUpdatedAt();
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getWorkOrderNumber() { return workOrderNumber; }
    public void setWorkOrderNumber(String workOrderNumber) { this.workOrderNumber = workOrderNumber; }

    public Long getServiceRequestId() { return serviceRequestId; }
    public void setServiceRequestId(Long serviceRequestId) { this.serviceRequestId = serviceRequestId; }

    public String getServiceRequestNumber() { return serviceRequestNumber; }
    public void setServiceRequestNumber(String serviceRequestNumber) { this.serviceRequestNumber = serviceRequestNumber; }

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

    public String getServiceLocationContactPerson() { return serviceLocationContactPerson; }
    public void setServiceLocationContactPerson(String serviceLocationContactPerson) { this.serviceLocationContactPerson = serviceLocationContactPerson; }

    public String getServiceLocationContactPhone() { return serviceLocationContactPhone; }
    public void setServiceLocationContactPhone(String serviceLocationContactPhone) { this.serviceLocationContactPhone = serviceLocationContactPhone; }

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

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public Priority getPriority() { return priority; }
    public void setPriority(Priority priority) { this.priority = priority; }

    public LocalDate getScheduledDate() { return scheduledDate; }
    public void setScheduledDate(LocalDate scheduledDate) { this.scheduledDate = scheduledDate; }

    public LocalTime getScheduledStartTime() { return scheduledStartTime; }
    public void setScheduledStartTime(LocalTime scheduledStartTime) { this.scheduledStartTime = scheduledStartTime; }

    public LocalTime getScheduledEndTime() { return scheduledEndTime; }
    public void setScheduledEndTime(LocalTime scheduledEndTime) { this.scheduledEndTime = scheduledEndTime; }

    public Long getAssignedTechnicianId() { return assignedTechnicianId; }
    public void setAssignedTechnicianId(Long assignedTechnicianId) { this.assignedTechnicianId = assignedTechnicianId; }

    public String getAssignedTechnicianName() { return assignedTechnicianName; }
    public void setAssignedTechnicianName(String assignedTechnicianName) { this.assignedTechnicianName = assignedTechnicianName; }

    public String getAssignedTechnicianPhone() { return assignedTechnicianPhone; }
    public void setAssignedTechnicianPhone(String assignedTechnicianPhone) { this.assignedTechnicianPhone = assignedTechnicianPhone; }

    public String getAssignedTechnicianEmployeeCode() { return assignedTechnicianEmployeeCode; }
    public void setAssignedTechnicianEmployeeCode(String assignedTechnicianEmployeeCode) { this.assignedTechnicianEmployeeCode = assignedTechnicianEmployeeCode; }

    public Long getDispatcherId() { return dispatcherId; }
    public void setDispatcherId(Long dispatcherId) { this.dispatcherId = dispatcherId; }

    public String getDispatcherName() { return dispatcherName; }
    public void setDispatcherName(String dispatcherName) { this.dispatcherName = dispatcherName; }

    public WorkOrderStatus getStatus() { return status; }
    public void setStatus(WorkOrderStatus status) { this.status = status; }

    public LocalDateTime getResponseDueTime() { return responseDueTime; }
    public void setResponseDueTime(LocalDateTime responseDueTime) { this.responseDueTime = responseDueTime; }

    public LocalDateTime getResolutionDueTime() { return resolutionDueTime; }
    public void setResolutionDueTime(LocalDateTime resolutionDueTime) { this.resolutionDueTime = resolutionDueTime; }

    public SlaStatus getSlaStatus() { return slaStatus; }
    public void setSlaStatus(SlaStatus slaStatus) { this.slaStatus = slaStatus; }

    public Double getTotalAmount() { return totalAmount; }
    public void setTotalAmount(Double totalAmount) { this.totalAmount = totalAmount; }

    public Double getAmountPaid() { return amountPaid; }
    public void setAmountPaid(Double amountPaid) { this.amountPaid = amountPaid; }

    public String getWorkPerformed() { return workPerformed; }
    public void setWorkPerformed(String workPerformed) { this.workPerformed = workPerformed; }

    public String getCompletionNotes() { return completionNotes; }
    public void setCompletionNotes(String completionNotes) { this.completionNotes = completionNotes; }

    public String getRejectionReason() { return rejectionReason; }
    public void setRejectionReason(String rejectionReason) { this.rejectionReason = rejectionReason; }

    public String getReopenReason() { return reopenReason; }
    public void setReopenReason(String reopenReason) { this.reopenReason = reopenReason; }

    public String getOnHoldReason() { return onHoldReason; }
    public void setOnHoldReason(String onHoldReason) { this.onHoldReason = onHoldReason; }

    public LocalDateTime getStartedAt() { return startedAt; }
    public void setStartedAt(LocalDateTime startedAt) { this.startedAt = startedAt; }

    public LocalDateTime getCompletedAt() { return completedAt; }
    public void setCompletedAt(LocalDateTime completedAt) { this.completedAt = completedAt; }

    public LocalDateTime getVerifiedAt() { return verifiedAt; }
    public void setVerifiedAt(LocalDateTime verifiedAt) { this.verifiedAt = verifiedAt; }

    public LocalDateTime getClosedAt() { return closedAt; }
    public void setClosedAt(LocalDateTime closedAt) { this.closedAt = closedAt; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    public List<WorkOrderPhotoDTO> getPhotos() { return photos; }
    public void setPhotos(List<WorkOrderPhotoDTO> photos) { this.photos = photos; }

    public List<WorkOrderPartDTO> getPartsUsed() { return partsUsed; }
    public void setPartsUsed(List<WorkOrderPartDTO> partsUsed) { this.partsUsed = partsUsed; }

    public List<WorkOrderHistoryDTO> getHistory() { return history; }
    public void setHistory(List<WorkOrderHistoryDTO> history) { this.history = history; }

    public CustomerFeedbackDTO getFeedback() { return feedback; }
    public void setFeedback(CustomerFeedbackDTO feedback) { this.feedback = feedback; }
}
