package com.fieldservice.field_service_backend.service;

import com.fieldservice.field_service_backend.model.*;
import com.fieldservice.field_service_backend.repository.WorkOrderRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class SlaMonitoringService {

    private final WorkOrderRepository workOrderRepository;
    private final NotificationService notificationService;
    private final AuditLogService auditLogService;

    public SlaMonitoringService(WorkOrderRepository workOrderRepository,
                                NotificationService notificationService,
                                AuditLogService auditLogService) {
        this.workOrderRepository = workOrderRepository;
        this.notificationService = notificationService;
        this.auditLogService = auditLogService;
    }

    @Scheduled(fixedRate = 60000) // Runs every minute
    @Transactional
    public void monitorSlaCompliance() {
        List<WorkOrder> activeOrders = workOrderRepository.findAll().stream()
                .filter(w -> w.getStatus() != WorkOrderStatus.COMPLETED &&
                             w.getStatus() != WorkOrderStatus.CUSTOMER_VERIFIED &&
                             w.getStatus() != WorkOrderStatus.CLOSED &&
                             w.getStatus() != WorkOrderStatus.CANCELLED &&
                             w.getStatus() != WorkOrderStatus.REJECTED)
                .toList();

        LocalDateTime now = LocalDateTime.now();

        for (WorkOrder wo : activeOrders) {
            LocalDateTime due = wo.getResolutionDueTime();
            if (due == null) continue;

            SlaStatus prevSla = wo.getSlaStatus();

            if (now.isAfter(due)) {
                if (prevSla != SlaStatus.BREACHED) {
                    wo.setSlaStatus(SlaStatus.BREACHED);
                    workOrderRepository.save(wo);
                    
                    notificationService.notifyDispatchers(
                            "SLA BREACHED: " + wo.getWorkOrderNumber(),
                            "Work Order '" + wo.getTitle() + "' has breached its resolution SLA target.",
                            NotificationType.SLA_ALERT,
                            "/dispatcher/work-orders"
                    );

                    auditLogService.log("SYSTEM", "SYSTEM", "SLA_BREACHED", "WorkOrder", wo.getId().toString(), "SLA resolution deadline passed: " + due);
                }
            } else if (now.plusMinutes(30).isAfter(due)) {
                if (prevSla == SlaStatus.WITHIN_SLA || prevSla == null) {
                    wo.setSlaStatus(SlaStatus.AT_RISK);
                    workOrderRepository.save(wo);

                    notificationService.notifyDispatchers(
                            "SLA AT RISK: " + wo.getWorkOrderNumber(),
                            "Work Order '" + wo.getTitle() + "' is approaching resolution deadline within 30 minutes.",
                            NotificationType.SLA_ALERT,
                            "/dispatcher/work-orders"
                    );

                    if (wo.getAssignedTechnician() != null && wo.getAssignedTechnician().getUser() != null) {
                        notificationService.createNotification(
                                wo.getAssignedTechnician().getUser(),
                                "SLA Warning: " + wo.getWorkOrderNumber(),
                                "Job resolution deadline is within 30 minutes. Please complete on-site work.",
                                NotificationType.SLA_ALERT,
                                "/technician/jobs"
                        );
                    }
                }
            }
        }
    }
}
