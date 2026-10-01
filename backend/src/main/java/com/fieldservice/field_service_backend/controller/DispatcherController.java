package com.fieldservice.field_service_backend.controller;

import com.fieldservice.field_service_backend.config.RequireRole;
import com.fieldservice.field_service_backend.config.UserContext;
import com.fieldservice.field_service_backend.dto.ServiceRequestDTO;
import com.fieldservice.field_service_backend.dto.TechnicianDTO;
import com.fieldservice.field_service_backend.dto.WorkOrderDTO;
import com.fieldservice.field_service_backend.model.RequestStatus;
import com.fieldservice.field_service_backend.model.Role;
import com.fieldservice.field_service_backend.model.WorkOrderStatus;
import com.fieldservice.field_service_backend.service.ServiceRequestService;
import com.fieldservice.field_service_backend.service.TechnicianService;
import com.fieldservice.field_service_backend.service.WorkOrderService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/dispatcher")
@RequireRole({Role.DISPATCHER, Role.ADMINISTRATOR})
public class DispatcherController {

    private final ServiceRequestService requestService;
    private final WorkOrderService workOrderService;
    private final TechnicianService technicianService;

    public DispatcherController(ServiceRequestService requestService,
                                WorkOrderService workOrderService,
                                TechnicianService technicianService) {
        this.requestService = requestService;
        this.workOrderService = workOrderService;
        this.technicianService = technicianService;
    }

    @GetMapping("/requests")
    public ResponseEntity<List<ServiceRequestDTO>> getPendingRequests() {
        return ResponseEntity.ok(requestService.getRequestsByStatus(RequestStatus.REQUESTED));
    }

    @PostMapping("/work-orders/from-request/{requestId}")
    public ResponseEntity<WorkOrderDTO> createWorkOrderFromRequest(@PathVariable Long requestId) {
        String dispatcherEmail = UserContext.getCurrentUserEmail();
        return ResponseEntity.ok(workOrderService.createWorkOrderFromRequest(requestId, dispatcherEmail));
    }

    @GetMapping("/technicians/available")
    public ResponseEntity<List<TechnicianDTO>> getAvailableTechnicians() {
        return ResponseEntity.ok(technicianService.getAvailableTechnicians());
    }

    @GetMapping("/active-jobs")
    public ResponseEntity<List<WorkOrderDTO>> getActiveJobs() {
        return ResponseEntity.ok(workOrderService.getWorkOrdersByStatus(WorkOrderStatus.IN_PROGRESS));
    }

    @GetMapping("/delayed-jobs")
    public ResponseEntity<List<WorkOrderDTO>> getDelayedJobs() {
        return ResponseEntity.ok(workOrderService.getWorkOrdersByStatus(WorkOrderStatus.ON_HOLD));
    }
}
