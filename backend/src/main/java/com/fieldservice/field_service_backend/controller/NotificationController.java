package com.fieldservice.field_service_backend.controller;

import com.fieldservice.field_service_backend.config.UserContext;
import com.fieldservice.field_service_backend.dto.NotificationDTO;
import com.fieldservice.field_service_backend.exception.UnauthorizedException;
import com.fieldservice.field_service_backend.service.NotificationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @GetMapping
    public ResponseEntity<List<NotificationDTO>> getNotifications() {
        Long targetUserId = UserContext.getCurrentUserId();
        if (targetUserId == null) {
            throw new UnauthorizedException("Authentication token required");
        }
        return ResponseEntity.ok(notificationService.getUserNotifications(targetUserId));
    }

    @GetMapping("/unread-count")
    public ResponseEntity<Map<String, Long>> getUnreadCount() {
        Long targetUserId = UserContext.getCurrentUserId();
        if (targetUserId == null) {
            throw new UnauthorizedException("Authentication token required");
        }
        long count = notificationService.getUnreadCount(targetUserId);
        return ResponseEntity.ok(Map.of("unreadCount", count));
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<Void> markAsRead(@PathVariable Long id) {
        notificationService.markAsRead(id);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/read-all")
    public ResponseEntity<Void> markAllAsRead() {
        Long targetUserId = UserContext.getCurrentUserId();
        if (targetUserId == null) {
            throw new UnauthorizedException("Authentication token required");
        }
        notificationService.markAllAsRead(targetUserId);
        return ResponseEntity.ok().build();
    }
}
