package com.fieldservice.field_service_backend.dto;

public class ReviewPartRequestDTO {
    private String adminNotes;
    private boolean addStock = false;
    private Integer quantityToAdd;
    private Double unitCost;
    private String location;
    private String supplier;

    public ReviewPartRequestDTO() {}

    public String getAdminNotes() { return adminNotes; }
    public void setAdminNotes(String adminNotes) { this.adminNotes = adminNotes; }

    public boolean isAddStock() { return addStock; }
    public void setAddStock(boolean addStock) { this.addStock = addStock; }

    public Integer getQuantityToAdd() { return quantityToAdd; }
    public void setQuantityToAdd(Integer quantityToAdd) { this.quantityToAdd = quantityToAdd; }

    public Double getUnitCost() { return unitCost; }
    public void setUnitCost(Double unitCost) { this.unitCost = unitCost; }

    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }

    public String getSupplier() { return supplier; }
    public void setSupplier(String supplier) { this.supplier = supplier; }
}
