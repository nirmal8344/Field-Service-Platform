package com.fieldservice.field_service_backend.controller;

import com.fieldservice.field_service_backend.config.RequireRole;
import com.fieldservice.field_service_backend.config.UserContext;
import com.fieldservice.field_service_backend.dto.*;
import com.fieldservice.field_service_backend.exception.ForbiddenException;
import com.fieldservice.field_service_backend.exception.UnauthorizedException;
import com.fieldservice.field_service_backend.model.PhotoCategory;
import com.fieldservice.field_service_backend.model.Role;
import com.fieldservice.field_service_backend.model.WorkOrderStatus;
import com.fieldservice.field_service_backend.service.CustomerService;
import com.fieldservice.field_service_backend.service.TechnicianService;
import com.fieldservice.field_service_backend.service.WorkOrderService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/work-orders")
public class WorkOrderController {

    private final WorkOrderService workOrderService;
    private final CustomerService customerService;
    private final TechnicianService technicianService;

    public WorkOrderController(WorkOrderService workOrderService,
                               CustomerService customerService,
                               TechnicianService technicianService) {
        this.workOrderService = workOrderService;
        this.customerService = customerService;
        this.technicianService = technicianService;
    }

    @GetMapping
    public ResponseEntity<List<WorkOrderDTO>> getAllWorkOrders(
            @RequestParam(required = false) Long customerId,
            @RequestParam(required = false) Long technicianId,
            @RequestParam(required = false) WorkOrderStatus status) {

        Role role = UserContext.getCurrentUserRole();
        Long userId = UserContext.getCurrentUserId();

        if (role == Role.CUSTOMER) {
            CustomerDTO cust = customerService.getCustomerByUserId(userId);
            return ResponseEntity.ok(workOrderService.getWorkOrdersByCustomerId(cust.getId()));
        } else if (role == Role.TECHNICIAN) {
            TechnicianDTO tech = technicianService.getTechnicianByUserId(userId);
            return ResponseEntity.ok(workOrderService.getWorkOrdersByTechnicianId(tech.getId()));
        }

        // Dispatcher or Administrator
        if (customerId != null) {
            return ResponseEntity.ok(workOrderService.getWorkOrdersByCustomerId(customerId));
        }
        if (technicianId != null) {
            return ResponseEntity.ok(workOrderService.getWorkOrdersByTechnicianId(technicianId));
        }
        if (status != null) {
            return ResponseEntity.ok(workOrderService.getWorkOrdersByStatus(status));
        }
        return ResponseEntity.ok(workOrderService.getAllWorkOrders());
    }

    @GetMapping("/{id}")
    public ResponseEntity<WorkOrderDTO> getWorkOrderById(@PathVariable Long id) {
        WorkOrderDTO wo = workOrderService.getWorkOrderById(id);
        Role role = UserContext.getCurrentUserRole();
        Long userId = UserContext.getCurrentUserId();

        if (role == Role.CUSTOMER) {
            CustomerDTO cust = customerService.getCustomerByUserId(userId);
            if (!wo.getCustomerId().equals(cust.getId())) {
                throw new ForbiddenException("Access Denied: You cannot view another customer's work order");
            }
        } else if (role == Role.TECHNICIAN) {
            TechnicianDTO tech = technicianService.getTechnicianByUserId(userId);
            if (wo.getAssignedTechnicianId() == null || !wo.getAssignedTechnicianId().equals(tech.getId())) {
                throw new ForbiddenException("Access Denied: You cannot view work orders not assigned to you");
            }
        }

        return ResponseEntity.ok(wo);
    }

    @PostMapping
    @RequireRole({Role.DISPATCHER, Role.ADMINISTRATOR})
    public ResponseEntity<WorkOrderDTO> createWorkOrder(@Valid @RequestBody CreateWorkOrderDTO dto) {
        String userEmail = UserContext.getCurrentUserEmail();
        return ResponseEntity.ok(workOrderService.createWorkOrder(dto, userEmail));
    }

    @PutMapping("/{id}/schedule")
    @RequireRole({Role.DISPATCHER, Role.ADMINISTRATOR})
    public ResponseEntity<WorkOrderDTO> scheduleWorkOrder(
            @PathVariable Long id,
            @Valid @RequestBody WorkOrderScheduleDTO dto) {
        String userEmail = UserContext.getCurrentUserEmail();
        return ResponseEntity.ok(workOrderService.scheduleWorkOrder(id, dto, userEmail));
    }

    @PutMapping("/{id}/assign")
    @RequireRole({Role.DISPATCHER, Role.ADMINISTRATOR})
    public ResponseEntity<WorkOrderDTO> assignTechnician(
            @PathVariable Long id,
            @Valid @RequestBody WorkOrderAssignDTO dto) {
        String userEmail = UserContext.getCurrentUserEmail();
        return ResponseEntity.ok(workOrderService.assignTechnician(id, dto, userEmail));
    }

