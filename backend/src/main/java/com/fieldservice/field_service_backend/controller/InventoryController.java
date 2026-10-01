package com.fieldservice.field_service_backend.controller;

import com.fieldservice.field_service_backend.config.RequireRole;
import com.fieldservice.field_service_backend.config.UserContext;
import com.fieldservice.field_service_backend.dto.InventoryAdjustmentDTO;
import com.fieldservice.field_service_backend.dto.PartDTO;
import com.fieldservice.field_service_backend.model.InventoryTransaction;
import com.fieldservice.field_service_backend.model.Role;
import com.fieldservice.field_service_backend.service.InventoryService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/inventory")
public class InventoryController {

    private final InventoryService inventoryService;

    public InventoryController(InventoryService inventoryService) {
        this.inventoryService = inventoryService;
    }

    @GetMapping
    @RequireRole({Role.TECHNICIAN, Role.DISPATCHER, Role.ADMINISTRATOR})
    public ResponseEntity<List<PartDTO>> getAllParts() {
        return ResponseEntity.ok(inventoryService.getAllParts());
    }

    @GetMapping("/low-stock")
    @RequireRole({Role.DISPATCHER, Role.ADMINISTRATOR})
    public ResponseEntity<List<PartDTO>> getLowStockParts() {
        return ResponseEntity.ok(inventoryService.getLowStockParts());
    }

    @GetMapping("/{id}")
    @RequireRole({Role.TECHNICIAN, Role.DISPATCHER, Role.ADMINISTRATOR})
    public ResponseEntity<PartDTO> getPartById(@PathVariable Long id) {
        return ResponseEntity.ok(inventoryService.getPartById(id));
    }

    @GetMapping("/transactions")
    @RequireRole({Role.ADMINISTRATOR, Role.DISPATCHER})
    public ResponseEntity<List<InventoryTransaction>> getAllTransactions() {
        return ResponseEntity.ok(inventoryService.getAllTransactions());
    }

    @GetMapping("/{id}/transactions")
    @RequireRole({Role.ADMINISTRATOR, Role.DISPATCHER})
    public ResponseEntity<List<InventoryTransaction>> getPartTransactions(@PathVariable Long id) {
        return ResponseEntity.ok(inventoryService.getPartTransactions(id));
    }

    @PostMapping
    @RequireRole({Role.ADMINISTRATOR})
    public ResponseEntity<PartDTO> createPart(@Valid @RequestBody PartDTO dto) {
        String email = UserContext.getCurrentUserEmail();
        return ResponseEntity.ok(inventoryService.createPart(dto, email));
    }

    @PutMapping("/{id}")
    @RequireRole({Role.ADMINISTRATOR})
    public ResponseEntity<PartDTO> updatePart(@PathVariable Long id, @Valid @RequestBody PartDTO dto) {
        String email = UserContext.getCurrentUserEmail();
        return ResponseEntity.ok(inventoryService.updatePart(id, dto, email));
    }

    @PostMapping("/{id}/adjust")
    @RequireRole({Role.ADMINISTRATOR})
    public ResponseEntity<PartDTO> adjustInventory(
            @PathVariable Long id,
            @Valid @RequestBody InventoryAdjustmentDTO dto) {
        String email = UserContext.getCurrentUserEmail();
        return ResponseEntity.ok(inventoryService.adjustInventory(id, dto, email));
    }
}
