package com.fieldservice.field_service_backend.dto;

import com.fieldservice.field_service_backend.model.TransactionType;
import jakarta.validation.constraints.NotNull;

public class InventoryAdjustmentDTO {

    @NotNull(message = "Transaction type is required")
    private TransactionType transactionType;

    @NotNull(message = "Quantity is required")
    private Integer quantity;

    private String reason;

    public InventoryAdjustmentDTO() {}

    public TransactionType getTransactionType() { return transactionType; }
    public void setTransactionType(TransactionType transactionType) { this.transactionType = transactionType; }

    public Integer getQuantity() { return quantity; }
    public void setQuantity(Integer quantity) { this.quantity = quantity; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
}
