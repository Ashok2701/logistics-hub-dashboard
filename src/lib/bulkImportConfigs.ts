// Shared bulk-import configuration (columns, row parsing/validation,
// create-or-update logic) for the three Fleet entities. Used by both the
// per-page "Bulk Import" button (Vehicles.tsx/Drivers.tsx/
// VehicleCategories.tsx) and the dedicated Bulk Activity page
// (src/pages/fleet/BulkActivity.tsx), so both stay in sync automatically.
import {
  vehicleApi, vehicleCategoryApi, driverApi,
  type Vehicle, type VehicleCategory, type Driver,
} from "@/lib/fleetApi";
import { isValidPhoneNumber } from "libphonenumber-js";
import type { BulkImportColumn, ParsedRowResult } from "@/components/shared/BulkImportDialog";

export interface BulkImportConfig<T> {
  entityLabel: string;
  columns: BulkImportColumn[];
  parseRow: (raw: Record<string, string>) => ParsedRowResult<T>;
  importRow: (row: Partial<T>, isUpdate: boolean) => Promise<void>;
  templateFilename: string;
}

// ── Vehicles ──────────────────────────────────────────────────
const VEHICLE_IMPORT_COLUMNS: BulkImportColumn[] = [
  { key: "vehicleCode",     label: "Vehicle Code",     required: true, example: "14BAY10" },
  { key: "vehicleName",     label: "Vehicle Name",     required: true, example: "14 BAY 10" },
  { key: "vehicleNumber",   label: "Vehicle Number",   required: true, example: "14 BAY 10" },
  { key: "categoryCode",    label: "Category Code",    required: true, example: "14BAY" },
  { key: "brand",           label: "Brand",            example: "Alfa Romeo" },
  { key: "model",           label: "Model",            example: "DUMMY 14 BAY" },
  { key: "vehicleYear",     label: "Vehicle Year",     example: "2026" },
  { key: "color",           label: "Color",            example: "WHITE" },
  { key: "capacityWeight",  label: "Capacity Weight",  example: "13440" },
  { key: "capacityVolume",  label: "Capacity Volume",  example: "16.8" },
  { key: "weightUnit",      label: "Weight Unit",      example: "KG" },
  { key: "volumeUnit",      label: "Volume Unit",      example: "M3" },
  { key: "driverId",        label: "Driver ID",        example: "DN067" },
  { key: "site",            label: "Home Site",        example: "11001" },
  { key: "departureSite",   label: "Departure Site",   example: "11001" },
  { key: "arrivalSite",     label: "Arrival Site",     example: "11001" },
  { key: "active",          label: "Active (true/false)", example: "true" },
];

export function vehicleImportConfig(
  existingVehicles: Vehicle[],
  categories: VehicleCategory[],
): BulkImportConfig<Vehicle> {
  return {
    entityLabel: "Vehicles",
    columns: VEHICLE_IMPORT_COLUMNS,
    templateFilename: "vehicles-template.csv",
    parseRow: (raw) => {
      const errors: string[] = [];
      const get = (label: string) => raw[label] ?? "";

      const vehicleCode = get("Vehicle Code");
      const vehicleName = get("Vehicle Name");
      const vehicleNumber = get("Vehicle Number");
      const categoryCode = get("Category Code");

      if (!vehicleCode) errors.push("Vehicle Code is required");
      if (!vehicleName) errors.push("Vehicle Name is required");
      if (!vehicleNumber) errors.push("Vehicle Number is required");
      if (!categoryCode) errors.push("Category Code is required");
      else if (categories.length && !categories.some((c) => c.categoryCode === categoryCode)) {
        errors.push(`Category "${categoryCode}" does not exist`);
      }

      const yearRaw = get("Vehicle Year");
      const capWtRaw = get("Capacity Weight");
      const capVolRaw = get("Capacity Volume");
      const year = yearRaw ? Number(yearRaw) : undefined;
      const capWt = capWtRaw ? Number(capWtRaw) : undefined;
      const capVol = capVolRaw ? Number(capVolRaw) : undefined;
      if (yearRaw && Number.isNaN(year)) errors.push("Vehicle Year must be a number");
      if (capWtRaw && Number.isNaN(capWt)) errors.push("Capacity Weight must be a number");
      if (capVolRaw && Number.isNaN(capVol)) errors.push("Capacity Volume must be a number");

      if (errors.length) return { data: null, errors };

      const activeRaw = get("Active (true/false)").toLowerCase();
      const isUpdate = existingVehicles.some((r) => r.vehicleCode === vehicleCode);

      const data: Partial<Vehicle> = {
        vehicleCode, vehicleName, vehicleNumber, categoryCode,
        brand: get("Brand"), model: get("Model"),
        vehicleYear: year ?? 0, color: get("Color"),
        capacityWeight: capWt ?? 0, capacityVolume: capVol ?? 0,
        weightUnit: get("Weight Unit") || "KG", volumeUnit: get("Volume Unit") || "M3",
        driverId: get("Driver ID"),
        site: get("Home Site") || null,
        departureSite: get("Departure Site") || null,
        arrivalSite: get("Arrival Site") || null,
        active: activeRaw ? activeRaw === "true" : true,
        vehicleStatus: 1,
      };
      return { data, errors: [], isUpdate };
    },
    importRow: async (row, isUpdate) => {
      if (isUpdate) await vehicleApi.update(row.vehicleCode!, row);
      else await vehicleApi.create(row);
    },
  };
}

