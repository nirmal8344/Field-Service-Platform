package com.fieldservice.field_service_backend.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "part_requests")
public class PartRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String requestNumber;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "part_id")
    private Part part;

    @Column(nullable = false, length = 150)
    private String partName;

    @Column(length = 100)
    private String category;

    @Column(length = 50)
    private String sku;

    @Column(nullable = false)
    private Integer quantity;

    @Column(length = 20)
    private String unit = "pcs";

    @Column(columnDefinition = "TEXT", nullable = false)
    private String reason;

    @Enumerated(EnumType.STRING)
    @Column(length = 30)
    private Priority priority = Priority.MEDIUM;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private PartRequestStatus status = PartRequestStatus.PENDING;

    @Column(name = "requested_by_technician_id")
    private Long requestedByTechnicianId;

    @Column(name = "technician_name", length = 100)
    private String technicianName;

    @Column(name = "technician_employee_code", length = 50)
    private String technicianEmployeeCode;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "technician_user_id", nullable = false)
    private User technicianUser;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "work_order_id")
    private WorkOrder workOrder;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "forwarded_by_user_id")
    private User forwardedBy;

    private LocalDateTime forwardedAt;

    @Column(columnDefinition = "TEXT")
    private String dispatcherNotes;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "reviewed_by_user_id")
    private User reviewedBy;

    private LocalDateTime reviewedAt;

    @Column(columnDefinition = "TEXT")
    private String adminNotes;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    private LocalDateTime updatedAt = LocalDateTime.now();

    public PartRequest() {}

    public PartRequest(String requestNumber, Part part, String partName, String category, String sku,
                       Integer quantity, String unit, String reason, Priority priority,
                       Long requestedByTechnicianId, String technicianName, String technicianEmployeeCode,
                       User technicianUser, WorkOrder workOrder) {
        this.requestNumber = requestNumber;
        this.part = part;
        this.partName = partName;
        this.category = category;
        this.sku = sku;
        this.quantity = quantity;
        this.unit = unit != null ? unit : "pcs";
        this.reason = reason;
        this.priority = priority != null ? priority : Priority.MEDIUM;
        this.requestedByTechnicianId = requestedByTechnicianId;
        this.technicianName = technicianName;
        this.technicianEmployeeCode = technicianEmployeeCode;
        this.technicianUser = technicianUser;
        this.workOrder = workOrder;
        this.status = PartRequestStatus.PENDING;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PrePersist
    public void prePersist() {
        if (createdAt == null) createdAt = LocalDateTime.now();
        if (updatedAt == null) updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = LocalDateTime.now();
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getRequestNumber() { return requestNumber; }
    public void setRequestNumber(String requestNumber) { this.requestNumber = requestNumber; }

    public Part getPart() { return part; }
    public void setPart(Part part) { this.part = part; }

    public String getPartName() { return partName; }
    public void setPartName(String partName) { this.partName = partName; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getSku() { return sku; }
    public void setSku(String sku) { this.sku = sku; }

    public Integer getQuantity() { return quantity; }
    public void setQuantity(Integer quantity) { this.quantity = quantity; }

    public String getUnit() { return unit; }
    public void setUnit(String unit) { this.unit = unit; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public Priority getPriority() { return priority; }
    public void setPriority(Priority priority) { this.priority = priority; }

    public PartRequestStatus getStatus() { return status; }
    public void setStatus(PartRequestStatus status) { this.status = status; }

    public Long getRequestedByTechnicianId() { return requestedByTechnicianId; }
    public void setRequestedByTechnicianId(Long requestedByTechnicianId) { this.requestedByTechnicianId = requestedByTechnicianId; }

    public String getTechnicianName() { return technicianName; }
    public void setTechnicianName(String technicianName) { this.technicianName = technicianName; }

    public String getTechnicianEmployeeCode() { return technicianEmployeeCode; }
    public void setTechnicianEmployeeCode(String technicianEmployeeCode) { this.technicianEmployeeCode = technicianEmployeeCode; }

    public User getTechnicianUser() { return technicianUser; }
    public void setTechnicianUser(User technicianUser) { this.technicianUser = technicianUser; }

    public WorkOrder getWorkOrder() { return workOrder; }
    public void setWorkOrder(WorkOrder workOrder) { this.workOrder = workOrder; }

    public User getForwardedBy() { return forwardedBy; }
    public void setForwardedBy(User forwardedBy) { this.forwardedBy = forwardedBy; }

    public LocalDateTime getForwardedAt() { return forwardedAt; }
    public void setForwardedAt(LocalDateTime forwardedAt) { this.forwardedAt = forwardedAt; }

    public String getDispatcherNotes() { return dispatcherNotes; }
    public void setDispatcherNotes(String dispatcherNotes) { this.dispatcherNotes = dispatcherNotes; }

    public User getReviewedBy() { return reviewedBy; }
    public void setReviewedBy(User reviewedBy) { this.reviewedBy = reviewedBy; }

    public LocalDateTime getReviewedAt() { return reviewedAt; }
    public void setReviewedAt(LocalDateTime reviewedAt) { this.reviewedAt = reviewedAt; }

    public String getAdminNotes() { return adminNotes; }
    public void setAdminNotes(String adminNotes) { this.adminNotes = adminNotes; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
