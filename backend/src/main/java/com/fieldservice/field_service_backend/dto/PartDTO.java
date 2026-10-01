package com.fieldservice.field_service_backend.dto;

import com.fieldservice.field_service_backend.model.InventoryStatus;
import com.fieldservice.field_service_backend.model.Part;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

import java.time.LocalDateTime;

public class PartDTO {
    private Long id;

    @NotBlank(message = "Part name is required")
    private String partName;

    @NotBlank(message = "Category is required")
    private String category;

    @NotBlank(message = "SKU is required")
    private String sku;

    @NotNull(message = "Quantity is required")
    @PositiveOrZero(message = "Quantity cannot be negative")
    private Integer quantity;

    @NotNull(message = "Minimum stock is required")
    @PositiveOrZero(message = "Minimum stock cannot be negative")
    private Integer minimumStock;

    private String unit = "pcs";

    @NotNull(message = "Unit cost is required")
    @PositiveOrZero(message = "Cost cannot be negative")
    private Double cost;

    private String supplier;
    private String location;
    private InventoryStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public PartDTO() {}

    public PartDTO(Part part) {
        this.id = part.getId();
        this.partName = part.getPartName();
        this.category = part.getCategory();
        this.sku = part.getSku();
        this.quantity = part.getQuantity();
        this.minimumStock = part.getMinimumStock();
        this.unit = part.getUnit();
        this.cost = part.getCost();
        this.supplier = part.getSupplier();
        this.location = part.getLocation();
        this.status = part.getStatus();
        this.createdAt = part.getCreatedAt();
        this.updatedAt = part.getUpdatedAt();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getPartName() { return partName; }
    public void setPartName(String partName) { this.partName = partName; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getSku() { return sku; }
    public void setSku(String sku) { this.sku = sku; }

    public Integer getQuantity() { return quantity; }
    public void setQuantity(Integer quantity) { this.quantity = quantity; }

    public Integer getMinimumStock() { return minimumStock; }
    public void setMinimumStock(Integer minimumStock) { this.minimumStock = minimumStock; }

    public String getUnit() { return unit; }
    public void setUnit(String unit) { this.unit = unit; }

    public Double getCost() { return cost; }
    public void setCost(Double cost) { this.cost = cost; }

    public String getSupplier() { return supplier; }
    public void setSupplier(String supplier) { this.supplier = supplier; }

    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }

    public InventoryStatus getStatus() { return status; }
    public void setStatus(InventoryStatus status) { this.status = status; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
