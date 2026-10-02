package com.fieldservice.field_service_backend.service;

import com.fieldservice.field_service_backend.config.SecurityUtils;
import com.fieldservice.field_service_backend.model.*;
import com.fieldservice.field_service_backend.repository.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Component
public class SeedDataService implements CommandLineRunner {

    private final UserRepository userRepository;
    private final CustomerRepository customerRepository;
    private final ServiceLocationRepository serviceLocationRepository;
    private final SkillRepository skillRepository;
    private final TechnicianRepository technicianRepository;
    private final ServiceCategoryRepository categoryRepository;
    private final ServiceTypeRepository typeRepository;
    private final ServiceRequestRepository requestRepository;
    private final WorkOrderRepository workOrderRepository;
    private final WorkOrderHistoryRepository historyRepository;
    private final PartRepository partRepository;
    private final InventoryTransactionRepository inventoryTransactionRepository;
    private final CustomerFeedbackRepository feedbackRepository;
    private final InAppNotificationRepository notificationRepository;
    private final AuditLogRepository auditLogRepository;

    @Value("${app.seed.enabled:true}")
    private boolean seedEnabled;

    public SeedDataService(UserRepository userRepository,
                           CustomerRepository customerRepository,
                           ServiceLocationRepository serviceLocationRepository,
                           SkillRepository skillRepository,
                           TechnicianRepository technicianRepository,
                           ServiceCategoryRepository categoryRepository,
                           ServiceTypeRepository typeRepository,
                           ServiceRequestRepository requestRepository,
                           WorkOrderRepository workOrderRepository,
                           WorkOrderHistoryRepository historyRepository,
                           WorkOrderPhotoRepository photoRepository,
                           PartRepository partRepository,
                           InventoryTransactionRepository inventoryTransactionRepository,
                           WorkOrderPartRepository workOrderPartRepository,
                           CustomerFeedbackRepository feedbackRepository,
                           InAppNotificationRepository notificationRepository,
                           AuditLogRepository auditLogRepository) {
        this.userRepository = userRepository;
        this.customerRepository = customerRepository;
        this.serviceLocationRepository = serviceLocationRepository;
        this.skillRepository = skillRepository;
        this.technicianRepository = technicianRepository;
        this.categoryRepository = categoryRepository;
        this.typeRepository = typeRepository;
        this.requestRepository = requestRepository;
        this.workOrderRepository = workOrderRepository;
        this.historyRepository = historyRepository;
        this.partRepository = partRepository;
        this.inventoryTransactionRepository = inventoryTransactionRepository;
        this.feedbackRepository = feedbackRepository;
        this.notificationRepository = notificationRepository;
        this.auditLogRepository = auditLogRepository;
    }

    @Override
    @Transactional
    public void run(String... args) {
        seedAll(false);
    }

