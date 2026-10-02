package com.fieldservice.field_service_backend.service;

import com.fieldservice.field_service_backend.dto.CreatePartRequestDTO;
import com.fieldservice.field_service_backend.dto.ForwardPartRequestDTO;
import com.fieldservice.field_service_backend.dto.PartRequestDTO;
import com.fieldservice.field_service_backend.dto.ReviewPartRequestDTO;
import com.fieldservice.field_service_backend.exception.BadRequestException;
import com.fieldservice.field_service_backend.exception.ResourceNotFoundException;
import com.fieldservice.field_service_backend.model.*;
import com.fieldservice.field_service_backend.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Random;
import java.util.stream.Collectors;

@Service
public class PartRequestService {

    private final PartRequestRepository partRequestRepository;
    private final PartRepository partRepository;
    private final UserRepository userRepository;
    private final TechnicianRepository technicianRepository;
    private final WorkOrderRepository workOrderRepository;
    private final InventoryTransactionRepository transactionRepository;
    private final NotificationService notificationService;
    private final AuditLogService auditLogService;

    public PartRequestService(PartRequestRepository partRequestRepository,
                              PartRepository partRepository,
                              UserRepository userRepository,
                              TechnicianRepository technicianRepository,
                              WorkOrderRepository workOrderRepository,
                              InventoryTransactionRepository transactionRepository,
                              NotificationService notificationService,
                              AuditLogService auditLogService) {
        this.partRequestRepository = partRequestRepository;
        this.partRepository = partRepository;
        this.userRepository = userRepository;
        this.technicianRepository = technicianRepository;
        this.workOrderRepository = workOrderRepository;
        this.transactionRepository = transactionRepository;
        this.notificationService = notificationService;
        this.auditLogService = auditLogService;
    }