// ── Drivers ───────────────────────────────────────────────────
const DRIVER_IMPORT_COLUMNS: BulkImportColumn[] = [
  { key: "driverId",          label: "Driver ID",           required: true, example: "DN072" },
  { key: "driverName",        label: "Driver Name",         required: true, example: "Ranjeet Transport Driver 3" },
  { key: "employeeCode",      label: "Employee Code",       example: "EMP0072" },
  { key: "mobileNo",          label: "Mobile No",            example: "+18681234567" },
  { key: "email",             label: "Email",                example: "driver@example.com" },
  { key: "licenseNumber",     label: "License Number",       example: "DL123456" },
  { key: "licenseType",       label: "License Type",         example: "1" },
  { key: "licenseIssueDate",  label: "License Issue Date",   example: "2024-01-15" },
  { key: "licenseExpiryDate", label: "License Expiry Date",  example: "2029-01-15" },
  { key: "issuedBy",          label: "Issued By",            example: "Ministry of Transport" },
  { key: "maxHoursPerDay",    label: "Max Hours Per Day",    example: "8" },
  { key: "maxHoursPerWeek",   label: "Max Hours Per Week",   example: "48" },
  { key: "active",            label: "Active (true/false)",  example: "true" },
];

export function driverImportConfig(existingDrivers: Driver[]): BulkImportConfig<Driver> {
  return {
    entityLabel: "Drivers",
    columns: DRIVER_IMPORT_COLUMNS,
    templateFilename: "drivers-template.csv",
    parseRow: (raw) => {
      const errors: string[] = [];
      const get = (label: string) => raw[label] ?? "";

      const driverId = get("Driver ID");
      const driverName = get("Driver Name");
      if (!driverId) errors.push("Driver ID is required");
      if (!driverName) errors.push("Driver Name is required");

      const mobileNo = get("Mobile No");
      if (mobileNo && !isValidPhoneNumber(mobileNo)) errors.push("Mobile No is not a valid phone number");

      const licenseTypeRaw = get("License Type");
      const maxHrDayRaw = get("Max Hours Per Day");
      const maxHrWkRaw = get("Max Hours Per Week");
      const licenseType = licenseTypeRaw ? Number(licenseTypeRaw) : 1;
      const maxHrDay = maxHrDayRaw ? Number(maxHrDayRaw) : 8;
      const maxHrWk = maxHrWkRaw ? Number(maxHrWkRaw) : 48;
      if (licenseTypeRaw && Number.isNaN(licenseType)) errors.push("License Type must be a number");
      if (maxHrDayRaw && Number.isNaN(maxHrDay)) errors.push("Max Hours Per Day must be a number");
      if (maxHrWkRaw && Number.isNaN(maxHrWk)) errors.push("Max Hours Per Week must be a number");

      if (errors.length) return { data: null, errors };

      const activeRaw = get("Active (true/false)").toLowerCase();
      const isUpdate = existingDrivers.some((r) => r.driverId === driverId);

      const data: Partial<Driver> = {
        driverId, driverName,
        employeeCode: get("Employee Code"),
        mobileNo, email: get("Email"),
        licenseNumber: get("License Number"),
        licenseType, licenseIssueDate: get("License Issue Date"),
        licenseExpiryDate: get("License Expiry Date"),
        issuedBy: get("Issued By"),
        maxHoursPerDay: maxHrDay, maxHoursPerWeek: maxHrWk,
        driverStatus: 1, allowAllVehicles: true, longHaulDriver: false, notes: "",
        active: activeRaw ? activeRaw === "true" : true,
      };
      return { data, errors: [], isUpdate };
    },
    importRow: async (row, isUpdate) => {
      if (isUpdate) await driverApi.update(row.driverId!, row);
      else await driverApi.create(row);
    },
  };
}

