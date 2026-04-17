import { env } from "@supabill/env/web";

export type TenantSnapshot = {
  id: string;
  name: string;
  slug: string;
  currency: string;
  status: string;
  metrics: {
    mrr: number;
    overdue: number;
    customers: number;
    activeSubscriptions: number;
    routersOnline: number;
    routersTotal: number;
    wireguardConnected: number;
    wireguardTotal: number;
  };
  routers: Array<{
    id: string;
    name: string;
    siteName: string;
    role: string;
    status: string;
    host: string;
    username: string;
    routerOsVersion: string | null;
    lastSeenAt: string | null;
  }>;
  plans: Array<{
    id: string;
    name: string;
    profileName: string;
    serviceType: string;
    price: number;
    validityDays: number;
    speedDownKbps: number;
    speedUpKbps: number;
  }>;
  customers: Array<{
    id: string;
    fullName: string;
    accountNumber: string;
    status: string;
    activePlan: string;
    renewsAt: string;
    balance: number;
  }>;
  invoices: Array<{
    id: string;
    invoiceNumber: string;
    customerName: string;
    status: string;
    amount: number;
    balance: number;
    dueDate: string;
  }>;
  wireguardPeers: Array<{
    id: string;
    routerId: string;
    routerName: string;
    name: string;
    status: string;
    endpoint: string;
    allowedIps: string;
    interfaceAddress: string;
    dns: string;
    publicKey: string;
    presharedKey: string | null;
    persistentKeepalive: number;
    lastHandshakeAt: string | null;
  }>;
  features: Array<{
    id: string;
    featureKey: string;
    name: string;
    status: string;
    config: Record<string, string | number | boolean | string[]>;
  }>;
  recentPayments: Array<{
    id: string;
    customerName: string;
    amount: number;
    method: string;
    paidAt: string;
    reference: string | null;
  }>;
};

export type PlatformSnapshot = {
  generatedAt: string;
  mode: "database" | "demo";
  tenants: TenantSnapshot[];
};

const fallbackSnapshot: PlatformSnapshot = {
  generatedAt: "2026-03-24T09:00:00.000Z",
  mode: "demo",
  tenants: [
    {
      id: "tenant-nile",
      name: "Nile Fiber",
      slug: "nile-fiber",
      currency: "USD",
      status: "active",
      metrics: {
        mrr: 18340,
        overdue: 2280,
        customers: 248,
        activeSubscriptions: 224,
        routersOnline: 3,
        routersTotal: 4,
        wireguardConnected: 3,
        wireguardTotal: 4,
      },
      routers: [
        {
          id: "router-hq",
          name: "Juba Core Router",
          siteName: "Juba HQ",
          role: "core",
          status: "online",
          host: "100.64.0.1",
          username: "api-supabill",
          routerOsVersion: "7.18.2",
          lastSeenAt: "2026-03-24T08:58:00.000Z",
        },
      ],
      plans: [
        {
          id: "plan-home-10",
          name: "Home 10M",
          profileName: "HOME-10M",
          serviceType: "pppoe",
          price: 35,
          validityDays: 30,
          speedDownKbps: 10240,
          speedUpKbps: 4096,
        },
      ],
      customers: [
        {
          id: "cust-001",
          fullName: "Atem Kuol",
          accountNumber: "NF-10021",
          status: "active",
          activePlan: "Business 30M",
          renewsAt: "2026-03-30T00:00:00.000Z",
          balance: 0,
        },
      ],
      invoices: [
        {
          id: "inv-001",
          invoiceNumber: "NF-INV-2026-0314",
          customerName: "Nyandeng James",
          status: "overdue",
          amount: 35,
          balance: 35,
          dueDate: "2026-03-20T00:00:00.000Z",
        },
      ],
      wireguardPeers: [
        {
          id: "peer-001",
          routerId: "router-hq",
          routerName: "Juba Core Router",
          name: "NOC Laptop",
          status: "connected",
          endpoint: "noc.nilefiber.example:51820",
          allowedIps: "10.200.0.2/32,10.10.0.0/16",
          interfaceAddress: "10.200.0.2/32",
          dns: "1.1.1.1",
          publicKey: "OC8tY3J4dnhsLXNhbXBsZS1wdWJsaWMta2V5",
          presharedKey: "k3J1c3QtZGVtby1wcmVzaGFyZWQ=",
          persistentKeepalive: 25,
          lastHandshakeAt: "2026-03-24T08:57:00.000Z",
        },
      ],
      features: [
        {
          id: "feature-collections",
          featureKey: "collections",
          name: "Collections Workflow",
          status: "active",
          config: { channels: ["cash", "mobile_money"], reminderCadenceDays: 3 },
        },
      ],
      recentPayments: [
        {
          id: "pay-001",
          customerName: "Atem Kuol",
          amount: 95,
          method: "bank_transfer",
          paidAt: "2026-03-23T15:15:00.000Z",
          reference: "TRX-928212",
        },
      ],
    },
  ],
};

export async function getPlatformOverview(): Promise<PlatformSnapshot> {
  try {
    const response = await fetch(`${env.NEXT_PUBLIC_SERVER_URL}/api/platform/overview`, {
      next: { revalidate: 30 },
    });

    if (!response.ok) {
      return fallbackSnapshot;
    }

    return (await response.json()) as PlatformSnapshot;
  } catch {
    return fallbackSnapshot;
  }
}
