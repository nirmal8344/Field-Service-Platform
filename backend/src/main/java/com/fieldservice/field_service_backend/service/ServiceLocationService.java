package com.fieldservice.field_service_backend.service;

import com.fieldservice.field_service_backend.dto.ServiceLocationDTO;
import com.fieldservice.field_service_backend.exception.ResourceNotFoundException;
import com.fieldservice.field_service_backend.model.Customer;
import com.fieldservice.field_service_backend.model.ServiceLocation;
import com.fieldservice.field_service_backend.repository.CustomerRepository;
import com.fieldservice.field_service_backend.repository.ServiceLocationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class ServiceLocationService {

    private final ServiceLocationRepository serviceLocationRepository;
    private final CustomerRepository customerRepository;
    private final AuditLogService auditLogService;

    public ServiceLocationService(ServiceLocationRepository serviceLocationRepository,
                                  CustomerRepository customerRepository,
                                  AuditLogService auditLogService) {
        this.serviceLocationRepository = serviceLocationRepository;
        this.customerRepository = customerRepository;
        this.auditLogService = auditLogService;
    }

    public List<ServiceLocationDTO> getLocationsByCustomerId(Long customerId) {
        return serviceLocationRepository.findByCustomerId(customerId).stream()
                .map(ServiceLocationDTO::new)
                .collect(Collectors.toList());
    }

    public List<ServiceLocationDTO> getActiveLocationsByCustomerId(Long customerId) {
        return serviceLocationRepository.findByCustomerIdAndActiveTrue(customerId).stream()
                .map(ServiceLocationDTO::new)
                .collect(Collectors.toList());
    }

    public ServiceLocationDTO getLocationById(Long id) {
        ServiceLocation loc = serviceLocationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Service location not found: " + id));
        return new ServiceLocationDTO(loc);
    }

    @Transactional
    public ServiceLocationDTO createLocation(Long customerId, ServiceLocationDTO dto) {
        Customer customer = customerRepository.findById(customerId)
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found: " + customerId));

        ServiceLocation loc = new ServiceLocation();
        loc.setCustomer(customer);
        loc.setLocationName(dto.getLocationName() != null ? dto.getLocationName() : "Service Location");
        loc.setAddress(dto.getAddress());
        loc.setArea(dto.getArea());
        loc.setCity(dto.getCity());
        loc.setState(dto.getState());
        loc.setPostalCode(dto.getPostalCode());
        loc.setContactPerson(dto.getContactPerson() != null ? dto.getContactPerson() : customer.getUser().getFullName());
        loc.setContactPhone(dto.getContactPhone() != null ? dto.getContactPhone() : customer.getUser().getPhoneNumber());
        loc.setLocationType(dto.getLocationType() != null ? dto.getLocationType() : com.fieldservice.field_service_backend.model.LocationType.RESIDENTIAL);
        loc.setActive(true);
        loc.setDefaultLocation(dto.isDefaultLocation());

        loc = serviceLocationRepository.save(loc);
        auditLogService.log(customer.getUser().getEmail(), "CUSTOMER", "LOCATION_CREATED", "ServiceLocation", loc.getId().toString(), "Added location: " + loc.getAddress());

        return new ServiceLocationDTO(loc);
    }

    @Transactional
    public ServiceLocationDTO updateLocation(Long locationId, ServiceLocationDTO dto) {
        ServiceLocation loc = serviceLocationRepository.findById(locationId)
                .orElseThrow(() -> new ResourceNotFoundException("Service location not found: " + locationId));

        if (dto.getLocationName() != null) loc.setLocationName(dto.getLocationName());
        if (dto.getAddress() != null) loc.setAddress(dto.getAddress());
        if (dto.getArea() != null) loc.setArea(dto.getArea());
        if (dto.getCity() != null) loc.setCity(dto.getCity());
        if (dto.getState() != null) loc.setState(dto.getState());
        if (dto.getPostalCode() != null) loc.setPostalCode(dto.getPostalCode());
        if (dto.getContactPerson() != null) loc.setContactPerson(dto.getContactPerson());
        if (dto.getContactPhone() != null) loc.setContactPhone(dto.getContactPhone());
        if (dto.getLocationType() != null) loc.setLocationType(dto.getLocationType());
        loc.setActive(dto.isActive());
        loc.setDefaultLocation(dto.isDefaultLocation());

        loc = serviceLocationRepository.save(loc);
        return new ServiceLocationDTO(loc);
    }

    @Transactional
    public void deleteLocation(Long locationId) {
        ServiceLocation loc = serviceLocationRepository.findById(locationId)
                .orElseThrow(() -> new ResourceNotFoundException("Service location not found: " + locationId));
        loc.setActive(false); // soft delete
        serviceLocationRepository.save(loc);
    }
}
