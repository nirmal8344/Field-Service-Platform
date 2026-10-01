package com.fieldservice.field_service_backend.dto;

import java.util.List;

public class WorkOrderActionDTO {

    private String reason;
    private String workPerformed;
    private String notes;
    private Double totalAmount;
    private Double amountPaid;
    private List<PartUsageDTO> partsUsed;
    private List<String> photoUrls;
    private Integer rating;
    private String feedbackText;

    public WorkOrderActionDTO() {}

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public String getWorkPerformed() { return workPerformed; }
    public void setWorkPerformed(String workPerformed) { this.workPerformed = workPerformed; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public Double getTotalAmount() { return totalAmount; }
    public void setTotalAmount(Double totalAmount) { this.totalAmount = totalAmount; }

    public Double getAmountPaid() { return amountPaid; }
    public void setAmountPaid(Double amountPaid) { this.amountPaid = amountPaid; }

    public List<PartUsageDTO> getPartsUsed() { return partsUsed; }
    public void setPartsUsed(List<PartUsageDTO> partsUsed) { this.partsUsed = partsUsed; }

    public List<String> getPhotoUrls() { return photoUrls; }
    public void setPhotoUrls(List<String> photoUrls) { this.photoUrls = photoUrls; }

    public Integer getRating() { return rating; }
    public void setRating(Integer rating) { this.rating = rating; }

    public String getFeedbackText() { return feedbackText; }
    public void setFeedbackText(String feedbackText) { this.feedbackText = feedbackText; }
}
