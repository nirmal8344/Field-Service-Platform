package com.fieldservice.field_service_backend.controller;

import com.fieldservice.field_service_backend.config.RequireRole;
import com.fieldservice.field_service_backend.config.UserContext;
import com.fieldservice.field_service_backend.dto.CustomerDTO;
import com.fieldservice.field_service_backend.dto.CustomerProfileUpdateRequest;
import com.fieldservice.field_service_backend.exception.ForbiddenException;
import com.fieldservice.field_service_backend.exception.UnauthorizedException;
import com.fieldservice.field_service_backend.model.Role;
import com.fieldservice.field_service_backend.service.CustomerService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/customers")
public class CustomerController {

    private final CustomerService customerService;

    public CustomerController(CustomerService customerService) {
        this.customerService = customerService;
    }

    @GetMapping
    @RequireRole({Role.DISPATCHER, Role.ADMINISTRATOR})
    public ResponseEntity<List<CustomerDTO>> getAllCustomers() {
        return ResponseEntity.ok(customerService.getAllCustomers());
    }

    @GetMapping("/{id}")
    public ResponseEntity<CustomerDTO> getCustomerById(@PathVariable Long id) {
        Role role = UserContext.getCurrentUserRole();
        Long userId = UserContext.getCurrentUserId();

        if (role == Role.CUSTOMER) {
            CustomerDTO myProfile = customerService.getCustomerByUserId(userId);
            if (!myProfile.getId().equals(id)) {
                throw new ForbiddenException("Access Denied: You cannot view another customer's profile");
            }
        } else if (role == Role.TECHNICIAN) {
            throw new ForbiddenException("Access Denied: Technicians cannot query customer directories directly");
        }

        return ResponseEntity.ok(customerService.getCustomerById(id));
    }

    @GetMapping("/me")
    @RequireRole({Role.CUSTOMER})
    public ResponseEntity<CustomerDTO> getCurrentCustomerProfile() {
        Long userId = UserContext.getCurrentUserId();
        return ResponseEntity.ok(customerService.getCustomerByUserId(userId));
    }

    @PutMapping("/me")
    @RequireRole({Role.CUSTOMER})
    public ResponseEntity<CustomerDTO> updateCurrentCustomerProfile(@RequestBody CustomerProfileUpdateRequest request) {
        Long userId = UserContext.getCurrentUserId();
        return ResponseEntity.ok(customerService.updateCustomerProfile(userId, request));
    }
}