// ── Vehicle Categories ────────────────────────────────────────
const CATEGORY_IMPORT_COLUMNS: BulkImportColumn[] = [
  { key: "categoryCode",   label: "Category Code",  required: true, example: "14BAY" },
  { key: "description",    label: "Description",    required: true, example: "14 Bays Truck" },
  { key: "countryCode",    label: "Country Code",   example: "TT" },
  { key: "vehicleType",    label: "Vehicle Type",   example: "1" },
  { key: "axleCount",      label: "Axle Count",     example: "6" },
  { key: "maxCapacityWt",  label: "Max Capacity Weight", example: "12000" },
  { key: "maxCapacityVol", label: "Max Capacity Volume", example: "50" },
  { key: "weightUnit",     label: "Weight Unit",    example: "KG" },
  { key: "volumeUnit",     label: "Volume Unit",    example: "CBM" },
  { key: "skillNumber",    label: "Skill Number",   example: "1" },
  { key: "active",         label: "Active (true/false)", example: "true" },
];

export function vehicleCategoryImportConfig(existingCategories: VehicleCategory[]): BulkImportConfig<VehicleCategory> {
  return {
    entityLabel: "Vehicle Categories",
    columns: CATEGORY_IMPORT_COLUMNS,
    templateFilename: "vehicle-categories-template.csv",
    parseRow: (raw) => {
      const errors: string[] = [];
      const get = (label: string) => raw[label] ?? "";

      const categoryCode = get("Category Code").toUpperCase();
      const description = get("Description");
      if (!categoryCode) errors.push("Category Code is required");
      if (!description) errors.push("Description is required");

      const numFields: [string, string][] = [
        ["Vehicle Type", "vehicleType"], ["Axle Count", "axleCount"],
        ["Max Capacity Weight", "maxCapacityWt"], ["Max Capacity Volume", "maxCapacityVol"],
        ["Skill Number", "skillNumber"],
      ];
      const nums: Record<string, number> = {};
      for (const [label, key] of numFields) {
        const raw2 = get(label);
        const n = raw2 ? Number(raw2) : 0;
        if (raw2 && Number.isNaN(n)) errors.push(`${label} must be a number`);
        nums[key] = n;
      }

      if (errors.length) return { data: null, errors };

      const activeRaw = get("Active (true/false)").toLowerCase();
      const isUpdate = existingCategories.some((r) => r.categoryCode === categoryCode);

      const data: VehicleCategory = {
        categoryCode, description,
        active: activeRaw ? activeRaw === "true" : true,
        countryCode: (get("Country Code") || "IND").toUpperCase(),
        vehicleType: nums.vehicleType, axleCount: nums.axleCount,
        maxCapacityWt: nums.maxCapacityWt, maxCapacityVol: nums.maxCapacityVol,
        volumeUnit: (get("Volume Unit") || "CBM").toUpperCase(),
        weightUnit: (get("Weight Unit") || "KG").toUpperCase(),
        skillNumber: nums.skillNumber,
      };
      return { data, errors: [], isUpdate };
    },
    importRow: async (row, isUpdate) => {
      if (isUpdate) await vehicleCategoryApi.update(row.categoryCode!, row);
      else await vehicleCategoryApi.create(row);
    },
  };
}
