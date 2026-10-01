package com.fieldservice.field_service_backend.dto;

import jakarta.validation.constraints.NotBlank;

public class ReopenRequestDTO {

    @NotBlank(message = "Reopen reason is required")
    private String reason;

    private String notes;

    public ReopenRequestDTO() {}

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
}
