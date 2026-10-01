package com.fieldservice.field_service_backend.dto;

import com.fieldservice.field_service_backend.model.WorkOrderHistory;
import com.fieldservice.field_service_backend.model.WorkOrderStatus;

import java.time.LocalDateTime;

public class WorkOrderHistoryDTO {
    private Long id;
    private Long workOrderId;
    private WorkOrderStatus previousStatus;
    private WorkOrderStatus newStatus;
    private String changedBy;
    private String changeReason;
    private LocalDateTime timestamp;

    public WorkOrderHistoryDTO() {}

    public WorkOrderHistoryDTO(WorkOrderHistory history) {
        this.id = history.getId();
        if (history.getWorkOrder() != null) {
            this.workOrderId = history.getWorkOrder().getId();
        }
        this.previousStatus = history.getPreviousStatus();
        this.newStatus = history.getNewStatus();
        this.changedBy = history.getChangedBy();
        this.changeReason = history.getChangeReason();
        this.timestamp = history.getTimestamp();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getWorkOrderId() { return workOrderId; }
    public void setWorkOrderId(Long workOrderId) { this.workOrderId = workOrderId; }

    public WorkOrderStatus getPreviousStatus() { return previousStatus; }
    public void setPreviousStatus(WorkOrderStatus previousStatus) { this.previousStatus = previousStatus; }

    public WorkOrderStatus getNewStatus() { return newStatus; }
    public void setNewStatus(WorkOrderStatus newStatus) { this.newStatus = newStatus; }

    public String getChangedBy() { return changedBy; }
    public void setChangedBy(String changedBy) { this.changedBy = changedBy; }

    public String getChangeReason() { return changeReason; }
    public void setChangeReason(String changeReason) { this.changeReason = changeReason; }

    public LocalDateTime getTimestamp() { return timestamp; }
    public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }
}
