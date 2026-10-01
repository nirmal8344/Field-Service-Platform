package com.fieldservice.field_service_backend.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public class PartUsageDTO {

    @NotNull(message = "Part ID is required")
    private Long partId;

    @NotNull(message = "Quantity used is required")
    @Positive(message = "Quantity must be positive")
    private Integer quantity;

    private Double unitPrice;
    private String notes;

    public PartUsageDTO() {}

    public Long getPartId() { return partId; }
    public void setPartId(Long partId) { this.partId = partId; }

    public Integer getQuantity() { return quantity; }
    public void setQuantity(Integer quantity) { this.quantity = quantity; }

    public Double getUnitPrice() { return unitPrice; }
    public void setUnitPrice(Double unitPrice) { this.unitPrice = unitPrice; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
}
