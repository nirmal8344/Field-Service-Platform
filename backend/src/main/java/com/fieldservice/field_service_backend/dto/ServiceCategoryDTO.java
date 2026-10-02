package com.fieldservice.field_service_backend.dto;

import com.fieldservice.field_service_backend.model.ServiceCategory;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

public class ServiceCategoryDTO {
    private Long id;
    private String name;
    private String code;
    private String icon;
    private String description;
    private boolean active;
    private List<ServiceTypeDTO> serviceTypes = new ArrayList<>();

    public ServiceCategoryDTO() {}

    public ServiceCategoryDTO(ServiceCategory category) {
        this.id = category.getId();
        this.name = category.getName();
        this.code = category.getCode();
        this.icon = category.getIcon();
        this.description = category.getDescription();
        this.active = category.isActive();
        this.serviceTypes = new ArrayList<>();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }

    public String getIcon() { return icon; }
    public void setIcon(String icon) { this.icon = icon; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }

    public List<ServiceTypeDTO> getServiceTypes() { return serviceTypes; }
    public void setServiceTypes(List<ServiceTypeDTO> serviceTypes) { this.serviceTypes = serviceTypes; }
}
