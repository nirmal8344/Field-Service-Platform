package com.fieldservice.field_service_backend.dto;

import java.util.HashMap;
import java.util.Map;

public class DashboardStatsDTO {
    private long totalRequests;
    private long pendingRequests;
    private long totalWorkOrders;
    private long activeWorkOrders;
    private long completedWorkOrders;
    private long totalTechnicians;
    private long availableTechnicians;
    private long busyTechnicians;
    private long lowStockPartsCount;
    private long outOfStockPartsCount;
    private long slaBreachedCount;
    private long slaAtRiskCount;
    private double averageRating;
    private Map<String, Long> workOrdersByStatus = new HashMap<>();
    private Map<String, Long> workOrdersByCategory = new HashMap<>();

    public DashboardStatsDTO() {}

    public long getTotalRequests() { return totalRequests; }
    public void setTotalRequests(long totalRequests) { this.totalRequests = totalRequests; }

    public long getPendingRequests() { return pendingRequests; }
    public void setPendingRequests(long pendingRequests) { this.pendingRequests = pendingRequests; }

    public long getTotalWorkOrders() { return totalWorkOrders; }
    public void setTotalWorkOrders(long totalWorkOrders) { this.totalWorkOrders = totalWorkOrders; }

    public long getActiveWorkOrders() { return activeWorkOrders; }
    public void setActiveWorkOrders(long activeWorkOrders) { this.activeWorkOrders = activeWorkOrders; }

    public long getCompletedWorkOrders() { return completedWorkOrders; }
    public void setCompletedWorkOrders(long completedWorkOrders) { this.completedWorkOrders = completedWorkOrders; }

    public long getTotalTechnicians() { return totalTechnicians; }
    public void setTotalTechnicians(long totalTechnicians) { this.totalTechnicians = totalTechnicians; }

    public long getAvailableTechnicians() { return availableTechnicians; }
    public void setAvailableTechnicians(long availableTechnicians) { this.availableTechnicians = availableTechnicians; }

    public long getBusyTechnicians() { return busyTechnicians; }
    public void setBusyTechnicians(long busyTechnicians) { this.busyTechnicians = busyTechnicians; }

    public long getLowStockPartsCount() { return lowStockPartsCount; }
    public void setLowStockPartsCount(long lowStockPartsCount) { this.lowStockPartsCount = lowStockPartsCount; }

    public long getOutOfStockPartsCount() { return outOfStockPartsCount; }
    public void setOutOfStockPartsCount(long outOfStockPartsCount) { this.outOfStockPartsCount = outOfStockPartsCount; }

    public long getSlaBreachedCount() { return slaBreachedCount; }
    public void setSlaBreachedCount(long slaBreachedCount) { this.slaBreachedCount = slaBreachedCount; }

    public long getSlaAtRiskCount() { return slaAtRiskCount; }
    public void setSlaAtRiskCount(long slaAtRiskCount) { this.slaAtRiskCount = slaAtRiskCount; }

    public double getAverageRating() { return averageRating; }
    public void setAverageRating(double averageRating) { this.averageRating = averageRating; }

    public Map<String, Long> getWorkOrdersByStatus() { return workOrdersByStatus; }
    public void setWorkOrdersByStatus(Map<String, Long> workOrdersByStatus) { this.workOrdersByStatus = workOrdersByStatus; }

    public Map<String, Long> getWorkOrdersByCategory() { return workOrdersByCategory; }
    public void setWorkOrdersByCategory(Map<String, Long> workOrdersByCategory) { this.workOrdersByCategory = workOrdersByCategory; }
}