    @Transactional
    public void seedAll(boolean force) {
        if (!seedEnabled && !force) {
            System.out.println(">>> Seed data is disabled (app.seed.enabled=false). Skipping startup seed.");
            return;
        }

        System.out.println(">>> Checking & Initializing FieldHub Production Master & Seed Data (Idempotent, force=" + force + ")...");

        // 1. Core Master Skills
        Skill sElec = findOrCreateSkill("Electrical Engineering", "Wiring, Circuit breakers, Load testing, Switchboards", "Electrical");
        Skill sAC = findOrCreateSkill("Air Conditioning & HVAC", "HVAC Diagnostics, Gas charging, Coil cleaning, Inverter PCB", "HVAC");
        Skill sPlumb = findOrCreateSkill("Plumbing & Drainage", "Pipe fittings, Pressure pumps, Leak detection, Tank cleaning", "Plumbing");
        Skill sApp = findOrCreateSkill("Appliance Repair", "Washing machines, Refrigerators, Microwaves, Water heaters", "Appliance");
        Skill sMaint = findOrCreateSkill("Home Maintenance", "Painting, Carpentry, Door repairs, General maintenance", "General");
        Skill sCCTV = findOrCreateSkill("CCTV & Security", "IP camera configuration, DVR/NVR setup, Smart security", "Security");
        Skill sNet = findOrCreateSkill("Networking & Fiber", "Router configuration, WiFi mesh setup, LAN cabling", "IT");
        Skill sSolar = findOrCreateSkill("Solar Inverters & Panels", "PV array installation, Inverter diagnostics", "Renewable");

        // 2. Service Catalog: Categories & Service Types
        // Category 1: Electrical
        ServiceCategory catElec = findOrCreateCategory("Electrical", "ELECTRICAL", "Zap", "Wiring, switchboards, MCB repair, lighting, and fan installations");
        findOrCreateServiceType(catElec, "Electrical Inspection", "ELEC_INSPECT", 1.5, 499.0, "Comprehensive home wiring, load balancing, and earthing inspection");
        findOrCreateServiceType(catElec, "Wiring Repair", "ELEC_WIRING", 2.0, 799.0, "Short circuit troubleshooting and concealed wiring replacement");
        findOrCreateServiceType(catElec, "Switch & Socket Repair", "ELEC_SWITCH", 1.0, 299.0, "Replacement and repair of modular switches, plugs, and 16A sockets");
        findOrCreateServiceType(catElec, "Fan Installation", "ELEC_FAN", 1.0, 349.0, "Ceiling fan, exhaust fan assembly, balancing and fitting");
        findOrCreateServiceType(catElec, "Lighting Repair", "ELEC_LIGHT", 1.0, 249.0, "LED panel lights, chandelier, cove lighting repair and fitting");

        // Category 2: Air Conditioning
        ServiceCategory catAC = findOrCreateCategory("Air Conditioning", "AC_REPAIR", "Wind", "AC servicing, deep cleaning, gas recharge, installation and repairs");
        findOrCreateServiceType(catAC, "AC General Service", "AC_CLEAN", 1.5, 599.0, "High pressure jet pump cleaning of indoor filter, outdoor unit and drain tray");
        findOrCreateServiceType(catAC, "AC Repair", "AC_REPAIR_TYPE", 2.0, 899.0, "Cooling breakdown diagnosis, PCB board repair, and sensor replacement");
        findOrCreateServiceType(catAC, "AC Installation", "AC_INSTALL", 3.0, 1799.0, "Complete split/inverter AC installation with vacuuming and copper piping");
        findOrCreateServiceType(catAC, "Gas Refill", "AC_GAS", 2.0, 2499.0, "Nitrogen leak testing followed by 100% genuine R32 / R410A gas top-up");
        findOrCreateServiceType(catAC, "AC Maintenance", "AC_MAINT", 2.0, 1199.0, "Comprehensive multi-point preventive maintenance and power consumption check");

        // Category 3: Plumbing
        ServiceCategory catPlumb = findOrCreateCategory("Plumbing", "PLUMBING", "Wrench", "Pipe leakages, water pumps, bathroom fixtures, and drainage repair");
        findOrCreateServiceType(catPlumb, "Pipe Leakage Repair", "PLUMB_LEAK", 1.5, 549.0, "Concealed wall pipe leak detection, CPVC/UPVC joint patching");
        findOrCreateServiceType(catPlumb, "Tap Repair", "PLUMB_TAP", 0.5, 199.0, "Dripping mixer tap, angle valve and spindle cartridge replacement");
        findOrCreateServiceType(catPlumb, "Bathroom Plumbing", "PLUMB_BATH", 2.0, 849.0, "Flush tank overhaul, shower head fitting and sanitary ware installation");
        findOrCreateServiceType(catPlumb, "Water Tank Service", "PLUMB_TANK", 2.5, 1299.0, "Overhead and underground water tank deep scrub, UV sanitization and sludge removal");
        findOrCreateServiceType(catPlumb, "Drainage Repair", "PLUMB_DRAIN", 1.5, 649.0, "Sink, floor trap, and sewage pipeline blockage clearance using mechanical snake");

        // Category 4: Appliance
        ServiceCategory catApp = findOrCreateCategory("Appliance", "APPLIANCE", "Cpu", "Major home and kitchen electrical appliance repair and maintenance");
        findOrCreateServiceType(catApp, "Washing Machine Repair", "APP_WASH", 2.0, 699.0, "Front load / top load drum vibration, motor belt and drain pump repair");
        findOrCreateServiceType(catApp, "Refrigerator Repair", "APP_FRIDGE", 2.0, 799.0, "Frost-free fridge cooling issue, thermostat, defrost timer and compressor fix");
        findOrCreateServiceType(catApp, "Microwave Repair", "APP_MICROWAVE", 1.5, 599.0, "Magnetron heating failure, touch membrane panel, turntable motor repair");
        findOrCreateServiceType(catApp, "Water Heater Repair", "APP_GEYSER", 1.5, 549.0, "Geyser heating element replacement, thermostat calibration and pressure valve fix");

        // Category 5: Home Maintenance
        ServiceCategory catMaint = findOrCreateCategory("Home Maintenance", "HOME_MAINT", "Hammer", "Painting, carpentry, door fittings, and general property maintenance");
        findOrCreateServiceType(catMaint, "Painting Service", "MAINT_PAINT", 4.0, 2499.0, "Interior / exterior wall touch-up, anti-damp waterproofing primer application");
        findOrCreateServiceType(catMaint, "Carpentry", "MAINT_CARP", 2.0, 749.0, "Wardrobe channel repair, modular kitchen hinge adjustment and woodwork");
        findOrCreateServiceType(catMaint, "Door Repair", "MAINT_DOOR", 1.5, 499.0, "Lock repair, handle replacement, sliding door alignment and weatherstripping");
        findOrCreateServiceType(catMaint, "General Maintenance", "MAINT_GENERAL", 3.0, 1499.0, "Multi-point home checkup covering fixtures, screws, caulking, and seals");

        // 3. Administrator Accounts
        User adminFieldHub = findOrCreateUser("administrator@fieldhub.com", "FieldHub@Admin2026", "System Administrator", "+91 9876543210", Role.ADMINISTRATOR);
        User adminLegacy = findOrCreateUser("admin@fieldservice.com", "admin123", "Senthil Nathan", "+91 9876543211", Role.ADMINISTRATOR);

        // 4. Dispatcher Accounts
        User dispFieldHub = findOrCreateUser("dispatcher.demo@fieldhub.com", "FieldHub@Dispatcher2026", "Suresh Kumar", "+91 98400 11223", Role.DISPATCHER);
        User dispLegacy = findOrCreateUser("dispatcher@fieldservice.com", "disp123", "Deepa Jayaram", "+91 98400 11224", Role.DISPATCHER);

        // 5. Technician Accounts & Fleets
        User techUserFieldHub = findOrCreateUser("technician.demo@fieldhub.com", "FieldHub@Tech2026", "Vignesh Kumar", "+91 98401 55667", Role.TECHNICIAN);
        Technician techVignesh = findOrCreateTechnician(techUserFieldHub, "TECH-100", "HVAC & Electrical", 5, 4.9, 45, Set.of(sAC, sElec));

        User techUserKarthik = findOrCreateUser("karthik.rajan@fieldservice.com", "tech123", "Karthik Rajan", "+91 98401 22334", Role.TECHNICIAN);
        Technician techKarthik = findOrCreateTechnician(techUserKarthik, "TECH-101", "HVAC & Electrical", 8, 4.9, 42, Set.of(sAC, sElec));

        User techUserSuresh = findOrCreateUser("suresh.raman@fieldservice.com", "tech123", "Suresh Raman", "+91 98402 33445", Role.TECHNICIAN);
        Technician techSuresh = findOrCreateTechnician(techUserSuresh, "TECH-102", "Solar & Electrical", 6, 4.8, 38, Set.of(sSolar, sElec));

        User techUserSaravanan = findOrCreateUser("saravanan.n@fieldservice.com", "tech123", "Saravanan Natarajan", "+91 98403 44556", Role.TECHNICIAN);
        Technician techSaravanan = findOrCreateTechnician(techUserSaravanan, "TECH-103", "IT & Security Systems", 4, 4.7, 29, Set.of(sCCTV, sNet));

        User techUserDinesh = findOrCreateUser("dinesh.kumar@fieldservice.com", "tech123", "Dinesh Kumar", "+91 98404 55667", Role.TECHNICIAN);
        Technician techDinesh = findOrCreateTechnician(techUserDinesh, "TECH-104", "Plumbing & Mechanical", 5, 4.9, 35, Set.of(sPlumb));

        User techUserPraveen = findOrCreateUser("praveen.c@fieldservice.com", "tech123", "Praveen Chandran", "+91 98405 66778", Role.TECHNICIAN);
        Technician techPraveen = findOrCreateTechnician(techUserPraveen, "TECH-105", "HVAC & Appliances", 3, 5.0, 18, Set.of(sAC, sApp));

        User techUserSrinath = findOrCreateUser("srinath123@gmail.com", "tech123", "Srinath", "+91 98406 77889", Role.TECHNICIAN);
        Technician techSrinath = findOrCreateTechnician(techUserSrinath, "TECH-106", "Electrical & HVAC", 4, 4.9, 15, Set.of(sElec, sAC));

        // 6. Tamil Nadu Fictional Demo Customers & Locations
        User custUser1 = findOrCreateUser("aravind.kumar@fieldhub.com", "Customer@123", "Aravind Kumar", "+91 98411 55667", Role.CUSTOMER);
        Customer cust1 = findOrCreateCustomer(custUser1, "Kumar Retail & Commercials", "COMMERCIAL", "+91 98411 55667", "Priority Client - Chennai");
        ServiceLocation loc1 = findOrCreateLocation(cust1, "Headquarters & Residence", "No. 42, 2nd Avenue", "Anna Nagar", "Chennai", "Tamil Nadu", "600040", "Aravind Kumar", "+91 98411 55667", LocationType.RESIDENTIAL, true);
        ServiceLocation loc1b = findOrCreateLocation(cust1, "Commercial Facility", "Module 403, Tidel Park", "Taramani", "Chennai", "Tamil Nadu", "600113", "Aravind Kumar", "+91 98411 55688", LocationType.COMMERCIAL, false);

        User custUser2 = findOrCreateUser("karthik.raj@fieldhub.com", "Customer@123", "Karthik Raj", "+91 98412 66778", Role.CUSTOMER);
        Customer cust2 = findOrCreateCustomer(custUser2, "Raj Tex & Apparels", "COMMERCIAL", "+91 98412 66778", "Commercial Client - Salem");
        ServiceLocation loc2 = findOrCreateLocation(cust2, "Showroom & Residence", "Plot 15, Fairlands Main Road", "Fairlands", "Salem", "Tamil Nadu", "636016", "Karthik Raj", "+91 98412 66778", LocationType.COMMERCIAL, true);

        User custUser3 = findOrCreateUser("praveen.kumar@fieldhub.com", "Customer@123", "Praveen Kumar", "+91 98413 77889", Role.CUSTOMER);
        Customer cust3 = findOrCreateCustomer(custUser3, "Coimbatore Precision Tech", "COMMERCIAL", "+91 98413 77889", "Corporate Client - Coimbatore");
        ServiceLocation loc3 = findOrCreateLocation(cust3, "Main Office", "No. 88, DB Road", "RS Puram", "Coimbatore", "Tamil Nadu", "641002", "Praveen Kumar", "+91 98413 77889", LocationType.OFFICE, true);

        User custUser4 = findOrCreateUser("suresh.babu@fieldhub.com", "Customer@123", "Suresh Babu", "+91 98414 88990", Role.CUSTOMER);
        Customer cust4 = findOrCreateCustomer(custUser4, "Babu Supermarkets", "COMMERCIAL", "+91 98414 88990", "Retail Client - Madurai");
        ServiceLocation loc4 = findOrCreateLocation(cust4, "Store Location", "No. 12, 80 Feet Road", "KK Nagar", "Madurai", "Tamil Nadu", "625020", "Suresh Babu", "+91 98414 88990", LocationType.COMMERCIAL, true);

        User custUser5 = findOrCreateUser("arun.prakash@fieldhub.com", "Customer@123", "Arun Prakash", "+91 98415 11223", Role.CUSTOMER);
        Customer cust5 = findOrCreateCustomer(custUser5, "Prakash Enterprises", "RESIDENTIAL", "+91 98415 11223", "Residential Client - Tiruchirappalli");
        ServiceLocation loc5 = findOrCreateLocation(cust5, "Primary Residence", "No. 24, Main Road", "Thillai Nagar", "Tiruchirappalli", "Tamil Nadu", "620018", "Arun Prakash", "+91 98415 11223", LocationType.RESIDENTIAL, true);

        User custUser6 = findOrCreateUser("santhosh.kumar@fieldhub.com", "Customer@123", "Santhosh Kumar", "+91 98416 22334", Role.CUSTOMER);
        Customer cust6 = findOrCreateCustomer(custUser6, "Perundurai Goods Corp", "COMMERCIAL", "+91 98416 22334", "Commercial Client - Erode");
        ServiceLocation loc6 = findOrCreateLocation(cust6, "Warehouse Outlet", "No. 55, Brough Road", "Perundurai Road", "Erode", "Tamil Nadu", "638001", "Santhosh Kumar", "+91 98416 22334", LocationType.COMMERCIAL, true);

        User custUser7 = findOrCreateUser("dinesh.raj@fieldhub.com", "Customer@123", "Dinesh Raj", "+91 98417 33445", Role.CUSTOMER);
        Customer cust7 = findOrCreateCustomer(custUser7, "Tiruppur Knitwear Exports", "COMMERCIAL", "+91 98417 33445", "Manufacturing Client - Tiruppur");
        ServiceLocation loc7 = findOrCreateLocation(cust7, "Factory Unit", "No. 101, Avinashi Road", "Kumaran Nagar", "Tiruppur", "Tamil Nadu", "641602", "Dinesh Raj", "+91 98417 33445", LocationType.COMMERCIAL, true);

        User custUser8 = findOrCreateUser("priya.devi@fieldhub.com", "Customer@123", "Priya Devi", "+91 98418 44556", Role.CUSTOMER);
        Customer cust8 = findOrCreateCustomer(custUser8, "Namakkal Poultry Tech", "COMMERCIAL", "+91 98418 44556", "Commercial Client - Namakkal");
        ServiceLocation loc8 = findOrCreateLocation(cust8, "Farm Headquarters", "No. 33, Mohanur Road", "Paramathi Road", "Namakkal", "Tamil Nadu", "637001", "Priya Devi", "+91 98418 44556", LocationType.COMMERCIAL, true);

        User custUser9 = findOrCreateUser("divya.lakshmi@fieldhub.com", "Customer@123", "Divya Lakshmi", "+91 98419 55667", Role.CUSTOMER);
        Customer cust9 = findOrCreateCustomer(custUser9, "Hosur Auto Systems", "COMMERCIAL", "+91 98419 55667", "Industrial Client - Hosur");
        ServiceLocation loc9 = findOrCreateLocation(cust9, "Manufacturing Plant", "No. 7, Sipcot Phase 1", "Bagalur Road", "Hosur", "Tamil Nadu", "635126", "Divya Lakshmi", "+91 98419 55667", LocationType.COMMERCIAL, true);

        User custUser10 = findOrCreateUser("keerthana.s@fieldhub.com", "Customer@123", "Keerthana S", "+91 98420 66778", Role.CUSTOMER);
        Customer cust10 = findOrCreateCustomer(custUser10, "Katpadi IT Solutions", "RESIDENTIAL", "+91 98420 66778", "Residential Client - Vellore");
        ServiceLocation loc10 = findOrCreateLocation(cust10, "Home Villa", "No. 19, Gandhi Road", "Katpadi", "Vellore", "Tamil Nadu", "632014", "Keerthana S", "+91 98420 66778", LocationType.RESIDENTIAL, true);

        // Keep legacy test customer accounts updated
        User custUserLegacy = findOrCreateUser("anand.murugan@gmail.com", "customer123", "Anand Murugan", "+91 98411 55667", Role.CUSTOMER);
        Customer custLegacy = findOrCreateCustomer(custUserLegacy, "Murugan Agencies", "COMMERCIAL", "+91 98411 55667", "Commercial Client - Chennai");
        findOrCreateLocation(custLegacy, "Chennai Central Office", "No. 42, 2nd Avenue", "Anna Nagar", "Chennai", "Tamil Nadu", "600040", "Anand Murugan", "+91 98411 55667", LocationType.RESIDENTIAL, true);

        // 7. Parts & Inventory Catalog
        findOrCreatePart("1.5 Ton AC Capacitor 45uF", "HVAC", "CAP-AC-45", 28, 5, "pcs", 320.0, "Carrier Spares Chennai", "Warehouse Bay A-1");
        findOrCreatePart("R32 Eco Refrigerant Gas (10kg)", "HVAC", "GAS-R32-10", 12, 3, "cylinders", 4200.0, "Fluorochem Dist. Salem", "Gas Cylinder Bay");
        findOrCreatePart("Siemens 32A Double Pole MCB", "Electrical", "MCB-SIE-32", 45, 10, "pcs", 450.0, "Siemens Direct Coimbatore", "Rack E-3");
        findOrCreatePart("Brass Heavy Ball Valve 1/2\"", "Plumbing", "VAL-BRASS-05", 35, 8, "pcs", 240.0, "Jaguar Spares Madurai", "Bin P-4");
        findOrCreatePart("Heavy Duty Ceiling Fan Regulator", "Electrical", "REG-FAN-HD", 30, 6, "pcs", 180.0, "Anchor Electricals Trichy", "Shelf E-1");
        findOrCreatePart("CPVC Concealed Stop Cock 20mm", "Plumbing", "VLV-CPVC-20", 25, 5, "pcs", 380.0, "Supreme Pipes Erode", "Bin P-2");
        findOrCreatePart("Washing Machine Drain Pump Motor", "Appliance", "MOT-WASH-DP", 14, 4, "pcs", 650.0, "IFB Spares Tiruppur", "Shelf A-4");
        findOrCreatePart("Refrigerator Defrost Thermostat", "Appliance", "THM-FRIDGE-DF", 18, 5, "pcs", 320.0, "Godrej Components Salem", "Shelf A-2");
        findOrCreatePart("Geyser 2000W Heating Element Copper", "Appliance", "ELM-GEY-2000", 20, 5, "pcs", 580.0, "Racold Spares Chennai", "Shelf G-1");
        findOrCreatePart("Premium Anti-Fungal Wall Putty 20kg", "Maintenance", "PTY-WALL-20K", 15, 4, "bags", 750.0, "Asian Paints Hosur", "Paint Storage Bay");

        // 8. Sample Service Requests & Work Orders
        seedSampleRequestsAndWorkOrders(cust1, loc1, cust2, loc2, cust3, loc3, cust4, loc4,
                catAC, catElec, catPlumb, catApp, catMaint,
                techVignesh, techKarthik, techSrinath, dispFieldHub);

        // 9. In-App Notifications
        findOrCreateNotification(custUser1, "Welcome to FieldHub", "Your account is verified. You can book verified technicians across Tamil Nadu.", NotificationType.SYSTEM, "/customer/dashboard");
        findOrCreateNotification(techUserFieldHub, "New Work Order Assigned", "You have been assigned to service request at Anna Nagar, Chennai.", NotificationType.ASSIGNMENT, "/technician/jobs");
        findOrCreateNotification(adminFieldHub, "Low Stock Alert: R32 Refrigerant Gas", "R32 gas cylinder stock is nearing reorder threshold.", NotificationType.LOW_STOCK, "/admin/inventory");

        // 10. Audit Log
        auditLogRepository.save(new AuditLog("administrator@fieldhub.com", "ADMINISTRATOR", "SYSTEM_BOOTSTRAP", "System", "1", "Initialized and verified FieldHub Tamil Nadu master catalog and demo seed data", "127.0.0.1"));

        System.out.println(">>> FieldHub Production Master & Seed Data Initialized Successfully!");
    }

