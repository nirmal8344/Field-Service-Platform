package com.fieldservice.field_service_backend.service;

import com.fieldservice.field_service_backend.dto.*;
import com.fieldservice.field_service_backend.exception.BadRequestException;
import com.fieldservice.field_service_backend.exception.ConflictException;
import com.fieldservice.field_service_backend.exception.ResourceNotFoundException;
import com.fieldservice.field_service_backend.exception.UnauthorizedException;
import com.fieldservice.field_service_backend.model.*;
import com.fieldservice.field_service_backend.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class WorkOrderService {

    private final WorkOrderRepository workOrderRepository;
    private final WorkOrderHistoryRepository historyRepository;
    private final WorkOrderPhotoRepository photoRepository;
    private final WorkOrderPartRepository workOrderPartRepository;
    private final CustomerFeedbackRepository feedbackRepository;
    private final ServiceRequestRepository serviceRequestRepository;
    private final CustomerRepository customerRepository;
    private final ServiceLocationRepository locationRepository;
    private final ServiceCategoryRepository categoryRepository;
    private final ServiceTypeRepository typeRepository;
    private final TechnicianRepository technicianRepository;
    private final UserRepository userRepository;
    private final InventoryService inventoryService;
    private final NotificationService notificationService;
    private final AuditLogService auditLogService;
    private final StorageService storageService;

    public WorkOrderService(WorkOrderRepository workOrderRepository,
                            WorkOrderHistoryRepository historyRepository,
                            WorkOrderPhotoRepository photoRepository,
                            WorkOrderPartRepository workOrderPartRepository,
                            CustomerFeedbackRepository feedbackRepository,
                            ServiceRequestRepository serviceRequestRepository,
                            CustomerRepository customerRepository,
                            ServiceLocationRepository locationRepository,
                            ServiceCategoryRepository categoryRepository,
                            ServiceTypeRepository typeRepository,
                            TechnicianRepository technicianRepository,
                            UserRepository userRepository,
                            InventoryService inventoryService,
                            NotificationService notificationService,
                            AuditLogService auditLogService,
                            StorageService storageService) {
        this.workOrderRepository = workOrderRepository;
        this.historyRepository = historyRepository;
        this.photoRepository = photoRepository;
        this.workOrderPartRepository = workOrderPartRepository;
        this.feedbackRepository = feedbackRepository;
        this.serviceRequestRepository = serviceRequestRepository;
        this.customerRepository = customerRepository;
        this.locationRepository = locationRepository;
        this.categoryRepository = categoryRepository;
        this.typeRepository = typeRepository;
        this.technicianRepository = technicianRepository;
        this.userRepository = userRepository;
        this.inventoryService = inventoryService;
        this.notificationService = notificationService;
        this.auditLogService = auditLogService;
        this.storageService = storageService;
    }

    public List<WorkOrderDTO> getAllWorkOrders() {
        return workOrderRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::populateFullDTO)
                .collect(Collectors.toList());
    }

    public List<WorkOrderDTO> getWorkOrdersByCustomerId(Long customerId) {
        return workOrderRepository.findByCustomerId(customerId).stream()
                .map(this::populateFullDTO)
                .collect(Collectors.toList());
    }

    public List<WorkOrderDTO> getWorkOrdersByTechnicianId(Long technicianId) {
        return workOrderRepository.findByAssignedTechnicianId(technicianId).stream()
                .map(this::populateFullDTO)
                .collect(Collectors.toList());
    }

    public List<WorkOrderDTO> getWorkOrdersByStatus(WorkOrderStatus status) {
        return workOrderRepository.findByStatus(status).stream()
                .map(this::populateFullDTO)
                .collect(Collectors.toList());
    }

    public WorkOrderDTO getWorkOrderById(Long id) {
        WorkOrder wo = workOrderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Work Order not found: " + id));
        return populateFullDTO(wo);
    }

    private WorkOrderDTO populateFullDTO(WorkOrder wo) {
        updateSlaStatusIfNeeded(wo);
        WorkOrderDTO dto = new WorkOrderDTO(wo);

        List<WorkOrderPhotoDTO> photos = photoRepository.findByWorkOrderIdOrderByUploadedAtDesc(wo.getId())
                .stream().map(WorkOrderPhotoDTO::new).collect(Collectors.toList());
        dto.setPhotos(photos);

        List<WorkOrderPartDTO> parts = workOrderPartRepository.findByWorkOrderId(wo.getId())
                .stream().map(WorkOrderPartDTO::new).collect(Collectors.toList());
        dto.setPartsUsed(parts);

        List<WorkOrderHistoryDTO> history = historyRepository.findByWorkOrderIdOrderByTimestampDesc(wo.getId())
                .stream().map(WorkOrderHistoryDTO::new).collect(Collectors.toList());
        dto.setHistory(history);

        feedbackRepository.findByWorkOrderId(wo.getId()).ifPresent(fb -> {
            dto.setFeedback(new CustomerFeedbackDTO(fb));
        });

        return dto;
    }

    private void updateSlaStatusIfNeeded(WorkOrder wo) {
        if (wo.getStatus() == WorkOrderStatus.CLOSED || wo.getStatus() == WorkOrderStatus.COMPLETED || wo.getStatus() == WorkOrderStatus.CUSTOMER_VERIFIED) {
            return;
        }
        if (wo.getResolutionDueTime() != null) {
            LocalDateTime now = LocalDateTime.now();
            if (now.isAfter(wo.getResolutionDueTime())) {
                wo.setSlaStatus(SlaStatus.BREACHED);
            } else if (now.plusHours(2).isAfter(wo.getResolutionDueTime())) {
                wo.setSlaStatus(SlaStatus.AT_RISK);
            } else {
                wo.setSlaStatus(SlaStatus.WITHIN_SLA);
            }
        }
    }

    @Transactional
    public WorkOrderDTO createWorkOrder(CreateWorkOrderDTO dto, String dispatcherEmail) {
        Customer customer = customerRepository.findById(dto.getCustomerId())
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found: " + dto.getCustomerId()));

        ServiceLocation location = locationRepository.findById(dto.getServiceLocationId())
                .orElseThrow(() -> new ResourceNotFoundException("Service location not found: " + dto.getServiceLocationId()));

        ServiceCategory category = categoryRepository.findById(dto.getCategoryId())
                .orElseThrow(() -> new ResourceNotFoundException("Category not found: " + dto.getCategoryId()));

        ServiceType type = null;
        if (dto.getServiceTypeId() != null) {
            type = typeRepository.findById(dto.getServiceTypeId()).orElse(null);
        }

        User dispatcher = null;
        if (dispatcherEmail != null) {
            dispatcher = userRepository.findByEmail(dispatcherEmail).orElse(null);
        }

        ServiceRequest request = null;
        if (dto.getServiceRequestId() != null) {
            request = serviceRequestRepository.findById(dto.getServiceRequestId()).orElse(null);
            if (request != null) {
                request.setStatus(RequestStatus.SCHEDULED);
                serviceRequestRepository.save(request);
            }
        }

        String woNumber = "WO-" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd")) + "-" + (1000 + (int)(Math.random() * 9000));

        WorkOrder wo = new WorkOrder();
        wo.setWorkOrderNumber(woNumber);
        wo.setServiceRequest(request);
        wo.setCustomer(customer);
        wo.setServiceLocation(location);
        wo.setServiceCategory(category);
        wo.setServiceType(type);
        wo.setTitle(dto.getTitle());
        wo.setDescription(dto.getDescription());
        wo.setPriority(dto.getPriority() != null ? dto.getPriority() : Priority.MEDIUM);
        wo.setDispatcher(dispatcher);

        // Calculate SLA Target Dates
        LocalDateTime now = LocalDateTime.now();
        switch (wo.getPriority()) {
            case CRITICAL -> {
                wo.setResponseDueTime(now.plusHours(1));
                wo.setResolutionDueTime(now.plusHours(4));
            }
            case HIGH -> {
                wo.setResponseDueTime(now.plusHours(4));
                wo.setResolutionDueTime(now.plusHours(12));
            }
            case MEDIUM -> {
                wo.setResponseDueTime(now.plusHours(12));
                wo.setResolutionDueTime(now.plusHours(24));
            }
            case LOW -> {
                wo.setResponseDueTime(now.plusHours(24));
                wo.setResolutionDueTime(now.plusHours(48));
            }
        }
        wo.setSlaStatus(SlaStatus.WITHIN_SLA);

        // Schedule & Assign if provided
        if (dto.getScheduledDate() != null && dto.getScheduledStartTime() != null && dto.getScheduledEndTime() != null) {
            wo.setScheduledDate(dto.getScheduledDate());
            wo.setScheduledStartTime(dto.getScheduledStartTime());
            wo.setScheduledEndTime(dto.getScheduledEndTime());
            wo.setStatus(WorkOrderStatus.SCHEDULED);
        }

        if (dto.getTechnicianId() != null) {
            Technician technician = technicianRepository.findById(dto.getTechnicianId())
                    .orElseThrow(() -> new ResourceNotFoundException("Technician not found: " + dto.getTechnicianId()));
            validateTechnicianAssignment(technician, wo.getScheduledDate(), wo.getScheduledStartTime(), wo.getScheduledEndTime(), null, category);
            wo.setAssignedTechnician(technician);
            wo.setStatus(WorkOrderStatus.ASSIGNED);
        }

        wo = workOrderRepository.save(wo);

        recordHistory(wo, null, wo.getStatus(), dispatcherEmail != null ? dispatcherEmail : "System", "Work order created");

        // Notify customer
        notificationService.createNotification(
                customer.getUser(),
                "Work Order Created " + wo.getWorkOrderNumber(),
                "Your work order for " + category.getName() + " has been created.",
                NotificationType.SYSTEM,
                "/customer/work-orders"
        );

        // Notify technician if assigned
        if (wo.getAssignedTechnician() != null) {
            notificationService.createNotification(
                    wo.getAssignedTechnician().getUser(),
                    "New Job Assigned " + wo.getWorkOrderNumber(),
                    "You have been assigned to " + wo.getTitle() + " at " + location.getAddress(),
                    NotificationType.ASSIGNMENT,
                    "/technician/jobs"
            );
        }

        auditLogService.log(dispatcherEmail != null ? dispatcherEmail : "SYSTEM", "DISPATCHER", "WORK_ORDER_CREATED", "WorkOrder", wo.getId().toString(), "Created: " + wo.getWorkOrderNumber());

        return populateFullDTO(wo);
    }

    @Transactional
    public WorkOrderDTO createWorkOrderFromRequest(Long requestId, String dispatcherEmail) {
        ServiceRequest req = serviceRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Service request not found: " + requestId));

        CreateWorkOrderDTO dto = new CreateWorkOrderDTO();
        dto.setServiceRequestId(req.getId());
        dto.setCustomerId(req.getCustomer().getId());
        dto.setServiceLocationId(req.getServiceLocation().getId());
        dto.setCategoryId(req.getServiceCategory().getId());
        if (req.getServiceType() != null) {
            dto.setServiceTypeId(req.getServiceType().getId());
        }
        dto.setTitle(req.getServiceCategory().getName() + " Service - " + req.getServiceLocation().getCity());
        dto.setDescription(req.getProblemDescription());
        dto.setPriority(req.getPriority());
        dto.setScheduledDate(req.getPreferredDate() != null ? req.getPreferredDate() : LocalDate.now().plusDays(1));
        dto.setScheduledStartTime(LocalTime.of(10, 0));
        dto.setScheduledEndTime(LocalTime.of(12, 0));

        return createWorkOrder(dto, dispatcherEmail);
    }

    @Transactional
    public WorkOrderDTO assignTechnician(Long workOrderId, WorkOrderAssignDTO dto, String changedByEmail) {
        WorkOrder wo = workOrderRepository.findById(workOrderId)
                .orElseThrow(() -> new ResourceNotFoundException("Work Order not found: " + workOrderId));

        Technician tech = technicianRepository.findById(dto.getTechnicianId())
                .orElseThrow(() -> new ResourceNotFoundException("Technician not found: " + dto.getTechnicianId()));

        LocalDate schedDate = dto.getScheduledDate() != null ? dto.getScheduledDate() : wo.getScheduledDate();
        LocalTime startTime = dto.getScheduledStartTime() != null ? dto.getScheduledStartTime() : wo.getScheduledStartTime();
        LocalTime endTime = dto.getScheduledEndTime() != null ? dto.getScheduledEndTime() : wo.getScheduledEndTime();

        if (schedDate == null || startTime == null || endTime == null) {
            schedDate = LocalDate.now().plusDays(1);
            startTime = LocalTime.of(9, 0);
            endTime = LocalTime.of(11, 0);
        }

        if (startTime.isAfter(endTime) || startTime.equals(endTime)) {
            throw new BadRequestException("Start time must be before end time");
        }

        validateTechnicianAssignment(tech, schedDate, startTime, endTime, wo.getId(), wo.getServiceCategory());

        wo.setScheduledDate(schedDate);
        wo.setScheduledStartTime(startTime);
        wo.setScheduledEndTime(endTime);
        wo.setAssignedTechnician(tech);

        WorkOrderStatus prevStatus = wo.getStatus();
        wo.setStatus(WorkOrderStatus.ASSIGNED);

        wo = workOrderRepository.save(wo);

        recordHistory(wo, prevStatus, WorkOrderStatus.ASSIGNED, changedByEmail, "Assigned to technician " + tech.getUser().getFullName() + (dto.getReason() != null ? ". Note: " + dto.getReason() : ""));

        // Notify Technician
        notificationService.createNotification(
                tech.getUser(),
                "New Work Order Assigned " + wo.getWorkOrderNumber(),
                "Assigned to job: " + wo.getTitle() + " on " + schedDate + " (" + startTime + " - " + endTime + ")",
                NotificationType.ASSIGNMENT,
                "/technician/jobs"
        );

        auditLogService.log(changedByEmail, "DISPATCHER", "TECHNICIAN_ASSIGNED", "WorkOrder", wo.getId().toString(), "Assigned to " + tech.getUser().getEmail());

        return populateFullDTO(wo);
    }

    @Transactional
    public WorkOrderDTO scheduleWorkOrder(Long workOrderId, WorkOrderScheduleDTO dto, String changedByEmail) {
        WorkOrder wo = workOrderRepository.findById(workOrderId)
                .orElseThrow(() -> new ResourceNotFoundException("Work Order not found: " + workOrderId));

        if (dto.getScheduledStartTime().isAfter(dto.getScheduledEndTime()) || dto.getScheduledStartTime().equals(dto.getScheduledEndTime())) {
            throw new BadRequestException("Start time must be before end time");
        }

        if (wo.getAssignedTechnician() != null || dto.getTechnicianId() != null) {
            Long techId = dto.getTechnicianId() != null ? dto.getTechnicianId() : wo.getAssignedTechnician().getId();
            Technician tech = technicianRepository.findById(techId)
                    .orElseThrow(() -> new ResourceNotFoundException("Technician not found: " + techId));
            validateTechnicianAssignment(tech, dto.getScheduledDate(), dto.getScheduledStartTime(), dto.getScheduledEndTime(), wo.getId(), wo.getServiceCategory());
            wo.setAssignedTechnician(tech);
        }

        WorkOrderStatus prevStatus = wo.getStatus();
        LocalDate oldDate = wo.getScheduledDate();
        LocalTime oldStart = wo.getScheduledStartTime();

        wo.setScheduledDate(dto.getScheduledDate());
        wo.setScheduledStartTime(dto.getScheduledStartTime());
        wo.setScheduledEndTime(dto.getScheduledEndTime());

        if (prevStatus == WorkOrderStatus.REQUESTED) {
            wo.setStatus(wo.getAssignedTechnician() != null ? WorkOrderStatus.ASSIGNED : WorkOrderStatus.SCHEDULED);
        } else if (oldDate != null && (!oldDate.equals(dto.getScheduledDate()) || !oldStart.equals(dto.getScheduledStartTime()))) {
            wo.setStatus(WorkOrderStatus.RESCHEDULED);
        }

        wo = workOrderRepository.save(wo);

        String changeMsg = "Rescheduled to " + dto.getScheduledDate() + " " + dto.getScheduledStartTime() + " - " + dto.getScheduledEndTime() +
                (dto.getRescheduleReason() != null ? ". Reason: " + dto.getRescheduleReason() : "");
        recordHistory(wo, prevStatus, wo.getStatus(), changedByEmail, changeMsg);

        // Notify customer and technician
        if (wo.getCustomer() != null && wo.getCustomer().getUser() != null) {
            notificationService.createNotification(
                    wo.getCustomer().getUser(),
                    "Service Rescheduled " + wo.getWorkOrderNumber(),
                    "Your work order has been rescheduled to " + dto.getScheduledDate() + " at " + dto.getScheduledStartTime(),
                    NotificationType.RESCHEDULE,
                    "/customer/work-orders"
            );
        }

        if (wo.getAssignedTechnician() != null) {
            notificationService.createNotification(
                    wo.getAssignedTechnician().getUser(),
                    "Job Schedule Updated " + wo.getWorkOrderNumber(),
                    "Job rescheduled to " + dto.getScheduledDate() + " at " + dto.getScheduledStartTime(),
                    NotificationType.RESCHEDULE,
                    "/technician/jobs"
            );
        }

        return populateFullDTO(wo);
    }

    private void validateTechnicianAssignment(Technician tech, LocalDate date, LocalTime start, LocalTime end, Long currentWorkOrderId, ServiceCategory category) {
        if (tech.getStatus() == TechnicianStatus.INACTIVE) {
            throw new BadRequestException("Cannot assign inactive technician: " + tech.getUser().getFullName());
        }
        if (tech.getAvailability() == TechnicianAvailability.ON_LEAVE || tech.getAvailability() == TechnicianAvailability.INACTIVE) {
            throw new BadRequestException("Technician " + tech.getUser().getFullName() + " is currently " + tech.getAvailability());
        }

        // Validate skill match if category is specified
        if (category != null && category.getName() != null) {
            boolean hasMatchingSkill = false;
            if (tech.getSkills() != null && !tech.getSkills().isEmpty()) {
                hasMatchingSkill = tech.getSkills().stream().anyMatch(s -> 
                    (s.getCategory() != null && s.getCategory().equalsIgnoreCase(category.getName())) ||
                    (s.getName() != null && (s.getName().toLowerCase().contains(category.getName().toLowerCase()) || category.getName().toLowerCase().contains(s.getName().toLowerCase()))) ||
                    (tech.getDepartment() != null && (tech.getDepartment().toLowerCase().contains(category.getName().toLowerCase()) || category.getName().toLowerCase().contains(tech.getDepartment().toLowerCase())))
                );
            } else if (tech.getDepartment() != null && !tech.getDepartment().isBlank()) {
                hasMatchingSkill = tech.getDepartment().toLowerCase().contains(category.getName().toLowerCase()) ||
                        category.getName().toLowerCase().contains(tech.getDepartment().toLowerCase());
            }

            if (!hasMatchingSkill) {
                throw new BadRequestException("Technician " + tech.getUser().getFullName() + " does not possess the required skill for category: " + category.getName());
            }
        }

        if (date != null && start != null && end != null) {
            List<WorkOrder> conflicts = workOrderRepository.findOverlappingWorkOrders(tech.getId(), date, start, end, currentWorkOrderId);
            if (!conflicts.isEmpty()) {
                WorkOrder conflict = conflicts.get(0);
                throw new ConflictException("Schedule conflict: Technician " + tech.getUser().getFullName() +
                        " already has work order " + conflict.getWorkOrderNumber() + " scheduled on " + date + " from " +
                        conflict.getScheduledStartTime() + " to " + conflict.getScheduledEndTime());
            }
        }
    }

    private void validateTechnicianAssignment(Technician tech, LocalDate date, LocalTime start, LocalTime end, Long currentWorkOrderId) {
        validateTechnicianAssignment(tech, date, start, end, currentWorkOrderId, null);
    }

    // Technician Work Order Action Methods
    @Transactional
    public WorkOrderDTO acceptWorkOrder(Long workOrderId, String technicianEmail) {
        WorkOrder wo = getWorkOrderForTechnician(workOrderId, technicianEmail);
        
        // Strict state machine validation
        if (wo.getStatus() == WorkOrderStatus.CLOSED || wo.getStatus() == WorkOrderStatus.CANCELLED) {
            throw new BadRequestException("Cannot accept a " + wo.getStatus() + " work order.");
        }
        if (wo.getStatus() == WorkOrderStatus.IN_PROGRESS || wo.getStatus() == WorkOrderStatus.COMPLETED || wo.getStatus() == WorkOrderStatus.CUSTOMER_VERIFIED) {
            throw new BadRequestException("Work order is already " + wo.getStatus() + " and cannot be re-accepted.");
        }
        if (wo.getStatus() == WorkOrderStatus.ACCEPTED) {
            return populateFullDTO(wo); // already accepted
        }

        WorkOrderStatus prev = wo.getStatus();
        wo.setStatus(WorkOrderStatus.ACCEPTED);
        wo = workOrderRepository.save(wo);

        recordHistory(wo, prev, WorkOrderStatus.ACCEPTED, technicianEmail, "Technician accepted job");
        auditLogService.log(technicianEmail, "TECHNICIAN", "WORK_ORDER_ACCEPTED", "WorkOrder", wo.getId().toString(), "Job accepted");
        return populateFullDTO(wo);
    }

    @Transactional
    public WorkOrderDTO rejectWorkOrder(Long workOrderId, WorkOrderActionDTO dto, String technicianEmail) {
        WorkOrder wo = getWorkOrderForTechnician(workOrderId, technicianEmail);
        if (dto.getReason() == null || dto.getReason().trim().isEmpty()) {
            throw new BadRequestException("Rejection reason is required");
        }

        if (wo.getStatus() == WorkOrderStatus.CLOSED || wo.getStatus() == WorkOrderStatus.CANCELLED || wo.getStatus() == WorkOrderStatus.COMPLETED) {
            throw new BadRequestException("Cannot reject a " + wo.getStatus() + " work order.");
        }

        WorkOrderStatus prev = wo.getStatus();
        wo.setStatus(WorkOrderStatus.REJECTED);
        wo.setRejectionReason(dto.getReason());
        Technician prevTech = wo.getAssignedTechnician();
        wo.setAssignedTechnician(null); // Unassign so dispatcher can reassign

        wo = workOrderRepository.save(wo);

        recordHistory(wo, prev, WorkOrderStatus.REJECTED, technicianEmail, "Rejected by " + (prevTech != null ? prevTech.getUser().getFullName() : "Technician") + ". Reason: " + dto.getReason());

        notificationService.notifyDispatchers(
                "Work Order Rejected " + wo.getWorkOrderNumber(),
                "Job was rejected by technician. Reason: " + dto.getReason(),
                NotificationType.ASSIGNMENT,
                "/dispatcher/work-orders"
        );

        auditLogService.log(technicianEmail, "TECHNICIAN", "WORK_ORDER_REJECTED", "WorkOrder", wo.getId().toString(), "Rejected: " + dto.getReason());
        return populateFullDTO(wo);
    }

    @Transactional
    public WorkOrderDTO startWork(Long workOrderId, String technicianEmail) {
        WorkOrder wo = getWorkOrderForTechnician(workOrderId, technicianEmail);

        // Strict state machine validation
        if (wo.getStatus() == WorkOrderStatus.CLOSED || wo.getStatus() == WorkOrderStatus.CANCELLED || wo.getStatus() == WorkOrderStatus.COMPLETED || wo.getStatus() == WorkOrderStatus.CUSTOMER_VERIFIED) {
            throw new BadRequestException("Cannot start work on a " + wo.getStatus() + " work order.");
        }
        if (wo.getStatus() == WorkOrderStatus.REQUESTED) {
            throw new BadRequestException("Cannot start work on an unassigned/unapproved request.");
        }

        WorkOrderStatus prev = wo.getStatus();
        wo.setStatus(WorkOrderStatus.IN_PROGRESS);
        if (wo.getStartedAt() == null) {
            wo.setStartedAt(LocalDateTime.now());
        }
        wo = workOrderRepository.save(wo);

        recordHistory(wo, prev, WorkOrderStatus.IN_PROGRESS, technicianEmail, "Technician started work on site");
        auditLogService.log(technicianEmail, "TECHNICIAN", "WORK_ORDER_STARTED", "WorkOrder", wo.getId().toString(), "Work started");
        return populateFullDTO(wo);
    }

    @Transactional
    public WorkOrderDTO putOnHold(Long workOrderId, WorkOrderActionDTO dto, String technicianEmail) {
        WorkOrder wo = getWorkOrderForTechnician(workOrderId, technicianEmail);
        
        if (wo.getStatus() != WorkOrderStatus.IN_PROGRESS && wo.getStatus() != WorkOrderStatus.ACCEPTED && wo.getStatus() != WorkOrderStatus.ASSIGNED) {
            throw new BadRequestException("Cannot put work order on hold when status is " + wo.getStatus());
        }

        WorkOrderStatus prev = wo.getStatus();
        wo.setStatus(WorkOrderStatus.ON_HOLD);
        wo.setOnHoldReason(dto.getReason() != null ? dto.getReason() : "Awaiting parts / customer access");
        wo = workOrderRepository.save(wo);

        recordHistory(wo, prev, WorkOrderStatus.ON_HOLD, technicianEmail, "Put on hold: " + wo.getOnHoldReason());
        auditLogService.log(technicianEmail, "TECHNICIAN", "WORK_ORDER_ON_HOLD", "WorkOrder", wo.getId().toString(), "On hold: " + wo.getOnHoldReason());
        return populateFullDTO(wo);
    }

    @Transactional
    public WorkOrderDTO completeWork(Long workOrderId, WorkOrderActionDTO dto, String technicianEmail) {
        WorkOrder wo = getWorkOrderForTechnician(workOrderId, technicianEmail);

        if (wo.getStatus() != WorkOrderStatus.IN_PROGRESS && wo.getStatus() != WorkOrderStatus.ON_HOLD) {
            throw new BadRequestException("Cannot complete work order without starting it. Current status: " + wo.getStatus());
        }

        WorkOrderStatus prev = wo.getStatus();
        wo.setStatus(WorkOrderStatus.COMPLETED);
        wo.setCompletedAt(LocalDateTime.now());
        if (dto.getWorkPerformed() != null) wo.setWorkPerformed(dto.getWorkPerformed());
        if (dto.getNotes() != null) wo.setCompletionNotes(dto.getNotes());
        if (dto.getTotalAmount() != null) wo.setTotalAmount(dto.getTotalAmount());
        if (dto.getAmountPaid() != null) wo.setAmountPaid(dto.getAmountPaid());

        // Process Parts used with inventory deduction & validation
        if (dto.getPartsUsed() != null && !dto.getPartsUsed().isEmpty()) {
            for (PartUsageDTO partUsage : dto.getPartsUsed()) {
                inventoryService.consumePartForWorkOrder(wo, partUsage.getPartId(), partUsage.getQuantity(), technicianEmail, partUsage.getNotes());
            }
        }

        // Process Photos
        if (dto.getPhotoUrls() != null && !dto.getPhotoUrls().isEmpty()) {
            for (String url : dto.getPhotoUrls()) {
                if (url == null || url.isBlank()) continue;
                String storedUrl = url.trim();
                if (!storedUrl.startsWith("/api/upload/files/")) {
                    throw new BadRequestException("Invalid completion photo URL: only stored file URLs from /api/upload/photo are permitted.");
                }
                String filename = storedUrl.substring("/api/upload/files/".length());
                if (!storageService.fileExists(filename)) {
                    throw new BadRequestException("Completion photo file does not exist on storage server: " + filename);
                }
                WorkOrderPhoto photo = new WorkOrderPhoto(wo, storedUrl, PhotoCategory.AFTER, "Job completion photo", technicianEmail);
                photoRepository.save(photo);
            }
        }

        // Update technician completed jobs count
        if (wo.getAssignedTechnician() != null) {
            Technician tech = wo.getAssignedTechnician();
            tech.setCompletedJobsCount((tech.getCompletedJobsCount() != null ? tech.getCompletedJobsCount() : 0) + 1);
            technicianRepository.save(tech);
        }

        wo = workOrderRepository.save(wo);

        recordHistory(wo, prev, WorkOrderStatus.COMPLETED, technicianEmail, "Work marked completed by technician. Work performed: " + (dto.getWorkPerformed() != null ? dto.getWorkPerformed() : "N/A"));

        // Notify Customer for verification
        if (wo.getCustomer() != null && wo.getCustomer().getUser() != null) {
            notificationService.createNotification(
                    wo.getCustomer().getUser(),
                    "Work Completed - Please Verify " + wo.getWorkOrderNumber(),
                    "Technician has completed the work. Please review details, photos, and confirm or report any issue.",
                    NotificationType.COMPLETION,
                    "/customer/work-orders"
            );
        }

        auditLogService.log(technicianEmail, "TECHNICIAN", "WORK_ORDER_COMPLETED", "WorkOrder", wo.getId().toString(), "Work completed");
        return populateFullDTO(wo);
    }

    // Customer Verification Actions
    @Transactional
    public WorkOrderDTO verifyAndConfirm(Long workOrderId, WorkOrderActionDTO dto, String customerEmail) {
        WorkOrder wo = workOrderRepository.findById(workOrderId)
                .orElseThrow(() -> new ResourceNotFoundException("Work Order not found: " + workOrderId));

        if (!wo.getCustomer().getUser().getEmail().equalsIgnoreCase(customerEmail)) {
            throw new BadRequestException("Unauthorized: Customer does not own this work order");
        }

        if (wo.getStatus() != WorkOrderStatus.COMPLETED) {
            throw new BadRequestException("Cannot verify work order that is not completed. Current status: " + wo.getStatus());
        }

        WorkOrderStatus prev = wo.getStatus();
        wo.setStatus(WorkOrderStatus.CUSTOMER_VERIFIED);
        wo.setVerifiedAt(LocalDateTime.now());
        wo.setClosedAt(LocalDateTime.now());

        // Save Customer Feedback & Rating
        int rating = dto.getRating() != null ? dto.getRating() : 5;
        String satisfaction = rating >= 4 ? "EXCELLENT" : rating == 3 ? "GOOD" : "NEEDS_IMPROVEMENT";

        CustomerFeedback feedback = new CustomerFeedback(wo, wo.getCustomer(), rating, dto.getFeedbackText(), satisfaction);
        feedbackRepository.save(feedback);

        // Update Technician Rating
        if (wo.getAssignedTechnician() != null) {
            Technician tech = wo.getAssignedTechnician();
            double curRating = tech.getAverageRating() != null ? tech.getAverageRating() : 5.0;
            int jobs = tech.getCompletedJobsCount() != null ? tech.getCompletedJobsCount() : 1;
            double newAvg = Math.round(((curRating * (jobs - 1) + rating) / (double) jobs) * 10.0) / 10.0;
            tech.setAverageRating(newAvg);
            technicianRepository.save(tech);
        }

        wo = workOrderRepository.save(wo);

        recordHistory(wo, prev, WorkOrderStatus.CUSTOMER_VERIFIED, customerEmail, "Customer verified & confirmed work with rating: " + rating + "/5");

        // Close work order
        wo.setStatus(WorkOrderStatus.CLOSED);
        wo = workOrderRepository.save(wo);
        recordHistory(wo, WorkOrderStatus.CUSTOMER_VERIFIED, WorkOrderStatus.CLOSED, "SYSTEM", "Work order successfully closed");

        auditLogService.log(customerEmail, "CUSTOMER", "WORK_ORDER_VERIFIED", "WorkOrder", wo.getId().toString(), "Verified with rating " + rating);

        return populateFullDTO(wo);
    }

    @Transactional
    public WorkOrderDTO reportIssueAndReopen(Long workOrderId, ReopenRequestDTO dto, String customerEmail) {
        WorkOrder wo = workOrderRepository.findById(workOrderId)
                .orElseThrow(() -> new ResourceNotFoundException("Work Order not found: " + workOrderId));

        if (!wo.getCustomer().getUser().getEmail().equalsIgnoreCase(customerEmail)) {
            throw new BadRequestException("Unauthorized: Customer does not own this work order");
        }

        if (wo.getStatus() != WorkOrderStatus.COMPLETED && wo.getStatus() != WorkOrderStatus.CUSTOMER_VERIFIED && wo.getStatus() != WorkOrderStatus.CLOSED) {
            throw new BadRequestException("Cannot report issue on an active, incomplete work order. Current status: " + wo.getStatus());
        }

        WorkOrderStatus prev = wo.getStatus();
        wo.setStatus(WorkOrderStatus.REOPENED);
        wo.setReopenReason(dto.getReason() + (dto.getNotes() != null ? " - " + dto.getNotes() : ""));
        wo = workOrderRepository.save(wo);

        recordHistory(wo, prev, WorkOrderStatus.REOPENED, customerEmail, "Customer reported issue: " + wo.getReopenReason());

        // Notify Dispatcher & Technician
        notificationService.notifyDispatchers(
                "Work Order Reopened: " + wo.getWorkOrderNumber(),
                "Customer reported an issue: " + dto.getReason(),
                NotificationType.REOPEN,
                "/dispatcher/work-orders"
        );

        if (wo.getAssignedTechnician() != null) {
            notificationService.createNotification(
                    wo.getAssignedTechnician().getUser(),
                    "Job Reopened " + wo.getWorkOrderNumber(),
                    "Customer reported an issue: " + dto.getReason(),
                    NotificationType.REOPEN,
                    "/technician/jobs"
            );
        }

        auditLogService.log(customerEmail, "CUSTOMER", "WORK_ORDER_REOPENED", "WorkOrder", wo.getId().toString(), "Reopened: " + dto.getReason());

        return populateFullDTO(wo);
    }

    @Transactional
    public WorkOrderPhotoDTO uploadWorkOrderPhoto(Long workOrderId, String photoUrl, PhotoCategory category, String caption, String userEmail) {
        WorkOrder wo = workOrderRepository.findById(workOrderId)
                .orElseThrow(() -> new ResourceNotFoundException("Work Order not found: " + workOrderId));

        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new UnauthorizedException("User not authenticated"));

        if (user.getRole() == Role.TECHNICIAN) {
            if (wo.getAssignedTechnician() == null || !wo.getAssignedTechnician().getUser().getEmail().equalsIgnoreCase(userEmail)) {
                throw new BadRequestException("Unauthorized: Technician is not assigned to this work order");
            }
        } else if (user.getRole() == Role.CUSTOMER) {
            if (wo.getCustomer() == null || wo.getCustomer().getUser() == null || !wo.getCustomer().getUser().getEmail().equalsIgnoreCase(userEmail)) {
                throw new BadRequestException("Unauthorized: Customer does not own this work order");
            }
        } else if (user.getRole() != Role.ADMINISTRATOR && user.getRole() != Role.DISPATCHER) {
            throw new BadRequestException("Unauthorized role for uploading photos");
        }

        if (photoUrl == null || photoUrl.trim().isEmpty()) {
            throw new BadRequestException("Photo URL cannot be empty");
        }

        String finalPhotoUrl = photoUrl.trim();
        if (!finalPhotoUrl.startsWith("/api/upload/files/")) {
            throw new BadRequestException("Invalid photo URL: only files uploaded via /api/upload/photo are permitted.");
        }

        String filename = finalPhotoUrl.substring("/api/upload/files/".length());
        if (!storageService.fileExists(filename)) {
            throw new BadRequestException("Photo file does not exist on storage server: " + filename);
        }

        WorkOrderPhoto photo = new WorkOrderPhoto(wo, finalPhotoUrl, category != null ? category : PhotoCategory.DURING, caption, userEmail);
        photo = photoRepository.save(photo);

        auditLogService.log(userEmail, user.getRole().name(), "PHOTO_UPLOADED", "WorkOrderPhoto", photo.getId().toString(), "Uploaded " + (category != null ? category : PhotoCategory.DURING) + " photo for WO " + wo.getWorkOrderNumber());

        return new WorkOrderPhotoDTO(photo);
    }

    @Transactional
    public WorkOrderDTO addPartToWorkOrder(Long workOrderId, Long partId, Integer quantity, String notes, String technicianEmail) {
        WorkOrder wo = getWorkOrderForTechnician(workOrderId, technicianEmail);
        inventoryService.consumePartForWorkOrder(wo, partId, quantity, technicianEmail, notes);
        return populateFullDTO(wo);
    }

    private WorkOrder getWorkOrderForTechnician(Long workOrderId, String technicianEmail) {
        WorkOrder wo = workOrderRepository.findById(workOrderId)
                .orElseThrow(() -> new ResourceNotFoundException("Work Order not found: " + workOrderId));

        if (wo.getAssignedTechnician() == null || !wo.getAssignedTechnician().getUser().getEmail().equalsIgnoreCase(technicianEmail)) {
            // Check if administrator or dispatcher is performing override
            User u = userRepository.findByEmail(technicianEmail).orElse(null);
            if (u == null || (u.getRole() != Role.ADMINISTRATOR && u.getRole() != Role.DISPATCHER)) {
                throw new BadRequestException("Unauthorized: Technician is not assigned to this job");
            }
        }
        return wo;
    }

    private void recordHistory(WorkOrder wo, WorkOrderStatus prev, WorkOrderStatus next, String changedBy, String reason) {
        WorkOrderHistory history = new WorkOrderHistory(wo, prev, next, changedBy, reason);
        historyRepository.save(history);
    }
}
