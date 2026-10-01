package com.fieldservice.field_service_backend.service;

import com.fieldservice.field_service_backend.dto.InventoryAdjustmentDTO;
import com.fieldservice.field_service_backend.dto.PartDTO;
import com.fieldservice.field_service_backend.exception.BadRequestException;
import com.fieldservice.field_service_backend.exception.ResourceNotFoundException;
import com.fieldservice.field_service_backend.model.*;
import com.fieldservice.field_service_backend.repository.InventoryTransactionRepository;
import com.fieldservice.field_service_backend.repository.PartRepository;
import com.fieldservice.field_service_backend.repository.WorkOrderPartRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class InventoryService {

    private final PartRepository partRepository;
    private final InventoryTransactionRepository transactionRepository;
    private final WorkOrderPartRepository workOrderPartRepository;
    private final NotificationService notificationService;
    private final AuditLogService auditLogService;

    public InventoryService(PartRepository partRepository,
                            InventoryTransactionRepository transactionRepository,
                            WorkOrderPartRepository workOrderPartRepository,
                            NotificationService notificationService,
                            AuditLogService auditLogService) {
        this.partRepository = partRepository;
        this.transactionRepository = transactionRepository;
        this.workOrderPartRepository = workOrderPartRepository;
        this.notificationService = notificationService;
        this.auditLogService = auditLogService;
    }

    public List<PartDTO> getAllParts() {
        return partRepository.findAll().stream()
                .map(PartDTO::new)
                .collect(Collectors.toList());
    }

    public List<PartDTO> getLowStockParts() {
        return partRepository.findLowStockParts().stream()
                .map(PartDTO::new)
                .collect(Collectors.toList());
    }

    public PartDTO getPartById(Long id) {
        Part part = partRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Part not found: " + id));
        return new PartDTO(part);
    }

    public List<InventoryTransaction> getPartTransactions(Long partId) {
        return transactionRepository.findByPartIdOrderByTimestampDesc(partId);
    }

    public List<InventoryTransaction> getAllTransactions() {
        return transactionRepository.findAllByOrderByTimestampDesc();
    }

    @Transactional
    public PartDTO createPart(PartDTO dto, String userEmail) {
        if (partRepository.findBySku(dto.getSku()).isPresent()) {
            throw new BadRequestException("Part SKU already exists: " + dto.getSku());
        }

        Part part = new Part(
                dto.getPartName(),
                dto.getCategory(),
                dto.getSku(),
                dto.getQuantity(),
                dto.getMinimumStock(),
                dto.getUnit(),
                dto.getCost(),
                dto.getSupplier(),
                dto.getLocation()
        );

        part = partRepository.save(part);

        InventoryTransaction tx = new InventoryTransaction(
                part,
                TransactionType.ADDED,
                dto.getQuantity(),
                dto.getCost(),
                userEmail,
                null,
                "Initial inventory stock"
        );
        transactionRepository.save(tx);

        auditLogService.log(userEmail, "ADMINISTRATOR", "PART_CREATED", "Part", part.getId().toString(), "Added new part SKU: " + part.getSku());

        return new PartDTO(part);
    }

    @Transactional
    public PartDTO updatePart(Long partId, PartDTO dto, String userEmail) {
        Part part = partRepository.findById(partId)
                .orElseThrow(() -> new ResourceNotFoundException("Part not found: " + partId));

        part.setPartName(dto.getPartName());
        part.setCategory(dto.getCategory());
        part.setMinimumStock(dto.getMinimumStock());
        part.setUnit(dto.getUnit());
        part.setCost(dto.getCost());
        part.setSupplier(dto.getSupplier());
        part.setLocation(dto.getLocation());

        part = partRepository.save(part);
        auditLogService.log(userEmail, "ADMINISTRATOR", "PART_UPDATED", "Part", part.getId().toString(), "Updated part: " + part.getSku());

        return new PartDTO(part);
    }

    @Transactional
    public PartDTO adjustInventory(Long partId, InventoryAdjustmentDTO dto, String userEmail) {
        Part part = partRepository.findById(partId)
                .orElseThrow(() -> new ResourceNotFoundException("Part not found: " + partId));

        int newQty = part.getQuantity();
        if (dto.getTransactionType() == TransactionType.ADDED || dto.getTransactionType() == TransactionType.RETURNED) {
            newQty += dto.getQuantity();
        } else if (dto.getTransactionType() == TransactionType.USED || dto.getTransactionType() == TransactionType.ADJUSTMENT) {
            newQty -= dto.getQuantity();
            if (newQty < 0) {
                throw new BadRequestException("Insufficient stock. Cannot reduce stock below 0. Current stock: " + part.getQuantity());
            }
        }

        part.setQuantity(newQty);
        part = partRepository.save(part);

        InventoryTransaction tx = new InventoryTransaction(
                part,
                dto.getTransactionType(),
                dto.getQuantity(),
                part.getCost(),
                userEmail,
                null,
                dto.getReason() != null ? dto.getReason() : "Manual inventory adjustment"
        );
        transactionRepository.save(tx);

        checkLowStockAndNotify(part);

        auditLogService.log(userEmail, "ADMINISTRATOR", "INVENTORY_ADJUSTED", "Part", part.getId().toString(), "Adjusted " + dto.getTransactionType() + " qty=" + dto.getQuantity() + ". New qty=" + newQty);

        return new PartDTO(part);
    }

    @Transactional
    public void consumePartForWorkOrder(WorkOrder wo, Long partId, Integer quantity, String userEmail, String notes) {
        if (quantity == null || quantity <= 0) {
            throw new BadRequestException("Quantity must be positive");
        }

        Part part = partRepository.findById(partId)
                .orElseThrow(() -> new ResourceNotFoundException("Part not found: " + partId));

        if (part.getQuantity() < quantity) {
            throw new BadRequestException("Insufficient inventory for part '" + part.getPartName() + "'. Available: " + part.getQuantity() + ", Required: " + quantity);
        }

        // Deduct inventory
        part.setQuantity(part.getQuantity() - quantity);
        partRepository.save(part);

        // Record WorkOrderPart
        WorkOrderPart woPart = new WorkOrderPart(wo, part, quantity, part.getCost(), notes);
        workOrderPartRepository.save(woPart);

        // Record Inventory Transaction
        InventoryTransaction tx = new InventoryTransaction(
                part,
                TransactionType.USED,
                quantity,
                part.getCost(),
                userEmail,
                wo,
                "Consumed in Work Order " + wo.getWorkOrderNumber()
        );
        transactionRepository.save(tx);

        checkLowStockAndNotify(part);

        auditLogService.log(userEmail, "TECHNICIAN", "PART_CONSUMED", "WorkOrderPart", woPart.getId().toString(), "Consumed " + quantity + " " + part.getUnit() + " of " + part.getPartName() + " for WO " + wo.getWorkOrderNumber());
    }

    private void checkLowStockAndNotify(Part part) {
        if (part.getQuantity() <= part.getMinimumStock()) {
            notificationService.notifyAdmins(
                    "Low Inventory Alert: " + part.getPartName(),
                    "Part SKU " + part.getSku() + " is running low (" + part.getQuantity() + " " + part.getUnit() + " remaining). Minimum required: " + part.getMinimumStock(),
                    NotificationType.LOW_STOCK,
                    "/admin/inventory"
            );
        }
    }
}