    private Skill findOrCreateSkill(String name, String desc, String category) {
        return skillRepository.findByName(name).orElseGet(() ->
                skillRepository.save(new Skill(name, desc, category))
        );
    }

    private ServiceCategory findOrCreateCategory(String name, String code, String icon, String desc) {
        return categoryRepository.findByCode(code).orElseGet(() ->
                categoryRepository.save(new ServiceCategory(name, code, icon, desc))
        );
    }

    private ServiceType findOrCreateServiceType(ServiceCategory category, String name, String code, double duration, double price, String desc) {
        return typeRepository.findByCode(code).orElseGet(() ->
                typeRepository.save(new ServiceType(category, name, code, duration, price, desc))
        );
    }

    private User findOrCreateUser(String email, String rawPassword, String fullName, String phone, Role role) {
        String normalizedEmail = email.toLowerCase().trim();
        return userRepository.findByEmail(normalizedEmail).map(existing -> {
            existing.setFullName(fullName);
            existing.setPhoneNumber(phone);
            existing.setRole(role);
            existing.setPassword(SecurityUtils.hashPassword(rawPassword));
            return userRepository.save(existing);
        }).orElseGet(() -> {
            User u = new User(normalizedEmail, SecurityUtils.hashPassword(rawPassword), fullName, phone, role);
            return userRepository.save(u);
        });
    }

