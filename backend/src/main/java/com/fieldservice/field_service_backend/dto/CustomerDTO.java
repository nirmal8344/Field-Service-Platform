package com.fieldservice.field_service_backend.dto;

import com.fieldservice.field_service_backend.model.Customer;

import java.time.LocalDateTime;
import java.util.List;

public class CustomerDTO {
    private Long id;
    private Long userId;
    private String email;
    private String fullName;
    private String phoneNumber;
    private String companyName;
    private String customerType;
    private String alternatePhone;
    private String notes;
    private List<ServiceLocationDTO> locations;
    private LocalDateTime createdAt;

    public CustomerDTO() {}

    public CustomerDTO(Customer customer) {
        this.id = customer.getId();
        if (customer.getUser() != null) {
            this.userId = customer.getUser().getId();
            this.email = customer.getUser().getEmail();
            this.fullName = customer.getUser().getFullName();
            this.phoneNumber = customer.getUser().getPhoneNumber();
        }
        this.companyName = customer.getCompanyName();
        this.customerType = customer.getCustomerType();
        this.alternatePhone = customer.getAlternatePhone();
        this.notes = customer.getNotes();
        this.createdAt = customer.getCreatedAt();
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getPhoneNumber() { return phoneNumber; }
    public void setPhoneNumber(String phoneNumber) { this.phoneNumber = phoneNumber; }

    public String getCompanyName() { return companyName; }
    public void setCompanyName(String companyName) { this.companyName = companyName; }

    public String getCustomerType() { return customerType; }
    public void setCustomerType(String customerType) { this.customerType = customerType; }

    public String getAlternatePhone() { return alternatePhone; }
    public void setAlternatePhone(String alternatePhone) { this.alternatePhone = alternatePhone; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public List<ServiceLocationDTO> getLocations() { return locations; }
    public void setLocations(List<ServiceLocationDTO> locations) { this.locations = locations; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
