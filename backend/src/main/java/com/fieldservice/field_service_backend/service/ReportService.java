package com.fieldservice.field_service_backend.service;

import com.fieldservice.field_service_backend.model.Part;
import com.fieldservice.field_service_backend.model.Technician;
import com.fieldservice.field_service_backend.model.WorkOrder;
import com.fieldservice.field_service_backend.repository.PartRepository;
import com.fieldservice.field_service_backend.repository.TechnicianRepository;
import com.fieldservice.field_service_backend.repository.WorkOrderRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ReportService {

    private final WorkOrderRepository workOrderRepository;
    private final TechnicianRepository technicianRepository;
    private final PartRepository partRepository;

    public ReportService(WorkOrderRepository workOrderRepository,
                         TechnicianRepository technicianRepository,
                         PartRepository partRepository) {
        this.workOrderRepository = workOrderRepository;
        this.technicianRepository = technicianRepository;
        this.partRepository = partRepository;
    }

    public String exportWorkOrdersCSV() {
        List<WorkOrder> list = workOrderRepository.findAllByOrderByCreatedAtDesc();
        StringBuilder sb = new StringBuilder();
        sb.append("Work Order ID,Title,Category,Customer,Technician,Status,Priority,Scheduled Date,Total Amount,Created At\n");
        for (WorkOrder w : list) {
            sb.append(escape(w.getWorkOrderNumber())).append(",")
              .append(escape(w.getTitle())).append(",")
              .append(escape(w.getServiceCategory() != null ? w.getServiceCategory().getName() : "")).append(",")
              .append(escape(w.getCustomer() != null && w.getCustomer().getUser() != null ? w.getCustomer().getUser().getFullName() : "")).append(",")
              .append(escape(w.getAssignedTechnician() != null && w.getAssignedTechnician().getUser() != null ? w.getAssignedTechnician().getUser().getFullName() : "Unassigned")).append(",")
              .append(escape(w.getStatus().name())).append(",")
              .append(escape(w.getPriority().name())).append(",")
              .append(escape(w.getScheduledDate() != null ? w.getScheduledDate().toString() : "Not scheduled")).append(",")
              .append(w.getTotalAmount() != null ? w.getTotalAmount() : 0.0).append(",")
              .append(escape(w.getCreatedAt() != null ? w.getCreatedAt().toString() : "")).append("\n");
        }
        return sb.toString();
    }

    public String exportTechniciansCSV() {
        List<Technician> list = technicianRepository.findAll();
        StringBuilder sb = new StringBuilder();
        sb.append("Employee Code,Name,Email,Phone,Department,Experience,Availability,Status,Rating,Completed Jobs\n");
        for (Technician t : list) {
            sb.append(escape(t.getEmployeeCode())).append(",")
              .append(escape(t.getUser() != null ? t.getUser().getFullName() : "")).append(",")
              .append(escape(t.getUser() != null ? t.getUser().getEmail() : "")).append(",")
              .append(escape(t.getUser() != null ? t.getUser().getPhoneNumber() : "")).append(",")
              .append(escape(t.getDepartment())).append(",")
              .append(t.getExperienceYears()).append(",")
              .append(escape(t.getAvailability().name())).append(",")
              .append(escape(t.getStatus().name())).append(",")
              .append(t.getAverageRating()).append(",")
              .append(t.getCompletedJobsCount()).append("\n");
        }
        return sb.toString();
    }

    public String exportInventoryCSV() {
        List<Part> list = partRepository.findAll();
        StringBuilder sb = new StringBuilder();
        sb.append("SKU,Part Name,Category,Quantity,Min Stock,Unit,Unit Cost,Supplier,Location,Status\n");
        for (Part p : list) {
            sb.append(escape(p.getSku())).append(",")
              .append(escape(p.getPartName())).append(",")
              .append(escape(p.getCategory())).append(",")
              .append(p.getQuantity()).append(",")
              .append(p.getMinimumStock()).append(",")
              .append(escape(p.getUnit())).append(",")
              .append(p.getCost()).append(",")
              .append(escape(p.getSupplier())).append(",")
              .append(escape(p.getLocation())).append(",")
              .append(escape(p.getStatus().name())).append("\n");
        }
        return sb.toString();
    }

    private String escape(String val) {
        if (val == null) return "";
        return "\"" + val.replace("\"", "\"\"") + "\"";
    }
}