    private Technician findOrCreateTechnician(User user, String code, String dept, int exp, double rating, int jobs, Set<Skill> skills) {
        return technicianRepository.findByUser(user).map(existing -> {
            existing.setEmployeeCode(code);
            existing.setDepartment(dept);
            existing.setExperienceYears(exp);
            existing.setAverageRating(rating);
            existing.setCompletedJobsCount(jobs);
            existing.setSkills(new HashSet<>(skills));
            existing.setStatus(TechnicianStatus.ACTIVE);
            existing.setAvailability(TechnicianAvailability.AVAILABLE);
            return technicianRepository.save(existing);
        }).orElseGet(() -> {
            Technician t = new Technician(user, code, dept, exp);
            t.setAverageRating(rating);
            t.setCompletedJobsCount(jobs);
            t.setSkills(new HashSet<>(skills));
            t.setAvailability(TechnicianAvailability.AVAILABLE);
            t.setStatus(TechnicianStatus.ACTIVE);
            return technicianRepository.save(t);
        });
    }

    private Customer findOrCreateCustomer(User user, String companyName, String customerType, String altPhone, String notes) {
        return customerRepository.findByUser(user).map(existing -> {
            existing.setCompanyName(companyName);
            existing.setCustomerType(customerType);
            existing.setAlternatePhone(altPhone);
            existing.setNotes(notes);
            return customerRepository.save(existing);
        }).orElseGet(() ->
                customerRepository.save(new Customer(user, companyName, customerType, altPhone, notes))
        );
    }

