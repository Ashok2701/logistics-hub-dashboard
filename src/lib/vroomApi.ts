// ============================================================
// VROOM API client — https://maps.tema-systems.com
// Used for both Manual Optimisation and Auto Generate Routes
// ============================================================

const VROOM_URL = "https://maps.tema-systems.com";

// ── Types ────────────────────────────────────────────────────

export interface VroomVehicle {
  id: number;
  description: string;
  start: [number, number];   // [lng, lat]
  end: [number, number];     // [lng, lat]
  capacity: [number];        // [weight_grams]
  time_window: [number, number]; // [start_sec, end_sec]
  max_travel_time?: number;  // seconds
  max_tasks?: number;
}

export interface VroomJob {
  id: number;
  description: string;       // docNum
  location: [number, number];// [lng, lat]
  service: number;           // seconds at stop
  delivery?: [number];       // [weight_grams]
  pickup?: [number];         // [weight_grams]
  time_windows?: [number, number][];
  priority?: number;
}

export interface VroomStep {
  type: "start" | "job" | "end";
  description?: string;      // docNum
  arrival: number;           // seconds from midnight
  duration: number;          // travel seconds to this step
  service: number;           // service seconds at stop
  distance?: number;         // meters from prev step
  waiting_time?: number;
  location?: [number, number];
}

export interface VroomRoute {
  vehicle: number;           // vehicle id
  description: string;       // vehicle code
  steps: VroomStep[];
  duration: number;          // total travel seconds
  service: number;           // total service seconds
  distance: number;          // total meters
  cost: number;
  waiting_time: number;      // total waiting seconds
  geometry: string;          // encoded polyline
}

export interface VroomResponse {
  code: number;
  routes: VroomRoute[];
  unassigned?: { id: number; description: string }[];
}

// ── Helper: seconds → HH:MM ──────────────────────────────────
export function secToHHMM(sec: number): string {
  const h = Math.floor(sec / 3600) % 24;
  const m = Math.floor((sec % 3600) / 60);
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`;
}

// ── Helper: HH:MM → seconds from midnight ────────────────────
export function hhmmToSec(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 3600 + m * 60;
}

// ── Core API call ─────────────────────────────────────────────
export async function callVroom(
  vehicles: VroomVehicle[],
  jobs: VroomJob[],
): Promise<VroomResponse> {
  const body = { vehicles, jobs, options: { g: true } };
  const res = await fetch(VROOM_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`VROOM error ${res.status}: ${err}`);
  }
  return res.json();
}
