package com.fieldservice.field_service_backend.controller;

import com.fieldservice.field_service_backend.config.RequireRole;
import com.fieldservice.field_service_backend.dto.AnalyticsDTO;
import com.fieldservice.field_service_backend.dto.DashboardStatsDTO;
import com.fieldservice.field_service_backend.model.Role;
import com.fieldservice.field_service_backend.service.AnalyticsService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/analytics")
@RequireRole({Role.ADMINISTRATOR, Role.DISPATCHER})
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    public AnalyticsController(AnalyticsService analyticsService) {
        this.analyticsService = analyticsService;
    }

    @GetMapping("/dashboard")
    public ResponseEntity<DashboardStatsDTO> getDashboardStats() {
        return ResponseEntity.ok(analyticsService.getDashboardStats());
    }

    @GetMapping("/detailed")
    public ResponseEntity<AnalyticsDTO> getDetailedAnalytics() {
        return ResponseEntity.ok(analyticsService.getDetailedAnalytics());
    }
}