    private ServiceLocation findOrCreateLocation(Customer cust, String name, String address, String area, String city, String state, String postal, String person, String phone, LocationType type, boolean def) {
        List<ServiceLocation> existingLocs = serviceLocationRepository.findByCustomerId(cust.getId());
        for (ServiceLocation loc : existingLocs) {
            if (loc.getLocationName().equalsIgnoreCase(name)) {
                loc.setAddress(address);
                loc.setArea(area);
                loc.setCity(city);
                loc.setState(state);
                loc.setPostalCode(postal);
                loc.setContactPerson(person);
                loc.setContactPhone(phone);
                loc.setLocationType(type);
                loc.setDefaultLocation(def);
                loc.setActive(true);
                return serviceLocationRepository.save(loc);
            }
        }
        ServiceLocation loc = new ServiceLocation();
        loc.setCustomer(cust);
        loc.setLocationName(name);
        loc.setAddress(address);
        loc.setArea(area);
        loc.setCity(city);
        loc.setState(state);
        loc.setPostalCode(postal);
        loc.setContactPerson(person);
        loc.setContactPhone(phone);
        loc.setLocationType(type);
        loc.setDefaultLocation(def);
        loc.setActive(true);
        return serviceLocationRepository.save(loc);
    }

    private Part findOrCreatePart(String name, String cat, String sku, int qty, int min, String unit, double cost, String supplier, String location) {
        return partRepository.findBySku(sku).orElseGet(() -> {
            Part p = new Part(name, cat, sku, qty, min, unit, cost, supplier, location);
            p = partRepository.save(p);
            inventoryTransactionRepository.save(new InventoryTransaction(p, TransactionType.ADDED, qty, cost, "administrator@fieldhub.com", null, "Initial Seed Stock"));
            return p;
        });
    }

