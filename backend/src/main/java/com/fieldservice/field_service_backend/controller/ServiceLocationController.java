package com.fieldservice.field_service_backend.controller;

import com.fieldservice.field_service_backend.config.UserContext;
import com.fieldservice.field_service_backend.dto.CustomerDTO;
import com.fieldservice.field_service_backend.dto.ServiceLocationDTO;
import com.fieldservice.field_service_backend.exception.ForbiddenException;
import com.fieldservice.field_service_backend.model.Role;
import com.fieldservice.field_service_backend.service.CustomerService;
import com.fieldservice.field_service_backend.service.ServiceLocationService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/service-locations")
public class ServiceLocationController {

    private final ServiceLocationService locationService;
    private final CustomerService customerService;

    public ServiceLocationController(ServiceLocationService locationService, CustomerService customerService) {
        this.locationService = locationService;
        this.customerService = customerService;
    }

    @GetMapping
    public ResponseEntity<List<ServiceLocationDTO>> getLocations(@RequestParam(required = false) Long customerId) {
        Role role = UserContext.getCurrentUserRole();
        Long userId = UserContext.getCurrentUserId();

        if (role == Role.CUSTOMER) {
            CustomerDTO cust = customerService.getCustomerByUserId(userId);
            return ResponseEntity.ok(locationService.getActiveLocationsByCustomerId(cust.getId()));
        }

        if (customerId != null) {
            return ResponseEntity.ok(locationService.getActiveLocationsByCustomerId(customerId));
        }

        return ResponseEntity.ok(List.of());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ServiceLocationDTO> getLocationById(@PathVariable Long id) {
        ServiceLocationDTO loc = locationService.getLocationById(id);
        Role role = UserContext.getCurrentUserRole();
        Long userId = UserContext.getCurrentUserId();

        if (role == Role.CUSTOMER) {
            CustomerDTO cust = customerService.getCustomerByUserId(userId);
            if (!loc.getCustomerId().equals(cust.getId())) {
                throw new ForbiddenException("Access Denied: You cannot view another customer's service location");
            }
        }

        return ResponseEntity.ok(loc);
    }

    @PostMapping
    public ResponseEntity<ServiceLocationDTO> createLocation(@Valid @RequestBody ServiceLocationDTO dto) {
        Role role = UserContext.getCurrentUserRole();
        Long userId = UserContext.getCurrentUserId();

        Long custId = dto.getCustomerId();
        if (role == Role.CUSTOMER || custId == null) {
            CustomerDTO cust = customerService.getCustomerByUserId(userId);
            custId = cust.getId();
        }

        return ResponseEntity.ok(locationService.createLocation(custId, dto));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ServiceLocationDTO> updateLocation(@PathVariable Long id, @Valid @RequestBody ServiceLocationDTO dto) {
        ServiceLocationDTO existing = locationService.getLocationById(id);
        Role role = UserContext.getCurrentUserRole();
        Long userId = UserContext.getCurrentUserId();

        if (role == Role.CUSTOMER) {
            CustomerDTO cust = customerService.getCustomerByUserId(userId);
            if (!existing.getCustomerId().equals(cust.getId())) {
                throw new ForbiddenException("Access Denied: You cannot edit another customer's location");
            }
        }

        return ResponseEntity.ok(locationService.updateLocation(id, dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteLocation(@PathVariable Long id) {
        ServiceLocationDTO existing = locationService.getLocationById(id);
        Role role = UserContext.getCurrentUserRole();
        Long userId = UserContext.getCurrentUserId();

        if (role == Role.CUSTOMER) {
            CustomerDTO cust = customerService.getCustomerByUserId(userId);
            if (!existing.getCustomerId().equals(cust.getId())) {
                throw new ForbiddenException("Access Denied: You cannot delete another customer's location");
            }
        }

        locationService.deleteLocation(id);
        return ResponseEntity.noContent().build();
    }
}
