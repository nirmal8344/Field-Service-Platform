package com.fieldservice.field_service_backend.dto;

import com.fieldservice.field_service_backend.model.WorkOrderPart;

import java.time.LocalDateTime;

public class WorkOrderPartDTO {
    private Long id;
    private Long workOrderId;
    private Long partId;
    private String partName;
    private String sku;
    private String unit;
    private Integer quantityUsed;
    private Double unitPrice;
    private Double totalPrice;
    private String notes;
    private LocalDateTime addedAt;

    public WorkOrderPartDTO() {}

    public WorkOrderPartDTO(WorkOrderPart wp) {
        this.id = wp.getId();
        if (wp.getWorkOrder() != null) {
            this.workOrderId = wp.getWorkOrder().getId();
        }
        if (wp.getPart() != null) {
            this.partId = wp.getPart().getId();
            this.partName = wp.getPart().getPartName();
            this.sku = wp.getPart().getSku();
            this.unit = wp.getPart().getUnit();
        }
        this.quantityUsed = wp.getQuantityUsed();
        this.unitPrice = wp.getUnitPrice();
        if (wp.getQuantityUsed() != null && wp.getUnitPrice() != null) {
            this.totalPrice = wp.getQuantityUsed() * wp.getUnitPrice();
        }
        this.notes = wp.getNotes();
        this.addedAt = wp.getAddedAt();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getWorkOrderId() { return workOrderId; }
    public void setWorkOrderId(Long workOrderId) { this.workOrderId = workOrderId; }

    public Long getPartId() { return partId; }
    public void setPartId(Long partId) { this.partId = partId; }

    public String getPartName() { return partName; }
    public void setPartName(String partName) { this.partName = partName; }

    public String getSku() { return sku; }
    public void setSku(String sku) { this.sku = sku; }

    public String getUnit() { return unit; }
    public void setUnit(String unit) { this.unit = unit; }

    public Integer getQuantityUsed() { return quantityUsed; }
    public void setQuantityUsed(Integer quantityUsed) { this.quantityUsed = quantityUsed; }

    public Double getUnitPrice() { return unitPrice; }
    public void setUnitPrice(Double unitPrice) { this.unitPrice = unitPrice; }

    public Double getTotalPrice() { return totalPrice; }
    public void setTotalPrice(Double totalPrice) { this.totalPrice = totalPrice; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public LocalDateTime getAddedAt() { return addedAt; }
    public void setAddedAt(LocalDateTime addedAt) { this.addedAt = addedAt; }
}