    @PutMapping("/{id}/accept")
    @RequireRole({Role.TECHNICIAN, Role.DISPATCHER, Role.ADMINISTRATOR})
    public ResponseEntity<WorkOrderDTO> acceptWorkOrder(@PathVariable Long id) {
        String email = UserContext.getCurrentUserEmail();
        return ResponseEntity.ok(workOrderService.acceptWorkOrder(id, email));
    }

    @PutMapping("/{id}/reject")
    @RequireRole({Role.TECHNICIAN, Role.DISPATCHER, Role.ADMINISTRATOR})
    public ResponseEntity<WorkOrderDTO> rejectWorkOrder(
            @PathVariable Long id,
            @RequestBody WorkOrderActionDTO dto) {
        String email = UserContext.getCurrentUserEmail();
        return ResponseEntity.ok(workOrderService.rejectWorkOrder(id, dto, email));
    }

    @PutMapping("/{id}/start")
    @RequireRole({Role.TECHNICIAN, Role.DISPATCHER, Role.ADMINISTRATOR})
    public ResponseEntity<WorkOrderDTO> startWork(@PathVariable Long id) {
        String email = UserContext.getCurrentUserEmail();
        return ResponseEntity.ok(workOrderService.startWork(id, email));
    }

    @PutMapping("/{id}/hold")
    @RequireRole({Role.TECHNICIAN, Role.DISPATCHER, Role.ADMINISTRATOR})
    public ResponseEntity<WorkOrderDTO> putOnHold(
            @PathVariable Long id,
            @RequestBody WorkOrderActionDTO dto) {
        String email = UserContext.getCurrentUserEmail();
        return ResponseEntity.ok(workOrderService.putOnHold(id, dto, email));
    }

    @PutMapping("/{id}/complete")
    @RequireRole({Role.TECHNICIAN, Role.DISPATCHER, Role.ADMINISTRATOR})
    public ResponseEntity<WorkOrderDTO> completeWork(
            @PathVariable Long id,
            @RequestBody WorkOrderActionDTO dto) {
        String email = UserContext.getCurrentUserEmail();
        return ResponseEntity.ok(workOrderService.completeWork(id, dto, email));
    }

    @PutMapping("/{id}/verify")
    @RequireRole({Role.CUSTOMER, Role.ADMINISTRATOR})
    public ResponseEntity<WorkOrderDTO> verifyWorkOrder(
            @PathVariable Long id,
            @RequestBody WorkOrderActionDTO dto) {
        String email = UserContext.getCurrentUserEmail();
        return ResponseEntity.ok(workOrderService.verifyAndConfirm(id, dto, email));
    }

    @PutMapping("/{id}/reopen")
    @RequireRole({Role.CUSTOMER, Role.ADMINISTRATOR})
    public ResponseEntity<WorkOrderDTO> reopenWorkOrder(
            @PathVariable Long id,
            @RequestBody ReopenRequestDTO dto) {
        String email = UserContext.getCurrentUserEmail();
        return ResponseEntity.ok(workOrderService.reportIssueAndReopen(id, dto, email));
    }

    @PostMapping("/{id}/photos")
    public ResponseEntity<WorkOrderPhotoDTO> uploadPhoto(
            @PathVariable Long id,
            @RequestParam String photoUrl,
            @RequestParam(required = false) PhotoCategory category,
            @RequestParam(required = false) String caption) {
        String email = UserContext.getCurrentUserEmail();
        return ResponseEntity.ok(workOrderService.uploadWorkOrderPhoto(id, photoUrl, category, caption, email));
    }

    @PostMapping("/from-request/{requestId}")
    @RequireRole({Role.DISPATCHER, Role.ADMINISTRATOR})
    public ResponseEntity<WorkOrderDTO> createWorkOrderFromRequest(@PathVariable Long requestId) {
        String userEmail = UserContext.getCurrentUserEmail();
        return ResponseEntity.ok(workOrderService.createWorkOrderFromRequest(requestId, userEmail));
    }

    @PostMapping("/{id}/parts")
    @RequireRole({Role.TECHNICIAN, Role.DISPATCHER, Role.ADMINISTRATOR})
    public ResponseEntity<WorkOrderDTO> addPartToWorkOrder(
            @PathVariable Long id,
            @Valid @RequestBody PartUsageDTO dto) {
        String email = UserContext.getCurrentUserEmail();
        return ResponseEntity.ok(workOrderService.addPartToWorkOrder(id, dto.getPartId(), dto.getQuantity(), dto.getNotes(), email));
    }
}