    private void findOrCreateNotification(User user, String title, String msg, NotificationType type, String link) {
        List<InAppNotification> list = notificationRepository.findByUserIdOrderByCreatedAtDesc(user.getId());
        boolean exists = list.stream().anyMatch(n -> n.getTitle().equalsIgnoreCase(title));
        if (!exists) {
            notificationRepository.save(new InAppNotification(user, title, msg, type, link));
        }
    }

    private void seedSampleRequestsAndWorkOrders(Customer cust1, ServiceLocation loc1,
                                                 Customer cust2, ServiceLocation loc2,
                                                 Customer cust3, ServiceLocation loc3,
                                                 Customer cust4, ServiceLocation loc4,
                                                 ServiceCategory catAC, ServiceCategory catElec,
                                                 ServiceCategory catPlumb, ServiceCategory catApp,
                                                 ServiceCategory catMaint,
                                                 Technician techVignesh, Technician techKarthik,
                                                 Technician techSrinath, User dispatcher) {
        if (workOrderRepository.count() > 0) {
            return;
        }

        // 1. Work Order: IN_PROGRESS (Assigned to Vignesh Kumar)
        ServiceRequest req1 = createRequest(cust1, loc1, catAC, "Split AC in master bedroom not cooling effectively. Airflow is weak.", Priority.HIGH, LocalDate.now(), "09:00 AM - 12:00 PM");
        WorkOrder wo1 = createWorkOrderRecord("WO-20261002-1001", req1, cust1, loc1, catAC,
                "Master Bedroom AC Cooling Diagnosis", req1.getProblemDescription(), Priority.HIGH,
                LocalDate.now(), LocalTime.of(9, 30), LocalTime.of(11, 30), techVignesh, dispatcher, WorkOrderStatus.IN_PROGRESS);
        wo1.setStartedAt(LocalDateTime.now().minusHours(1));
        wo1.setWorkPerformed("Indoor coil blocked with dust. Low refrigerant pressure detected.");
        workOrderRepository.save(wo1);

        // 2. Work Order: CLOSED / COMPLETED (Completed by Karthik Rajan)
        ServiceRequest req2 = createRequest(cust2, loc2, catElec, "Main MCB tripping repeatedly under load in Salem showroom.", Priority.CRITICAL, LocalDate.now().minusDays(1), "02:00 PM - 04:00 PM");
        WorkOrder wo2 = createWorkOrderRecord("WO-20261001-1002", req2, cust2, loc2, catElec,
                "Main MCB Distribution Box Replacement", req2.getProblemDescription(), Priority.CRITICAL,
                LocalDate.now().minusDays(1), LocalTime.of(14, 0), LocalTime.of(15, 30), techKarthik, dispatcher, WorkOrderStatus.CLOSED);
        wo2.setStartedAt(LocalDateTime.now().minusDays(1).withHour(14).withMinute(0));
        wo2.setCompletedAt(LocalDateTime.now().minusDays(1).withHour(15).withMinute(15));
        wo2.setVerifiedAt(LocalDateTime.now().minusDays(1).withHour(16).withMinute(0));
        wo2.setClosedAt(LocalDateTime.now().minusDays(1).withHour(16).withMinute(0));
        wo2.setWorkPerformed("Replaced faulty 32A MCB with Siemens 32A DP MCB. Balanced phase loads across phases.");
        wo2.setTotalAmount(1250.0);
        wo2.setAmountPaid(1250.0);
        workOrderRepository.save(wo2);

        CustomerFeedback fb = new CustomerFeedback(wo2, cust2, 5, "Prompt emergency electrical restoration in Salem!", "EXCELLENT");
        feedbackRepository.save(fb);

        // 3. Work Order: ASSIGNED (Scheduled for Srinath)
        ServiceRequest req3 = createRequest(cust3, loc3, catPlumb, "Underground pipe joint leak near pump room in Coimbatore.", Priority.MEDIUM, LocalDate.now().plusDays(1), "10:00 AM - 01:00 PM");
        createWorkOrderRecord("WO-20261003-1003", req3, cust3, loc3, catPlumb,
                "Pump Room Pipe Joint Leak Repair", req3.getProblemDescription(), Priority.MEDIUM,
                LocalDate.now().plusDays(1), LocalTime.of(10, 0), LocalTime.of(12, 30), techSrinath, dispatcher, WorkOrderStatus.ASSIGNED);

        // 4. Service Request: REQUESTED / PENDING (Awaiting Dispatcher Assignment)
        createRequest(cust4, loc4, catApp, "Front-load washing machine displaying drain error code E03 in Madurai store.", Priority.HIGH, LocalDate.now().plusDays(1), "03:00 PM - 06:00 PM");
    }

