package com.fieldservice.field_service_backend.dto;

import com.fieldservice.field_service_backend.model.LocationType;
import com.fieldservice.field_service_backend.model.ServiceLocation;
import jakarta.validation.constraints.NotBlank;

public class ServiceLocationDTO {
    private Long id;
    private Long customerId;
    private String customerName;
    private String locationName;

    @NotBlank(message = "Address is required")
    private String address;

    private String area;

    @NotBlank(message = "City is required")
    private String city;

    @NotBlank(message = "State is required")
    private String state;

    @NotBlank(message = "Postal code is required")
    private String postalCode;

    private String contactPerson;
    private String contactPhone;
    private LocationType locationType = LocationType.RESIDENTIAL;
    private boolean active = true;
    private boolean defaultLocation = false;

    public ServiceLocationDTO() {}

    public ServiceLocationDTO(ServiceLocation location) {
        this.id = location.getId();
        if (location.getCustomer() != null) {
            this.customerId = location.getCustomer().getId();
            if (location.getCustomer().getUser() != null) {
                this.customerName = location.getCustomer().getUser().getFullName();
            }
        }
        this.locationName = location.getLocationName();
        this.address = location.getAddress();
        this.area = location.getArea();
        this.city = location.getCity();
        this.state = location.getState();
        this.postalCode = location.getPostalCode();
        this.contactPerson = location.getContactPerson();
        this.contactPhone = location.getContactPhone();
        this.locationType = location.getLocationType();
        this.active = location.isActive();
        this.defaultLocation = location.isDefaultLocation();
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getCustomerId() { return customerId; }
    public void setCustomerId(Long customerId) { this.customerId = customerId; }

    public String getCustomerName() { return customerName; }
    public void setCustomerName(String customerName) { this.customerName = customerName; }

    public String getLocationName() { return locationName; }
    public void setLocationName(String locationName) { this.locationName = locationName; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public String getArea() { return area; }
    public void setArea(String area) { this.area = area; }

    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }

    public String getState() { return state; }
    public void setState(String state) { this.state = state; }

    public String getPostalCode() { return postalCode; }
    public void setPostalCode(String postalCode) { this.postalCode = postalCode; }

    public String getContactPerson() { return contactPerson; }
    public void setContactPerson(String contactPerson) { this.contactPerson = contactPerson; }

    public String getContactPhone() { return contactPhone; }
    public void setContactPhone(String contactPhone) { this.contactPhone = contactPhone; }

    public LocationType getLocationType() { return locationType; }
    public void setLocationType(LocationType locationType) { this.locationType = locationType; }

    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }

    public boolean isDefaultLocation() { return defaultLocation; }
    public void setDefaultLocation(boolean defaultLocation) { this.defaultLocation = defaultLocation; }
}
