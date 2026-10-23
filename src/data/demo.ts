// Demo cast, places and health record. All names and organizations are fictional.

export const patient = {
  first: "Margaret",
  last: "Ellison",
  dob: "March 14, 1948",
  age: 78,
  phone: "(801) 555-0142",
  initials: "ME",
};

export const specialist = {
  name: "Dana Ruiz",
  first: "Dana",
  credentials: "OTR/L, CDRS",
  role: "Driving specialist",
  plain: "certified driving specialist",
  initials: "DR",
};

export const referringDoctor = {
  name: "Dr. Anika Patel",
  practice: "Internal Medicine, Lakeview Medical Center",
};

export const family = {
  name: "Sarah Ellison",
  first: "Sarah",
  relation: "Daughter",
  initials: "SE",
  phone: "(801) 555-0187",
};

export const home = { label: "Home", address: "1450 E Maple St" };

export const visit = {
  time: "10:30 AM",
  place: "Lakeview Medical Center",
  unit: "Rehabilitation, 2nd floor",
  reason: "Family concern about driving",
  length: "About 2 hours",
};

export type Location = {
  id: string;
  name: string;
  detail: string;
  distance: string;
  here?: boolean;
};

export const locations: Location[] = [
  { id: "lakeview", name: "Lakeview Medical Center", detail: "Rehabilitation, 2nd floor", distance: "0.1 mi", here: true },
  { id: "foothill", name: "Foothill Rehabilitation Hospital", detail: "Outpatient therapy", distance: "4.2 mi" },
  { id: "canyon", name: "Canyon Ridge Health", detail: "Neurology and rehab", distance: "7.8 mi" },
];

export type Simulator = { id: string; name: string; room: string; status: "ready" | "busy"; note?: string };

export const simulators: Simulator[] = [
  { id: "sim1", name: "Simulator 1", room: "Room 204", status: "ready" },
  { id: "sim2", name: "Simulator 2", room: "Room 206", status: "busy", note: "In use until 11:15" },
];

export type Source = { id: string; name: string; kind: string; counts: string };

export const sources: Source[] = [
  { id: "lakeview", name: "Lakeview Health", kind: "Hospital and Dr. Patel's office", counts: "23 visits, 4 conditions" },
  { id: "granite-eye", name: "Granite Eye Associates", kind: "Eye exams", counts: "2 eye exams" },
  { id: "mainst", name: "Main Street Pharmacy", kind: "Prescriptions", counts: "5 medicines" },
];

export const shareCategories = [
  { id: "conditions", label: "Conditions" },
  { id: "medicines", label: "Medicines" },
  { id: "eyes", label: "Eye exams" },
  { id: "visits", label: "Visit notes" },
  { id: "labs", label: "Lab results" },
];

export type RecordItem = { name: string; detail: string; source: string; date: string; flag?: string };

export const record: Record<"conditions" | "medicines" | "eyes" | "visits" | "labs", RecordItem[]> = {
  conditions: [
    { name: "Cataract, left eye", detail: "Early, being watched", source: "Granite Eye Associates", date: "Mar 2026", flag: "Left eye 20/50 in March" },
    { name: "High blood pressure", detail: "Controlled", source: "Lakeview Health", date: "Since 2014" },
    { name: "Type 2 diabetes", detail: "A1C 6.9%", source: "Lakeview Health", date: "Since 2018" },
    { name: "Knee osteoarthritis", detail: "Right knee", source: "Lakeview Health", date: "Since 2021" },
  ],
  medicines: [
    { name: "Zolpidem 5 mg", detail: "At bedtime, for sleep", source: "Main Street Pharmacy", date: "Started Sep 18", flag: "Started 5 weeks ago. Can cause next-morning drowsiness." },
    { name: "Lisinopril 10 mg", detail: "Once a day", source: "Main Street Pharmacy", date: "Since 2014" },
    { name: "Metformin 500 mg", detail: "Twice a day", source: "Main Street Pharmacy", date: "Since 2018" },
    { name: "Atorvastatin 20 mg", detail: "At night", source: "Main Street Pharmacy", date: "Since 2019" },
    { name: "Vitamin D3", detail: "Once a day", source: "Patient reported", date: "Since 2022" },
  ],
  eyes: [
    { name: "Eye exam", detail: "Right 20/30, left 20/50. Early cataract, left eye.", source: "Granite Eye Associates", date: "Mar 12, 2026" },
    { name: "Eye exam", detail: "Right 20/25, left 20/30", source: "Granite Eye Associates", date: "Feb 2, 2025" },
  ],
  visits: [
    { name: "Annual wellness visit", detail: "Daughter raised driving concern. Referred for driving assessment.", source: "Dr. Anika Patel", date: "Oct 6, 2026" },
    { name: "Follow-up, blood pressure", detail: "No changes", source: "Dr. Anika Patel", date: "Jun 18, 2026" },
  ],
  labs: [{ name: "Hemoglobin A1C", detail: "6.9%", source: "Lakeview Health", date: "Aug 2026" }],
};

export const schedule = [
  { time: "9:00 AM", name: "Robert Chen", age: 81, status: "Signed" },
  { time: "10:30 AM", name: "Margaret Ellison", age: 78, status: "current" },
  { time: "1:00 PM", name: "Linda Okafor", age: 74, status: "Scheduled" },
  { time: "2:30 PM", name: "James Whitaker", age: 86, status: "Scheduled" },
];

// Intake questions, one per screen.
export type Question = {
  id: string;
  prompt: string;
  multi?: boolean;
  options: string[];
};

export const questions: Question[] = [
  { id: "driving", prompt: "Are you driving now?", options: ["Yes, most days", "Yes, a few days a week", "I've stopped for now"] },
  {
    id: "avoid",
    prompt: "Do you avoid any of these?",
    multi: true,
    options: ["Driving at night", "Highways", "Rain or snow", "Busy intersections", "None of these"],
  },
  { id: "incidents", prompt: "In the past year, have you had a crash or a close call?", options: ["No", "A close call", "A crash"] },
  {
    id: "places",
    prompt: "Where do you need to go?",
    multi: true,
    options: ["Doctor visits", "Grocery store", "Church", "Family", "Friends", "Hardware store"],
  },
];

export const defaultAnswers: Record<string, string | string[]> = {
  driving: "Yes, most days",
  avoid: ["Driving at night", "Highways"],
  incidents: "A close call",
  places: ["Doctor visits", "Grocery store", "Church", "Family"],
};

export const destinations: Record<string, { name: string; address: string; mins: number }> = {
  "Doctor visits": { name: "Lakeview Medical Center", address: "1200 E Lakeview Dr", mins: 12 },
  "Grocery store": { name: "Hillside Market", address: "3270 S 1300 E", mins: 8 },
  Church: { name: "First Community Church", address: "455 E 2700 S", mins: 6 },
  Family: { name: "Sarah's house", address: "2187 Kensington Ave", mins: 15 },
  Friends: { name: "Evergreen Senior Center", address: "3100 S 500 E", mins: 9 },
  "Hardware store": { name: "Cottonwood Hardware", address: "4120 S Highland Dr", mins: 11 },
};