    private ServiceRequest createRequest(Customer cust, ServiceLocation loc, ServiceCategory cat, String desc, Priority prio, LocalDate prefDate, String timeSlot) {
        ServiceRequest req = new ServiceRequest();
        req.setRequestNumber("REQ-" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd")) + "-" + (1000 + (int)(Math.random() * 9000)));
        req.setCustomer(cust);
        req.setServiceLocation(loc);
        req.setServiceCategory(cat);
        req.setProblemDescription(desc);
        req.setPriority(prio);
        req.setPreferredDate(prefDate);
        req.setPreferredTimeSlot(timeSlot);
        req.setStatus(RequestStatus.REQUESTED);
        req.setRequestDate(LocalDateTime.now());
        return requestRepository.save(req);
    }

    private WorkOrder createWorkOrderRecord(String woNumber, ServiceRequest req, Customer cust, ServiceLocation loc, ServiceCategory cat,
                                           String title, String desc, Priority prio, LocalDate date, LocalTime start, LocalTime end,
                                           Technician tech, User disp, WorkOrderStatus status) {
        WorkOrder wo = new WorkOrder();
        wo.setWorkOrderNumber(woNumber);
        wo.setServiceRequest(req);
        wo.setCustomer(cust);
        wo.setServiceLocation(loc);
        wo.setServiceCategory(cat);
        wo.setTitle(title);
        wo.setDescription(desc);
        wo.setPriority(prio);
        wo.setScheduledDate(date);
        wo.setScheduledStartTime(start);
        wo.setScheduledEndTime(end);
        wo.setAssignedTechnician(tech);
        wo.setDispatcher(disp);
        wo.setStatus(status);
        wo.setResponseDueTime(LocalDateTime.now().plusHours(4));
        wo.setResolutionDueTime(LocalDateTime.now().plusHours(12));
        wo.setSlaStatus(SlaStatus.WITHIN_SLA);
        wo = workOrderRepository.save(wo);

        WorkOrderHistory history = new WorkOrderHistory(wo, null, status, disp.getEmail(), "Work Order Created");
        historyRepository.save(history);
        return wo;
    }
}
