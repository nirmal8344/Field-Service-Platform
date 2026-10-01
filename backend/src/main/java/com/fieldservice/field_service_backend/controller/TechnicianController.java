package com.fieldservice.field_service_backend.controller;

import com.fieldservice.field_service_backend.config.RequireRole;
import com.fieldservice.field_service_backend.config.UserContext;
import com.fieldservice.field_service_backend.dto.TechnicianDTO;
import com.fieldservice.field_service_backend.dto.TechnicianStatusUpdateDTO;
import com.fieldservice.field_service_backend.dto.WorkOrderDTO;
import com.fieldservice.field_service_backend.exception.ForbiddenException;
import com.fieldservice.field_service_backend.exception.UnauthorizedException;
import com.fieldservice.field_service_backend.model.Role;
import com.fieldservice.field_service_backend.service.TechnicianService;
import com.fieldservice.field_service_backend.service.WorkOrderService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/technicians")
public class TechnicianController {

    private final TechnicianService technicianService;
    private final WorkOrderService workOrderService;

    public TechnicianController(TechnicianService technicianService, WorkOrderService workOrderService) {
        this.technicianService = technicianService;
        this.workOrderService = workOrderService;
    }

    @GetMapping
    @RequireRole({Role.DISPATCHER, Role.ADMINISTRATOR})
    public ResponseEntity<List<TechnicianDTO>> getAllTechnicians(@RequestParam(required = false) Boolean availableOnly) {
        if (Boolean.TRUE.equals(availableOnly)) {
            return ResponseEntity.ok(technicianService.getAvailableTechnicians());
        }
        return ResponseEntity.ok(technicianService.getAllTechnicians());
    }

    @GetMapping("/{id}")
    public ResponseEntity<TechnicianDTO> getTechnicianById(@PathVariable Long id) {
        Role role = UserContext.getCurrentUserRole();
        Long userId = UserContext.getCurrentUserId();

        if (role == Role.TECHNICIAN) {
            TechnicianDTO myTech = technicianService.getTechnicianByUserId(userId);
            if (!myTech.getId().equals(id)) {
                throw new ForbiddenException("Access Denied: You cannot view another technician's profile");
            }
        } else if (role == Role.CUSTOMER) {
            throw new ForbiddenException("Access Denied: Customers cannot view technician directories directly");
        }

        return ResponseEntity.ok(technicianService.getTechnicianById(id));
    }

    @GetMapping("/me")
    @RequireRole({Role.TECHNICIAN})
    public ResponseEntity<TechnicianDTO> getCurrentTechnicianProfile() {
        Long userId = UserContext.getCurrentUserId();
        return ResponseEntity.ok(technicianService.getTechnicianByUserId(userId));
    }

    @GetMapping("/me/work-orders")
    @RequireRole({Role.TECHNICIAN})
    public ResponseEntity<List<WorkOrderDTO>> getMyWorkOrders() {
        Long userId = UserContext.getCurrentUserId();
        TechnicianDTO tech = technicianService.getTechnicianByUserId(userId);
        return ResponseEntity.ok(workOrderService.getWorkOrdersByTechnicianId(tech.getId()));
    }

    @PostMapping
    @RequireRole({Role.ADMINISTRATOR})
    public ResponseEntity<TechnicianDTO> createTechnician(@RequestBody TechnicianDTO dto) {
        return ResponseEntity.ok(technicianService.createTechnician(dto));
    }

    @PutMapping("/{id}")
    @RequireRole({Role.ADMINISTRATOR})
    public ResponseEntity<TechnicianDTO> updateTechnician(@PathVariable Long id, @RequestBody TechnicianDTO dto) {
        return ResponseEntity.ok(technicianService.updateTechnician(id, dto));
    }

    @PutMapping("/{id}/status")
    @RequireRole({Role.TECHNICIAN, Role.DISPATCHER, Role.ADMINISTRATOR})
    public ResponseEntity<TechnicianDTO> updateStatus(@PathVariable Long id, @RequestBody TechnicianStatusUpdateDTO dto) {
        Role role = UserContext.getCurrentUserRole();
        Long userId = UserContext.getCurrentUserId();

        if (role == Role.TECHNICIAN) {
            TechnicianDTO myTech = technicianService.getTechnicianByUserId(userId);
            if (!myTech.getId().equals(id)) {
                throw new ForbiddenException("Access Denied: You cannot change another technician's status");
            }
        }

        return ResponseEntity.ok(technicianService.updateTechnicianStatus(id, dto));
    }
}
