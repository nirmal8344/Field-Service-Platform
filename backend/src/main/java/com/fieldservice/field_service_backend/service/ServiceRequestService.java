package com.fieldservice.field_service_backend.service;

import com.fieldservice.field_service_backend.dto.CreateServiceRequestDTO;
import com.fieldservice.field_service_backend.dto.ServiceRequestDTO;
import com.fieldservice.field_service_backend.exception.BadRequestException;
import com.fieldservice.field_service_backend.exception.ResourceNotFoundException;
import com.fieldservice.field_service_backend.model.*;
import com.fieldservice.field_service_backend.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class ServiceRequestService {

    private final ServiceRequestRepository serviceRequestRepository;
    private final CustomerRepository customerRepository;
    private final ServiceLocationRepository serviceLocationRepository;
    private final ServiceCategoryRepository serviceCategoryRepository;
    private final ServiceTypeRepository serviceTypeRepository;
    private final NotificationService notificationService;
    private final AuditLogService auditLogService;

    public ServiceRequestService(ServiceRequestRepository serviceRequestRepository,
                                 CustomerRepository customerRepository,
                                 ServiceLocationRepository serviceLocationRepository,
                                 ServiceCategoryRepository serviceCategoryRepository,
                                 ServiceTypeRepository serviceTypeRepository,
                                 NotificationService notificationService,
                                 AuditLogService auditLogService) {
        this.serviceRequestRepository = serviceRequestRepository;
        this.customerRepository = customerRepository;
        this.serviceLocationRepository = serviceLocationRepository;
        this.serviceCategoryRepository = serviceCategoryRepository;
        this.serviceTypeRepository = serviceTypeRepository;
        this.notificationService = notificationService;
        this.auditLogService = auditLogService;
    }

    public List<ServiceRequestDTO> getAllRequests() {
        return serviceRequestRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(ServiceRequestDTO::new)
                .collect(Collectors.toList());
    }

    public List<ServiceRequestDTO> getRequestsByStatus(RequestStatus status) {
        return serviceRequestRepository.findByStatus(status).stream()
                .map(ServiceRequestDTO::new)
                .collect(Collectors.toList());
    }

    public List<ServiceRequestDTO> getRequestsByCustomerId(Long customerId) {
        return serviceRequestRepository.findByCustomerIdOrderByCreatedAtDesc(customerId).stream()
                .map(ServiceRequestDTO::new)
                .collect(Collectors.toList());
    }

    public ServiceRequestDTO getRequestById(Long id) {
        ServiceRequest req = serviceRequestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Service request not found: " + id));
        return new ServiceRequestDTO(req);
    }

    @Transactional
    public ServiceRequestDTO createRequest(Long customerId, CreateServiceRequestDTO dto) {
        Customer customer = customerRepository.findById(customerId)
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found: " + customerId));

        ServiceLocation location = serviceLocationRepository.findById(dto.getServiceLocationId())
                .orElseThrow(() -> new ResourceNotFoundException("Service location not found: " + dto.getServiceLocationId()));

        if (!location.getCustomer().getId().equals(customer.getId())) {
            throw new BadRequestException("Service location does not belong to this customer");
        }

        ServiceCategory category = serviceCategoryRepository.findById(dto.getCategoryId())
                .orElseThrow(() -> new ResourceNotFoundException("Service category not found: " + dto.getCategoryId()));

        ServiceType type = null;
        if (dto.getServiceTypeId() != null) {
            type = serviceTypeRepository.findById(dto.getServiceTypeId()).orElse(null);
        }

        String reqNumber = "REQ-" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd")) + "-" + (1000 + (int)(Math.random() * 9000));

        ServiceRequest req = new ServiceRequest();
        req.setRequestNumber(reqNumber);
        req.setCustomer(customer);
        req.setServiceLocation(location);
        req.setServiceCategory(category);
        req.setServiceType(type);
        req.setProblemDescription(dto.getProblemDescription());
        req.setPriority(dto.getPriority() != null ? dto.getPriority() : Priority.MEDIUM);
        req.setPreferredDate(dto.getPreferredDate());
        req.setPreferredTimeSlot(dto.getPreferredTimeSlot());
        req.setAttachmentsJson(dto.getAttachmentsJson());
        req.setNotes(dto.getNotes());
        req.setStatus(RequestStatus.REQUESTED);
        req.setRequestDate(LocalDateTime.now());

        req = serviceRequestRepository.save(req);

        // Notify dispatchers & admins
        notificationService.notifyDispatchers(
                "New Service Request " + req.getRequestNumber(),
                "Customer " + customer.getUser().getFullName() + " requested " + category.getName() + " service at " + location.getCity(),
                NotificationType.ASSIGNMENT,
                "/dispatcher/requests"
        );

        auditLogService.log(customer.getUser().getEmail(), "CUSTOMER", "SERVICE_REQUEST_CREATED", "ServiceRequest", req.getId().toString(), "Created request: " + req.getRequestNumber());

        return new ServiceRequestDTO(req);
    }

    @Transactional
    public ServiceRequestDTO cancelRequest(Long requestId, String reason, String userEmail) {
        ServiceRequest req = serviceRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Service request not found: " + requestId));

        req.setStatus(RequestStatus.CANCELLED);
        req.setNotes((req.getNotes() != null ? req.getNotes() + "\n" : "") + "Cancelled: " + reason);
        req = serviceRequestRepository.save(req);

        auditLogService.log(userEmail, "USER", "SERVICE_REQUEST_CANCELLED", "ServiceRequest", req.getId().toString(), "Cancelled request: " + reason);

        return new ServiceRequestDTO(req);
    }

    @Transactional
    public ServiceRequestDTO updatePriority(Long requestId, Priority priority, String userEmail) {
        ServiceRequest req = serviceRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Service request not found: " + requestId));

        req.setPriority(priority);
        req = serviceRequestRepository.save(req);

        auditLogService.log(userEmail, "DISPATCHER", "SERVICE_REQUEST_PRIORITY_UPDATED", "ServiceRequest", req.getId().toString(), "Updated priority to " + priority);

        return new ServiceRequestDTO(req);
    }
}
