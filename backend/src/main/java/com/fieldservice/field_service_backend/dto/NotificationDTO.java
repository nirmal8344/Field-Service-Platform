package com.fieldservice.field_service_backend.dto;

import com.fieldservice.field_service_backend.model.InAppNotification;
import com.fieldservice.field_service_backend.model.NotificationType;

import java.time.LocalDateTime;

public class NotificationDTO {
    private Long id;
    private Long userId;
    private String title;
    private String message;
    private NotificationType type;
    private boolean read;
    private String linkUrl;
    private LocalDateTime createdAt;

    public NotificationDTO() {}

    public NotificationDTO(InAppNotification n) {
        this.id = n.getId();
        if (n.getUser() != null) {
            this.userId = n.getUser().getId();
        }
        this.title = n.getTitle();
        this.message = n.getMessage();
        this.type = n.getType();
        this.read = n.isRead();
        this.linkUrl = n.getLinkUrl();
        this.createdAt = n.getCreatedAt();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public NotificationType getType() { return type; }
    public void setType(NotificationType type) { this.type = type; }

    public boolean isRead() { return read; }
    public void setRead(boolean read) { this.read = read; }

    public String getLinkUrl() { return linkUrl; }
    public void setLinkUrl(String linkUrl) { this.linkUrl = linkUrl; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
