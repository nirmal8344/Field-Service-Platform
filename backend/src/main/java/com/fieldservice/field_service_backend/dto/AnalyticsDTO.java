package com.fieldservice.field_service_backend.dto;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class AnalyticsDTO {
    private Map<String, Long> statusDistribution = new HashMap<>();
    private Map<String, Long> categoryDistribution = new HashMap<>();
    private Map<String, Long> priorityDistribution = new HashMap<>();
    private List<Map<String, Object>> dailyVolume = new ArrayList<>();
    private List<Map<String, Object>> technicianPerformance = new ArrayList<>();
    private double averageResolutionHours;
    private double onTimeCompletionRate;

    public AnalyticsDTO() {}

    public Map<String, Long> getStatusDistribution() { return statusDistribution; }
    public void setStatusDistribution(Map<String, Long> statusDistribution) { this.statusDistribution = statusDistribution; }

    public Map<String, Long> getCategoryDistribution() { return categoryDistribution; }
    public void setCategoryDistribution(Map<String, Long> categoryDistribution) { this.categoryDistribution = categoryDistribution; }

    public Map<String, Long> getPriorityDistribution() { return priorityDistribution; }
    public void setPriorityDistribution(Map<String, Long> priorityDistribution) { this.priorityDistribution = priorityDistribution; }

    public List<Map<String, Object>> getDailyVolume() { return dailyVolume; }
    public void setDailyVolume(List<Map<String, Object>> dailyVolume) { this.dailyVolume = dailyVolume; }

    public List<Map<String, Object>> getTechnicianPerformance() { return technicianPerformance; }
    public void setTechnicianPerformance(List<Map<String, Object>> technicianPerformance) { this.technicianPerformance = technicianPerformance; }

    public double getAverageResolutionHours() { return averageResolutionHours; }
    public void setAverageResolutionHours(double averageResolutionHours) { this.averageResolutionHours = averageResolutionHours; }

    public double getOnTimeCompletionRate() { return onTimeCompletionRate; }
    public void setOnTimeCompletionRate(double onTimeCompletionRate) { this.onTimeCompletionRate = onTimeCompletionRate; }
}
