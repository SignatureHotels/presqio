import type { BusinessType, CreateLeaveTypeRequest, CreateShiftRequest } from "@presqio/lib";

type ShiftPreset = Required<CreateShiftRequest>;

export interface BusinessPreset {
  id: BusinessType;
  label: string;
  examples: string;
  /** What one location is called ("branch", "store", "site"). */
  site: string;
  sites: string;
  /** Shifts offered in setup; the first fills the form. */
  shifts: ShiftPreset[];
  leaveTypes: CreateLeaveTypeRequest[];
  /** New employees can check in away from every site (field work). */
  checkInAnywhere?: boolean;
  tip: string;
}

const MON_SAT = [1, 2, 3, 4, 5, 6] as ShiftPreset["workingDays"];
const MON_FRI = [1, 2, 3, 4, 5] as ShiftPreset["workingDays"];
const ALL_WEEK = [1, 2, 3, 4, 5, 6, 7] as ShiftPreset["workingDays"];
const shift = (name: string, start: string, end: string, workingDays = MON_SAT, graceMinutes = 10, breakMinutes = 60): ShiftPreset =>
  ({ name, start, end, workingDays, graceMinutes, breakMinutes });

/** Casual, sick and earned leave: the usual Indian starting set. */
const STANDARD_LEAVE: CreateLeaveTypeRequest[] = [
  { name: "Casual leave", paid: true, daysPerYear: 12 },
  { name: "Sick leave", paid: true, daysPerYear: 12 },
  { name: "Earned leave", paid: true, daysPerYear: 15 },
  { name: "Unpaid leave", paid: false, daysPerYear: null },
];
const HOURLY_LEAVE: CreateLeaveTypeRequest[] = [
  { name: "Casual leave", paid: true, daysPerYear: 7 },
  { name: "Sick leave", paid: true, daysPerYear: 7 },
  { name: "Unpaid leave", paid: false, daysPerYear: null },
];

export const BUSINESS_PRESETS: BusinessPreset[] = [
  {
    id: "office", label: "Office", examples: "IT, agencies, accounts, consultancies",
    site: "office", sites: "offices",
    shifts: [shift("General shift", "09:30", "18:30", MON_FRI), shift("Saturday half day", "09:30", "13:30", [6] as ShiftPreset["workingDays"], 10, 0)],
    leaveTypes: STANDARD_LEAVE,
    tip: "Most offices run one general shift. Add a half-day Saturday if you work alternate Saturdays.",
  },
  {
    id: "retail", label: "Shop or showroom", examples: "Retail, supermarkets, pharmacies, mobile stores",
    site: "store", sites: "stores",
    shifts: [shift("Morning", "09:00", "17:00", ALL_WEEK), shift("Evening", "14:00", "22:00", ALL_WEEK)],
    leaveTypes: HOURLY_LEAVE,
    tip: "Stores usually open every day with two overlapping shifts; each person gets their own weekly off.",
  },
  {
    id: "restaurant", label: "Restaurant or hotel", examples: "Restaurants, cafés, cloud kitchens, hotels",
    site: "outlet", sites: "outlets",
    shifts: [shift("Lunch", "10:00", "16:00", ALL_WEEK, 10, 30), shift("Dinner", "17:00", "23:30", ALL_WEEK, 10, 30)],
    leaveTypes: HOURLY_LEAVE,
    tip: "Kitchens often split the day. Staff who work both can check in for lunch and again for dinner.",
  },
  {
    id: "clinic", label: "Clinic or hospital", examples: "Hospitals, clinics, labs, nursing homes",
    site: "centre", sites: "centres",
    shifts: [shift("Morning", "07:00", "15:00", ALL_WEEK, 5, 30), shift("Evening", "15:00", "23:00", ALL_WEEK, 5, 30), shift("Night", "23:00", "07:00", ALL_WEEK, 5, 30)],
    leaveTypes: STANDARD_LEAVE,
    tip: "Round-the-clock care runs three 8-hour shifts. Night shifts crossing midnight count on the day they start.",
  },
  {
    id: "factory", label: "Factory or warehouse", examples: "Manufacturing, packing, godowns, workshops",
    site: "plant", sites: "plants",
    shifts: [shift("Shift A", "06:00", "14:00", MON_SAT, 5, 30), shift("Shift B", "14:00", "22:00", MON_SAT, 5, 30), shift("Shift C", "22:00", "06:00", MON_SAT, 5, 30)],
    leaveTypes: STANDARD_LEAVE,
    tip: "Three 8-hour shifts with a short grace time is the common pattern for plants.",
  },
  {
    id: "construction", label: "Construction or projects", examples: "Builders, contractors, infra and interiors",
    site: "site", sites: "sites",
    shifts: [shift("Day", "08:00", "17:00", MON_SAT, 15, 60)],
    leaveTypes: HOURLY_LEAVE,
    tip: "Add each project site with its own perimeter. Workers who move between sites can check in at any of theirs.",
  },
  {
    id: "security", label: "Security or facility services", examples: "Guards, housekeeping, manpower agencies",
    site: "client site", sites: "client sites",
    shifts: [shift("Day", "08:00", "20:00", ALL_WEEK, 10, 30), shift("Night", "20:00", "08:00", ALL_WEEK, 10, 30)],
    leaveTypes: HOURLY_LEAVE,
    tip: "Add every client location as a site, so guards can only check in where they're posted.",
  },
  {
    id: "school", label: "School or college", examples: "Schools, colleges, coaching centres",
    site: "campus", sites: "campuses",
    shifts: [shift("School day", "08:00", "15:30", MON_SAT, 10, 30)],
    leaveTypes: STANDARD_LEAVE,
    tip: "Add your term holidays under Holidays & leave so they aren't counted as absences.",
  },
  {
    id: "salon", label: "Salon, spa or gym", examples: "Salons, spas, gyms, studios",
    site: "studio", sites: "studios",
    shifts: [shift("Full day", "10:00", "20:00", ALL_WEEK, 10, 60)],
    leaveTypes: HOURLY_LEAVE,
    tip: "Most salons open all week, and each person gets their own weekly off.",
  },
  {
    id: "field", label: "Field sales or service", examples: "Sales reps, technicians, delivery, home care",
    site: "base", sites: "bases",
    shifts: [shift("Field day", "09:00", "18:00", MON_SAT, 15, 60)],
    leaveTypes: STANDARD_LEAVE,
    checkInAnywhere: true,
    tip: "Field staff can check in from wherever they start work. Each check-in still keeps a selfie and the location.",
  },
  {
    id: "other", label: "Something else", examples: "Any other kind of team",
    site: "branch", sites: "branches",
    shifts: [shift("General shift", "09:00", "18:00")],
    leaveTypes: STANDARD_LEAVE,
    tip: "Start with one general shift; you can add more under Shifts at any time.",
  },
];

const FALLBACK = BUSINESS_PRESETS[BUSINESS_PRESETS.length - 1];

/** The preset for a business, or the general one when none was chosen. */
export const businessPreset = (type: BusinessType | null | undefined): BusinessPreset =>
  BUSINESS_PRESETS.find((p) => p.id === type) ?? FALLBACK;
