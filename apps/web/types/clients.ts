export type ClientStatus = "active" | "vip" | "inactive";

export interface Client {
  id: string;

  name: string;

  phone: string;

  email: string;

  visits: number;

  totalSpent: number;

  status: ClientStatus;

  lastVisit: string;
}
