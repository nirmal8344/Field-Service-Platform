package com.fieldservice.field_service_backend.controller;

import com.fieldservice.field_service_backend.config.RequireRole;
import com.fieldservice.field_service_backend.config.UserContext;
import com.fieldservice.field_service_backend.dto.CreateServiceRequestDTO;
import com.fieldservice.field_service_backend.dto.CustomerDTO;
import com.fieldservice.field_service_backend.dto.ServiceRequestDTO;
import com.fieldservice.field_service_backend.exception.ForbiddenException;
import com.fieldservice.field_service_backend.exception.UnauthorizedException;
import com.fieldservice.field_service_backend.model.Priority;
import com.fieldservice.field_service_backend.model.Role;
import com.fieldservice.field_service_backend.service.CustomerService;
import com.fieldservice.field_service_backend.service.ServiceRequestService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/service-requests")
public class ServiceRequestController {

    private final ServiceRequestService requestService;
    private final CustomerService customerService;

    public ServiceRequestController(ServiceRequestService requestService, CustomerService customerService) {
        this.requestService = requestService;
        this.customerService = customerService;
    }

    @GetMapping
    public ResponseEntity<List<ServiceRequestDTO>> getAllRequests(@RequestParam(required = false) Long customerId) {
        Role role = UserContext.getCurrentUserRole();
        Long userId = UserContext.getCurrentUserId();

        if (role == Role.CUSTOMER) {
            CustomerDTO cust = customerService.getCustomerByUserId(userId);
            return ResponseEntity.ok(requestService.getRequestsByCustomerId(cust.getId()));
        }

        if (customerId != null) {
            return ResponseEntity.ok(requestService.getRequestsByCustomerId(customerId));
        }
        return ResponseEntity.ok(requestService.getAllRequests());
    }

    @GetMapping("/my-requests")
    public ResponseEntity<List<ServiceRequestDTO>> getMyRequests() {
        Long userId = UserContext.getCurrentUserId();
        CustomerDTO cust = customerService.getCustomerByUserId(userId);
        return ResponseEntity.ok(requestService.getRequestsByCustomerId(cust.getId()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ServiceRequestDTO> getRequestById(@PathVariable Long id) {
        ServiceRequestDTO req = requestService.getRequestById(id);
        Role role = UserContext.getCurrentUserRole();
        Long userId = UserContext.getCurrentUserId();

        if (role == Role.CUSTOMER) {
            CustomerDTO cust = customerService.getCustomerByUserId(userId);
            if (!req.getCustomerId().equals(cust.getId())) {
                throw new ForbiddenException("Access Denied: You cannot view another customer's service request");
            }
        }
        return ResponseEntity.ok(req);
    }

    @PostMapping
    public ResponseEntity<ServiceRequestDTO> createRequest(@Valid @RequestBody CreateServiceRequestDTO dto) {
        Role role = UserContext.getCurrentUserRole();
        Long userId = UserContext.getCurrentUserId();

        Long custId = dto.getCustomerId();
        if (role == Role.CUSTOMER || custId == null) {
            CustomerDTO cust = customerService.getCustomerByUserId(userId);
            custId = cust.getId();
        }

        return ResponseEntity.ok(requestService.createRequest(custId, dto));
    }

    @PutMapping("/{id}/cancel")
    public ResponseEntity<ServiceRequestDTO> cancelRequest(
            @PathVariable Long id,
            @RequestParam(required = false, defaultValue = "Cancelled by user") String reason) {

        ServiceRequestDTO req = requestService.getRequestById(id);
        Role role = UserContext.getCurrentUserRole();
        Long userId = UserContext.getCurrentUserId();

        if (role == Role.CUSTOMER) {
            CustomerDTO cust = customerService.getCustomerByUserId(userId);
            if (!req.getCustomerId().equals(cust.getId())) {
                throw new ForbiddenException("Access Denied: You cannot cancel another customer's request");
            }
        }

        String email = UserContext.getCurrentUserEmail();
        return ResponseEntity.ok(requestService.cancelRequest(id, reason, email));
    }

    @PutMapping("/{id}/priority")
    @RequireRole({Role.DISPATCHER, Role.ADMINISTRATOR})
    public ResponseEntity<ServiceRequestDTO> updatePriority(
            @PathVariable Long id,
            @RequestParam Priority priority) {
        String email = UserContext.getCurrentUserEmail();
        return ResponseEntity.ok(requestService.updatePriority(id, priority, email));
    }
}
