package com.fieldservice.field_service_backend.dto;

import com.fieldservice.field_service_backend.model.ServiceType;

public class ServiceTypeDTO {
    private Long id;
    private Long categoryId;
    private String categoryName;
    private String name;
    private String code;
    private Double estimatedHours;
    private Double basePrice;
    private String description;
    private boolean active;

    public ServiceTypeDTO() {}

    public ServiceTypeDTO(ServiceType type) {
        this.id = type.getId();
        if (type.getCategory() != null) {
            this.categoryId = type.getCategory().getId();
            this.categoryName = type.getCategory().getName();
        }
        this.name = type.getName();
        this.code = type.getCode();
        this.estimatedHours = type.getEstimatedHours();
        this.basePrice = type.getBasePrice();
        this.description = type.getDescription();
        this.active = type.isActive();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getCategoryId() { return categoryId; }
    public void setCategoryId(Long categoryId) { this.categoryId = categoryId; }

    public String getCategoryName() { return categoryName; }
    public void setCategoryName(String categoryName) { this.categoryName = categoryName; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }

    public Double getEstimatedHours() { return estimatedHours; }
    public void setEstimatedHours(Double estimatedHours) { this.estimatedHours = estimatedHours; }

    public Double getBasePrice() { return basePrice; }
    public void setBasePrice(Double basePrice) { this.basePrice = basePrice; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
}
