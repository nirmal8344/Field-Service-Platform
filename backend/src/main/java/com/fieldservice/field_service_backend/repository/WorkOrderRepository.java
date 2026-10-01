package com.fieldservice.field_service_backend.repository;

import com.fieldservice.field_service_backend.model.Customer;
import com.fieldservice.field_service_backend.model.Technician;
import com.fieldservice.field_service_backend.model.WorkOrder;
import com.fieldservice.field_service_backend.model.WorkOrderStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface WorkOrderRepository extends JpaRepository<WorkOrder, Long>, JpaSpecificationExecutor<WorkOrder> {
    Optional<WorkOrder> findByWorkOrderNumber(String workOrderNumber);
    List<WorkOrder> findByCustomer(Customer customer);
    List<WorkOrder> findByCustomerId(Long customerId);
    List<WorkOrder> findByAssignedTechnician(Technician technician);
    List<WorkOrder> findByAssignedTechnicianId(Long technicianId);
    List<WorkOrder> findByStatus(WorkOrderStatus status);
    List<WorkOrder> findAllByOrderByCreatedAtDesc();

    // Check overlapping jobs for technician on a given date and time range
    @Query("SELECT w FROM WorkOrder w WHERE w.assignedTechnician.id = :technicianId " +
           "AND w.scheduledDate = :scheduledDate " +
           "AND w.status NOT IN ('COMPLETED', 'CUSTOMER_VERIFIED', 'CLOSED', 'CANCELLED', 'REJECTED') " +
           "AND (:workOrderId IS NULL OR w.id != :workOrderId) " +
           "AND (" +
           "  (:startTime >= w.scheduledStartTime AND :startTime < w.scheduledEndTime) " +
           "  OR (:endTime > w.scheduledStartTime AND :endTime <= w.scheduledEndTime) " +
           "  OR (:startTime <= w.scheduledStartTime AND :endTime >= w.scheduledEndTime)" +
           ")")
    List<WorkOrder> findOverlappingWorkOrders(
            @Param("technicianId") Long technicianId,
            @Param("scheduledDate") LocalDate scheduledDate,
            @Param("startTime") LocalTime startTime,
            @Param("endTime") LocalTime endTime,
            @Param("workOrderId") Long workOrderId
    );

    @Query("SELECT COUNT(w) FROM WorkOrder w WHERE w.status = :status")
    long countByStatus(@Param("status") WorkOrderStatus status);

    @Query("SELECT COUNT(w) FROM WorkOrder w WHERE w.assignedTechnician.id = :technicianId AND w.status IN ('ASSIGNED', 'ACCEPTED', 'IN_PROGRESS')")
    int countActiveJobsByTechnician(@Param("technicianId") Long technicianId);

    List<WorkOrder> findByAssignedTechnicianIdAndScheduledDate(Long technicianId, LocalDate scheduledDate);
}
