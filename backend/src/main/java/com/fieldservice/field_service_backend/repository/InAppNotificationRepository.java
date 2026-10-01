package com.fieldservice.field_service_backend.repository;

import com.fieldservice.field_service_backend.model.InAppNotification;
import com.fieldservice.field_service_backend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface InAppNotificationRepository extends JpaRepository<InAppNotification, Long> {
    List<InAppNotification> findByUserOrderByCreatedAtDesc(User user);
    List<InAppNotification> findByUserIdOrderByCreatedAtDesc(Long userId);
    List<InAppNotification> findByUserIdAndReadFalseOrderByCreatedAtDesc(Long userId);
    long countByUserIdAndReadFalse(Long userId);

    @Modifying
    @Query("UPDATE InAppNotification n SET n.read = true WHERE n.user.id = :userId")
    void markAllAsRead(@Param("userId") Long userId);
}
