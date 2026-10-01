package com.fieldservice.field_service_backend.dto;

import com.fieldservice.field_service_backend.model.PhotoCategory;
import com.fieldservice.field_service_backend.model.WorkOrderPhoto;

import java.time.LocalDateTime;

public class WorkOrderPhotoDTO {
    private Long id;
    private Long workOrderId;
    private String photoUrl;
    private PhotoCategory photoCategory;
    private String caption;
    private String uploadedBy;
    private LocalDateTime uploadedAt;

    public WorkOrderPhotoDTO() {}

    public WorkOrderPhotoDTO(WorkOrderPhoto photo) {
        this.id = photo.getId();
        if (photo.getWorkOrder() != null) {
            this.workOrderId = photo.getWorkOrder().getId();
        }
        this.photoUrl = photo.getPhotoUrl();
        this.photoCategory = photo.getPhotoCategory();
        this.caption = photo.getCaption();
        this.uploadedBy = photo.getUploadedBy();
        this.uploadedAt = photo.getUploadedAt();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getWorkOrderId() { return workOrderId; }
    public void setWorkOrderId(Long workOrderId) { this.workOrderId = workOrderId; }

    public String getPhotoUrl() { return photoUrl; }
    public void setPhotoUrl(String photoUrl) { this.photoUrl = photoUrl; }

    public PhotoCategory getPhotoCategory() { return photoCategory; }
    public void setPhotoCategory(PhotoCategory photoCategory) { this.photoCategory = photoCategory; }

    public String getCaption() { return caption; }
    public void setCaption(String caption) { this.caption = caption; }

    public String getUploadedBy() { return uploadedBy; }
    public void setUploadedBy(String uploadedBy) { this.uploadedBy = uploadedBy; }

    public LocalDateTime getUploadedAt() { return uploadedAt; }
    public void setUploadedAt(LocalDateTime uploadedAt) { this.uploadedAt = uploadedAt; }
}