    public List<PartRequestDTO> getAllRequests(String userEmail, Role role) {
        if (role == Role.TECHNICIAN) {
            User user = userRepository.findByEmail(userEmail)
                    .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userEmail));
            return partRequestRepository.findByTechnicianUserIdOrderByCreatedAtDesc(user.getId()).stream()
                    .map(PartRequestDTO::new)
                    .collect(Collectors.toList());
        }
        return partRequestRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(PartRequestDTO::new)
                .collect(Collectors.toList());
    }

    public PartRequestDTO getRequestById(Long id) {
        PartRequest pr = partRequestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Part request not found: " + id));
        return new PartRequestDTO(pr);
    }

    @Transactional
    public PartRequestDTO createRequest(CreatePartRequestDTO dto, String userEmail) {
        User techUser = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userEmail));

        Technician technician = technicianRepository.findByUser(techUser).orElse(null);

        Part part = null;
        if (dto.getPartId() != null) {
            part = partRepository.findById(dto.getPartId()).orElse(null);
        }

        WorkOrder workOrder = null;
        if (dto.getWorkOrderId() != null) {
            workOrder = workOrderRepository.findById(dto.getWorkOrderId()).orElse(null);
        }

        String partName = (part != null) ? part.getPartName() : dto.getPartName();
        String category = (part != null) ? part.getCategory() : dto.getCategory();
        String sku = (part != null) ? part.getSku() : dto.getSku();
        String unit = (part != null && part.getUnit() != null) ? part.getUnit() : (dto.getUnit() != null ? dto.getUnit() : "pcs");

        String reqNum = "PR-" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd")) + "-" + (1000 + new Random().nextInt(9000));

        PartRequest pr = new PartRequest(
                reqNum,
                part,
                partName,
                category,
                sku,
                dto.getQuantity(),
                unit,
                dto.getReason(),
                dto.getPriority(),
                technician,
                techUser,
                workOrder
        );

        pr = partRequestRepository.save(pr);

        String techDisplayName = techUser.getFullName() != null ? techUser.getFullName() : techUser.getEmail();
        notificationService.notifyDispatchers(
                "New Part Request: " + partName,
                techDisplayName + " requested " + dto.getQuantity() + " " + unit + " of " + partName + " (Reason: " + dto.getReason() + ")",
                NotificationType.PART_REQUEST,
                "/dispatcher/inventory"
        );

        auditLogService.log(
                userEmail,
                "TECHNICIAN",
                "PART_REQUEST_CREATED",
                "PartRequest",
                pr.getId().toString(),
                "Created part request " + reqNum + " for " + dto.getQuantity() + "x " + partName
        );

        return new PartRequestDTO(pr);
    }

    @Transactional
    public PartRequestDTO forwardToAdmin(Long id, ForwardPartRequestDTO dto, String dispatcherEmail) {
        PartRequest pr = partRequestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Part request not found: " + id));

        if (pr.getStatus() != PartRequestStatus.PENDING) {
            throw new BadRequestException("Only PENDING requests can be forwarded. Current status: " + pr.getStatus());
        }

        User dispatcher = userRepository.findByEmail(dispatcherEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Dispatcher not found: " + dispatcherEmail));

        pr.setStatus(PartRequestStatus.FORWARDED);
        pr.setForwardedBy(dispatcher);
        pr.setForwardedAt(LocalDateTime.now());
        if (dto != null && dto.getDispatcherNotes() != null) {
            pr.setDispatcherNotes(dto.getDispatcherNotes());
        }

        pr = partRequestRepository.save(pr);

        // Notify Admins
        String dispName = dispatcher.getFullName() != null ? dispatcher.getFullName() : dispatcher.getEmail();
        notificationService.notifyAdmins(
                "Part Request Forwarded: " + pr.getPartName(),
                "Dispatcher " + dispName + " forwarded part request " + pr.getRequestNumber() + " (" + pr.getQuantity() + " " + pr.getUnit() + " " + pr.getPartName() + ") for Admin approval.",
                NotificationType.PART_REQUEST,
                "/admin/inventory"
        );

        // Notify Technician
        if (pr.getTechnicianUser() != null) {
            notificationService.createNotification(
                    pr.getTechnicianUser(),
                    "Part Request Forwarded to Admin",
                    "Your request " + pr.getRequestNumber() + " for " + pr.getPartName() + " has been reviewed by dispatch and forwarded to Admin.",
                    NotificationType.PART_REQUEST,
                    "/technician/inventory"
            );
        }

        auditLogService.log(
                dispatcherEmail,
                "DISPATCHER",
                "PART_REQUEST_FORWARDED",
                "PartRequest",
                pr.getId().toString(),
                "Forwarded part request " + pr.getRequestNumber() + " to Admin. Notes: " + pr.getDispatcherNotes()
        );

        return new PartRequestDTO(pr);
    }

    @Transactional
    public PartRequestDTO approveRequest(Long id, ReviewPartRequestDTO dto, String adminEmail) {
        PartRequest pr = partRequestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Part request not found: " + id));

        User admin = userRepository.findByEmail(adminEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Admin not found: " + adminEmail));

        pr.setReviewedBy(admin);
        pr.setReviewedAt(LocalDateTime.now());
        if (dto != null && dto.getAdminNotes() != null) {
            pr.setAdminNotes(dto.getAdminNotes());
        }

        boolean addStock = (dto != null && dto.isAddStock());
        int qtyToAdd = (dto != null && dto.getQuantityToAdd() != null && dto.getQuantityToAdd() > 0)
                ? dto.getQuantityToAdd()
                : pr.getQuantity();

        if (addStock) {
            Part part = pr.getPart();
            if (part == null && pr.getSku() != null) {
                part = partRepository.findBySku(pr.getSku()).orElse(null);
            }

            if (part != null) {
                part.setQuantity(part.getQuantity() + qtyToAdd);
                partRepository.save(part);

                InventoryTransaction tx = new InventoryTransaction(
                        part,
                        TransactionType.ADDED,
                        qtyToAdd,
                        part.getCost(),
                        adminEmail,
                        pr.getWorkOrder(),
                        "Stock added via Part Request " + pr.getRequestNumber()
                );
                transactionRepository.save(tx);
            }
            pr.setStatus(PartRequestStatus.FULFILLED);
        } else {
            pr.setStatus(PartRequestStatus.APPROVED);
        }

        pr = partRequestRepository.save(pr);

        // Notify Technician
        if (pr.getTechnicianUser() != null) {
            String statusTitle = (pr.getStatus() == PartRequestStatus.FULFILLED) ? "Part Request Fulfilled & Stock Added" : "Part Request Approved";
            String statusMsg = "Your part request " + pr.getRequestNumber() + " for " + pr.getPartName() + " has been APPROVED by Admin. " + (pr.getAdminNotes() != null ? "(" + pr.getAdminNotes() + ")" : "");
            notificationService.createNotification(
                    pr.getTechnicianUser(),
                    statusTitle,
                    statusMsg,
                    NotificationType.PART_REQUEST,
                    "/technician/inventory"
            );
        }

        // Notify Dispatchers
        notificationService.notifyDispatchers(
                "Part Request Approved: " + pr.getRequestNumber(),
                "Admin approved part request for " + pr.getPartName() + " (Qty: " + pr.getQuantity() + ").",
                NotificationType.PART_REQUEST,
                "/dispatcher/inventory"
        );

        auditLogService.log(
                adminEmail,
                "ADMINISTRATOR",
                "PART_REQUEST_APPROVED",
                "PartRequest",
                pr.getId().toString(),
                "Approved part request " + pr.getRequestNumber() + ". Status: " + pr.getStatus() + ". Notes: " + pr.getAdminNotes()
        );

        return new PartRequestDTO(pr);
    }

    @Transactional
    public PartRequestDTO rejectRequest(Long id, ReviewPartRequestDTO dto, String reviewerEmail) {
        PartRequest pr = partRequestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Part request not found: " + id));

        User reviewer = userRepository.findByEmail(reviewerEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + reviewerEmail));

        pr.setStatus(PartRequestStatus.REJECTED);
        pr.setReviewedBy(reviewer);
        pr.setReviewedAt(LocalDateTime.now());
        if (dto != null && dto.getAdminNotes() != null) {
            pr.setAdminNotes(dto.getAdminNotes());
        }

        pr = partRequestRepository.save(pr);

        // Notify Technician
        if (pr.getTechnicianUser() != null) {
            String reasonMsg = pr.getAdminNotes() != null ? pr.getAdminNotes() : "Request could not be processed at this time.";
            notificationService.createNotification(
                    pr.getTechnicianUser(),
                    "Part Request Rejected: " + pr.getPartName(),
                    "Your part request " + pr.getRequestNumber() + " was rejected. Reason: " + reasonMsg,
                    NotificationType.PART_REQUEST,
                    "/technician/inventory"
            );
        }

        // Notify Dispatchers
        notificationService.notifyDispatchers(
                "Part Request Rejected: " + pr.getRequestNumber(),
                "Part request for " + pr.getPartName() + " was rejected. Reason: " + pr.getAdminNotes(),
                NotificationType.PART_REQUEST,
                "/dispatcher/inventory"
        );

        auditLogService.log(
                reviewerEmail,
                reviewer.getRole().name(),
                "PART_REQUEST_REJECTED",
                "PartRequest",
                pr.getId().toString(),
                "Rejected part request " + pr.getRequestNumber() + ". Reason: " + pr.getAdminNotes()
        );

        return new PartRequestDTO(pr);
    }
}
