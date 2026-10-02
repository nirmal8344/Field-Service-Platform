package com.fieldservice.field_service_backend.service;

import com.fieldservice.field_service_backend.dto.NotificationDTO;
import com.fieldservice.field_service_backend.model.InAppNotification;
import com.fieldservice.field_service_backend.model.NotificationType;
import com.fieldservice.field_service_backend.model.User;
import com.fieldservice.field_service_backend.repository.InAppNotificationRepository;
import com.fieldservice.field_service_backend.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class NotificationService {

    private final InAppNotificationRepository notificationRepository;
    private final UserRepository userRepository;

    public NotificationService(InAppNotificationRepository notificationRepository, UserRepository userRepository) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
    }

    public void createNotification(User user, String title, String message, NotificationType type, String linkUrl) {
        if (user == null) return;
        try {
            InAppNotification notification = new InAppNotification(user, title, message, type, linkUrl);
            notificationRepository.save(notification);
        } catch (Exception e) {
            try {
                InAppNotification fallback = new InAppNotification(user, title, message, NotificationType.SYSTEM, linkUrl);
                notificationRepository.save(fallback);
            } catch (Exception ignored) {
                System.err.println("Failed to persist notification: " + e.getMessage());
            }
        }
    }

    public void notifyAdmins(String title, String message, NotificationType type, String linkUrl) {
        userRepository.findByRole(com.fieldservice.field_service_backend.model.Role.ADMINISTRATOR)
                .forEach(admin -> createNotification(admin, title, message, type, linkUrl));
    }

    public void notifyDispatchers(String title, String message, NotificationType type, String linkUrl) {
        userRepository.findByRole(com.fieldservice.field_service_backend.model.Role.DISPATCHER)
                .forEach(disp -> createNotification(disp, title, message, type, linkUrl));
    }

    public List<NotificationDTO> getUserNotifications(Long userId) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(NotificationDTO::new)
                .collect(Collectors.toList());
    }

    public long getUnreadCount(Long userId) {
        return notificationRepository.countByUserIdAndReadFalse(userId);
    }

    @Transactional
    public void markAsRead(Long notificationId) {
        notificationRepository.findById(notificationId).ifPresent(n -> {
            n.setRead(true);
            notificationRepository.save(n);
        });
    }

    @Transactional
    public void markAllAsRead(Long userId) {
        notificationRepository.markAllAsRead(userId);
    }
}
