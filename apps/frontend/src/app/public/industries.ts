import type { BusinessType } from "@presqio/lib";

export interface Industry {
  type: Exclude<BusinessType, "other">;
  /** URL: /for/<slug> */
  slug: string;
  /** Menu and chip label. */
  name: string;
  /** Page title and H1. */
  headline: string;
  lead: string;
  /** "Before Presqio" problems and how Presqio handles each. */
  pains: { problem: string; fix: string }[];
  /** The features that matter most here (icons from /icons.svg). */
  highlights: { icon: string; title: string; text: string }[];
  faqs: { q: string; a: string }[];
}

export const INDUSTRIES: Industry[] = [
  {
    type: "retail", slug: "shops", name: "Shops & showrooms",
    headline: "Attendance for shops that open every day",
    lead: "Staff check in at the counter with a selfie, each person gets their own weekly off, and every store's register is ready for payroll.",
    pains: [
      { problem: "Proxy attendance in a register book", fix: "A live selfie and a GPS check inside the store for every check-in." },
      { problem: "Weekly offs that differ by person", fix: "A roster with each person's off day, and morning or evening shifts." },
      { problem: "Staff who share one phone, or have none", fix: "A kiosk tablet at the counter: type the ID, take a selfie, done." },
    ],
    highlights: [
      { icon: "camera", title: "Counter kiosk", text: "One tablet at the entrance for the whole store." },
      { icon: "calendar", title: "Roster", text: "Morning and evening shifts, and each person's weekly off." },
      { icon: "users", title: "Store managers", text: "Each manager sees only their own store." },
      { icon: "file", title: "Payroll from attendance", text: "Monthly or daily wages, with overtime from check-ins." },
    ],
    faqs: [
      { q: "Can part-timers be paid by the day?", a: "Yes. Set a daily or hourly wage per person; payroll pays the days or hours they checked in." },
      { q: "Can one manager run two stores?", a: "Yes. Invite them as a branch manager for both stores; they see only those." },
    ],
  },
  {
    type: "restaurant", slug: "restaurants", name: "Restaurants & hotels",
    headline: "Attendance for kitchens, cafés and hotels",
    lead: "Split shifts, late finishes and staff who move between outlets: Presqio records each one with a selfie at the right outlet.",
    pains: [
      { problem: "Lunch and dinner shifts on the same day", fix: "Split shifts on the roster; each check-in counts towards the shift it falls in." },
      { problem: "Overtime nobody can prove", fix: "Overtime worked out from check-in times, paid at 1.5× or 2× after the manager approves it." },
      { problem: "Staff covering two outlets", fix: "Let someone check in at any of their outlets; the day is recorded where they worked." },
    ],
    highlights: [
      { icon: "clock", title: "Split shifts", text: "Lunch and dinner as two shifts on one day." },
      { icon: "file", title: "Hourly pay and overtime", text: "Pay by the hour, with overtime from check-ins." },
      { icon: "map", title: "Several outlets", text: "One login for every outlet, each with its own perimeter." },
      { icon: "sun", title: "Leave and holidays", text: "Casual and sick leave with yearly allowances." },
    ],
    faqs: [
      { q: "What about shifts that end after midnight?", a: "Overnight shifts are supported; the day counts on the date the shift starts." },
      { q: "Do kitchen staff need smartphones?", a: "No. Put a kiosk tablet at the staff entrance, or let them sign in on a colleague's phone." },
    ],
  },
  {
    type: "clinic", slug: "clinics", name: "Clinics & hospitals",
    headline: "Attendance for clinics, labs and hospitals",
    lead: "Round-the-clock rosters with morning, evening and night shifts, and proof of who was on duty, with a selfie, at which centre.",
    pains: [
      { problem: "24-hour rotas planned on WhatsApp", fix: "A roster with rotating morning, evening and night shifts, filled for weeks at once." },
      { problem: "Night shifts that cross midnight", fix: "Overnight shifts handled properly, with late and early-leave flags." },
      { problem: "Locum staff across several centres", fix: "Assign extra centres per person; check-in works at any of them." },
    ],
    highlights: [
      { icon: "calendar", title: "Rotating rosters", text: "Morning → evening → night, staggered so every shift is covered." },
      { icon: "clock", title: "Night shifts", text: "Overnight shifts with short grace times." },
      { icon: "shield", title: "Audit trail", text: "Every correction is reviewed, with a reason and who approved it." },
      { icon: "users", title: "Department heads", text: "Give a head access to just their centre." },
    ],
    faqs: [
      { q: "Can doctors on rounds check in from a different building?", a: "Yes. Add each building as a site for that person, or allow check-in from anywhere for visiting staff." },
      { q: "Are selfies kept private?", a: "Selfies are seen only by your admins and are removed after the retention period." },
    ],
  },
  {
    type: "factory", slug: "factories", name: "Factories & warehouses",
    headline: "Attendance for plants, godowns and workshops",
    lead: "Three shifts, a kiosk at the gate and wages that follow attendance: no punch cards, no buddy punching.",
    pains: [
      { problem: "Buddy punching on card machines", fix: "A live selfie with every punch, at the plant's own perimeter." },
      { problem: "Shift A, B and C rotating every week", fix: "A weekly rotation filled for up to eight weeks, staggered across the team." },
      { problem: "Daily-wage workers and overtime", fix: "Daily or hourly wages and overtime, calculated from check-ins." },
    ],
    highlights: [
      { icon: "camera", title: "Gate kiosk", text: "A tablet at the gate; workers type their ID and take a selfie." },
      { icon: "refresh", title: "Shift rotation", text: "Shift A, B and C rotating weekly." },
      { icon: "file", title: "Daily wages and OT", text: "Pay per day worked, overtime at 1.5× or 2×." },
      { icon: "users", title: "Hindi and Telugu", text: "Workers use the app and the kiosk in their own language." },
    ],
    faqs: [
      { q: "Does the kiosk need an internet connection?", a: "Yes, a basic mobile data or Wi-Fi connection. Each punch is checked by the server." },
      { q: "Can supervisors approve missed punches?", a: "Yes. Invite them as branch managers; they approve corrections for their plant." },
    ],
  },
  {
    type: "construction", slug: "construction", name: "Construction & projects",
    headline: "Attendance for builders and contractors",
    lead: "Each project site gets its own perimeter, workers check in at the site they're on, and daily wages follow the days they worked.",
    pains: [
      { problem: "Workers who move between sites", fix: "Assign several sites per worker; the day is recorded at the site they checked in." },
      { problem: "Muster rolls filled in later", fix: "A selfie and location at the site, at the time of check-in." },
      { problem: "Daily wages worked out by hand", fix: "Daily wages paid for the days worked, plus overtime." },
    ],
    highlights: [
      { icon: "pin", title: "A perimeter per site", text: "Add each project site with its own radius." },
      { icon: "map", title: "Multi-site workers", text: "Check-in works at any of a worker's sites." },
      { icon: "file", title: "Daily wages", text: "Pay per day worked, with overtime." },
      { icon: "camera", title: "Site kiosk", text: "One phone at the site office for the whole crew." },
    ],
    faqs: [
      { q: "What if a site has poor GPS?", a: "Set the accuracy the site needs; workers are told to step outside if their phone's GPS is too rough." },
      { q: "Can a site engineer see only their site?", a: "Yes. Invite them as a branch manager for that site." },
    ],
  },
  {
    type: "security", slug: "security-services", name: "Security & facility services",
    headline: "Attendance for guards and facility staff",
    lead: "Prove every guard was at the client's site for their 12-hour shift, with a selfie at the post, and bill clients with confidence.",
    pains: [
      { problem: "Guards marked present who weren't at the post", fix: "Check-in works only inside the client site's perimeter, with a selfie." },
      { problem: "Day and night 12-hour shifts", fix: "Day and night shifts on a roster, with each guard's weekly off." },
      { problem: "Staff deployed across many clients", fix: "Each client location is a site; guards check in at the ones they're posted to." },
    ],
    highlights: [
      { icon: "shield", title: "Proof at the post", text: "Selfie plus GPS inside the client's perimeter." },
      { icon: "calendar", title: "12-hour rosters", text: "Day and night shifts, rotating." },
      { icon: "report", title: "Per-site registers", text: "Attendance by client site, exportable as CSV." },
      { icon: "users", title: "Area supervisors", text: "Each supervisor sees only their client sites." },
    ],
    faqs: [
      { q: "Can a relief guard cover a different site?", a: "Yes. Add that site to the guard's sites, or roster them there for the day." },
      { q: "Is the location tracked during the shift?", a: "No. Location is read only at check-in and check-out." },
    ],
  },
  {
    type: "school", slug: "schools", name: "Schools & colleges",
    headline: "Staff attendance for schools and colleges",
    lead: "Teachers and staff check in on their phone, term holidays don't count as absences, and leave is tracked against each year's allowance.",
    pains: [
      { problem: "Signature registers in the staff room", fix: "A quick selfie check-in on campus, on any phone." },
      { problem: "Holidays and vacations miscounted", fix: "Add term holidays once; they're never counted as absences." },
      { problem: "Leave balances kept in a notebook", fix: "Casual, sick and earned leave with yearly allowances." },
    ],
    highlights: [
      { icon: "sun", title: "Holidays and leave", text: "Term holidays and leave balances in one place." },
      { icon: "clock", title: "School-day shift", text: "One shift with a short grace time." },
      { icon: "map", title: "Several campuses", text: "Each campus with its own perimeter." },
      { icon: "file", title: "Payslips", text: "Monthly salaries with loss of pay from attendance." },
    ],
    faqs: [
      { q: "Can a principal see only their branch?", a: "Yes. Invite them as a branch manager for their campus." },
      { q: "Do staff need an app?", a: "No. Presqio runs in the phone's browser." },
    ],
  },
  {
    type: "salon", slug: "salons-and-gyms", name: "Salons, spas & gyms",
    headline: "Attendance for salons, spas and gyms",
    lead: "Open all week with each stylist or trainer on their own day off, and pay by the hour or the day when that's how you work.",
    pains: [
      { problem: "Everyone has a different weekly off", fix: "A roster with each person's off day and shift." },
      { problem: "Trainers paid by the hour", fix: "Hourly pay from check-in times, with overtime if you pay it." },
      { problem: "Several studios across the city", fix: "One login for every studio, each with its own perimeter." },
    ],
    highlights: [
      { icon: "calendar", title: "Weekly offs", text: "Each person's day off on the roster." },
      { icon: "file", title: "Hourly pay", text: "Pay for the hours checked in." },
      { icon: "camera", title: "Front-desk kiosk", text: "A tablet at reception for check-ins." },
      { icon: "users", title: "Studio managers", text: "Each manager sees only their studio." },
    ],
    faqs: [
      { q: "Can a stylist work at two studios?", a: "Yes. Add both studios as their sites." },
      { q: "Can I pay some staff monthly and others hourly?", a: "Yes. Each person's pay basis is set on their own salary." },
    ],
  },
  {
    type: "field", slug: "field-teams", name: "Field sales & service",
    headline: "Attendance for teams on the move",
    lead: "Sales reps, technicians and delivery staff check in from wherever they start work, with a selfie and their location on record.",
    pains: [
      { problem: "No office to check in at", fix: "Allow check-in from anywhere; the location and selfie are still recorded." },
      { problem: "Start times you can't verify", fix: "The time, place and selfie of every check-in, seen by the manager." },
      { problem: "Reps who visit a depot some days", fix: "Add the depot as a site; check-in works there too." },
    ],
    highlights: [
      { icon: "map", title: "Check in from anywhere", text: "For people without a fixed workplace." },
      { icon: "camera", title: "Selfie on record", text: "Every check-in keeps a selfie and the location." },
      { icon: "report", title: "Off-site register", text: "Off-site days are marked, with the distance from base." },
      { icon: "users", title: "Area managers", text: "Each manager sees only their team." },
    ],
    faqs: [
      { q: "Is the rep's location tracked all day?", a: "No. Location is read only when they check in and out." },
      { q: "Can some staff check in anywhere and others only at the office?", a: "Yes. It's a setting on each employee." },
    ],
  },
  {
    type: "office", slug: "offices", name: "Offices",
    headline: "Attendance for offices and agencies",
    lead: "A simple general shift, half-day Saturdays, holidays and leave balances, and payslips straight from attendance.",
    pains: [
      { problem: "Spreadsheets for leave and holidays", fix: "Leave types with yearly allowances and a holiday list." },
      { problem: "Payroll chasing attendance", fix: "Loss of pay suggested from missing days; payslips in a few clicks." },
      { problem: "Branches in different cities", fix: "One workspace for every office, each with its own perimeter." },
    ],
    highlights: [
      { icon: "sun", title: "Leave and holidays", text: "Casual, sick and earned leave with balances." },
      { icon: "file", title: "Payslips", text: "Monthly salaries with loss of pay from attendance." },
      { icon: "check", title: "Corrections", text: "Missed punches fixed through an approved request." },
      { icon: "users", title: "Team access", text: "Admins and branch managers by invitation." },
    ],
    faqs: [
      { q: "Can people work from home some days?", a: "Yes. Allow check-in from anywhere for those people; off-site days are marked." },
      { q: "Do you calculate tax?", a: "Not automatically. Salary components and deductions are set per person." },
    ],
  },
];

export const industryBySlug = (slug: string | undefined) => INDUSTRIES.find((i) => i.slug === slug);
