package com.fieldservice.field_service_backend.dto;

import com.fieldservice.field_service_backend.model.TechnicianAvailability;
import com.fieldservice.field_service_backend.model.TechnicianStatus;

public class TechnicianStatusUpdateDTO {
    private TechnicianAvailability availability;
    private TechnicianStatus status;

    public TechnicianStatusUpdateDTO() {}

    public TechnicianAvailability getAvailability() { return availability; }
    public void setAvailability(TechnicianAvailability availability) { this.availability = availability; }

    public TechnicianStatus getStatus() { return status; }
    public void setStatus(TechnicianStatus status) { this.status = status; }
}
