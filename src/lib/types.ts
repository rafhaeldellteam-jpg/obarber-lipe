export type Service = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration_minutes: number;
  active: boolean;
  sort_order: number;
  created_at: string;
};

export type Employee = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  specialty: string | null;
  color: string | null;
  google_client_id: string | null;
  google_client_secret: string | null;
  active: boolean;
  created_at: string;
};

export type Appointment = {
  id: string;
  client_name: string;
  client_phone: string;
  client_email: string | null;
  employee_id: string | null;
  service_id: string | null;
  appointment_date: string;
  appointment_time: string;
  status: string;
  notes: string | null;
  created_at: string;
};

export type AppointmentWithRelations = Appointment & {
  services?: Service | null;
  employees?: Employee | null;
};

export type BlockedSlot = {
  id: string;
  block_date: string;
  block_time: string | null;
  reason: string | null;
  employee_id: string | null;
  created_at: string;
};

export type Customer = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  employee_id: string | null;
  notes: string | null;
  signup_method: "local" | "google";
  created_at: string;
};

export type Plan = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration_days: number;
  cuts_per_period: number;
  active: boolean;
  sort_order: number;
  created_at: string;
};

export type Subscription = {
  id: string;
  customer_id: string;
  plan_id: string | null;
  employee_id: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  cuts_used?: number | null;
  requested_at: string;
  created_at: string;
};

export type SubscriptionWithRelations = Subscription & {
  plans?: Plan | null;
  customers?: Customer | null;
  employees?: Employee | null;
};

export type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  active: boolean;
  sort_order: number;
  created_at: string;
};

export type Order = {
  id: string;
  customer_id: string;
  employee_id: string | null;
  product_id: string | null;
  description: string;
  amount: number;
  status: string;
  created_at: string;
};

export type OrderWithRelations = Order & {
  customers?: Customer | null;
  products?: Product | null;
};

export type Setting = {
  key: string;
  value: string;
};

export type AvailableSlot = {
  time: string;
  available: boolean;
};

export type ApiResponse<T = unknown> = {
  ok: boolean;
  message?: string;
  data?: T;
};

export type ErrorDetails = {
  code: "timeslot_occupied" | "service_unavailable" | "employee_unavailable" | "invalid_input" | "unknown";
  message: string;
};