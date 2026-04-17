import { db } from "@supabill/db";
import {
  businessFeature,
  customer,
  invoice,
  payment,
  router,
  servicePlan,
  subscription,
  tenant,
  wireguardPeer,
} from "@supabill/db/schema";

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

const demoSnapshot: PlatformSnapshot = {
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
        {
          id: "router-east",
          name: "Kator POP",
          siteName: "Kator",
          role: "pop",
          status: "online",
          host: "100.64.0.14",
          username: "api-supabill",
          routerOsVersion: "7.18.2",
          lastSeenAt: "2026-03-24T08:56:00.000Z",
        },
        {
          id: "router-west",
          name: "Munuki POP",
          siteName: "Munuki",
          role: "pop",
          status: "warning",
          host: "100.64.0.27",
          username: "api-supabill",
          routerOsVersion: "7.17.1",
          lastSeenAt: "2026-03-24T08:43:00.000Z",
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
        {
          id: "plan-business-30",
          name: "Business 30M",
          profileName: "BIZ-30M",
          serviceType: "pppoe",
          price: 95,
          validityDays: 30,
          speedDownKbps: 30720,
          speedUpKbps: 10240,
        },
        {
          id: "plan-hotspot-day",
          name: "Hotspot Daily",
          profileName: "HS-DAY",
          serviceType: "hotspot",
          price: 2,
          validityDays: 1,
          speedDownKbps: 4096,
          speedUpKbps: 1024,
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
        {
          id: "cust-002",
          fullName: "Nyandeng James",
          accountNumber: "NF-10388",
          status: "grace",
          activePlan: "Home 10M",
          renewsAt: "2026-03-25T00:00:00.000Z",
          balance: 35,
        },
        {
          id: "cust-003",
          fullName: "Lodu Cafe",
          accountNumber: "NF-10902",
          status: "suspended",
          activePlan: "Hotspot Daily",
          renewsAt: "2026-03-22T00:00:00.000Z",
          balance: 12,
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
        {
          id: "inv-002",
          invoiceNumber: "NF-INV-2026-0318",
          customerName: "Atem Kuol",
          status: "paid",
          amount: 95,
          balance: 0,
          dueDate: "2026-03-23T00:00:00.000Z",
        },
        {
          id: "inv-003",
          invoiceNumber: "NF-INV-2026-0320",
          customerName: "Lodu Cafe",
          status: "open",
          amount: 12,
          balance: 12,
          dueDate: "2026-03-27T00:00:00.000Z",
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
        {
          id: "peer-002",
          routerId: "router-east",
          routerName: "Kator POP",
          name: "Field Tablet",
          status: "connected",
          endpoint: "field.nilefiber.example:51820",
          allowedIps: "10.200.0.3/32,10.20.0.0/24",
          interfaceAddress: "10.200.0.3/32",
          dns: "1.1.1.1",
          publicKey: "ZmllbGQtdGFibGV0LXB1YmxpYy1rZXk=",
          presharedKey: "ZmllbGQtdGFibGV0LXByZXNoYXJlZA==",
          persistentKeepalive: 25,
          lastHandshakeAt: "2026-03-24T08:51:00.000Z",
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
        {
          id: "feature-messages",
          featureKey: "messaging",
          name: "Customer Messaging",
          status: "planned",
          config: { provider: "future-adapter", templates: 6 },
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
        {
          id: "pay-002",
          customerName: "Jebel Pharmacy",
          amount: 55,
          method: "mobile_money",
          paidAt: "2026-03-23T11:00:00.000Z",
          reference: "MM-120033",
        },
      ],
    },
    {
      id: "tenant-savanna",
      name: "Savanna Hotspot",
      slug: "savanna-hotspot",
      currency: "SSP",
      status: "trial",
      metrics: {
        mrr: 720000,
        overdue: 91000,
        customers: 86,
        activeSubscriptions: 69,
        routersOnline: 2,
        routersTotal: 2,
        wireguardConnected: 1,
        wireguardTotal: 2,
      },
      routers: [
        {
          id: "router-bor",
          name: "Bor Gateway",
          siteName: "Bor Town",
          role: "branch",
          status: "online",
          host: "172.16.8.1",
          username: "api-supabill",
          routerOsVersion: "7.18.2",
          lastSeenAt: "2026-03-24T08:55:00.000Z",
        },
      ],
      plans: [
        {
          id: "plan-weekly",
          name: "Weekly 5G",
          profileName: "WEEKLY-5G",
          serviceType: "hotspot",
          price: 12000,
          validityDays: 7,
          speedDownKbps: 5120,
          speedUpKbps: 2048,
        },
      ],
      customers: [
        {
          id: "cust-bor-1",
          fullName: "Freedom Tech Hub",
          accountNumber: "SV-0008",
          status: "active",
          activePlan: "Weekly 5G",
          renewsAt: "2026-03-28T00:00:00.000Z",
          balance: 0,
        },
      ],
      invoices: [
        {
          id: "inv-bor-1",
          invoiceNumber: "SV-INV-017",
          customerName: "Freedom Tech Hub",
          status: "open",
          amount: 12000,
          balance: 12000,
          dueDate: "2026-03-28T00:00:00.000Z",
        },
      ],
      wireguardPeers: [
        {
          id: "peer-bor-1",
          routerId: "router-bor",
          routerName: "Bor Gateway",
          name: "Owner Phone",
          status: "pending",
          endpoint: "savanna.remote.example:51820",
          allowedIps: "10.210.0.2/32",
          interfaceAddress: "10.210.0.2/32",
          dns: "1.1.1.1",
          publicKey: "c2F2YW5uYS1waG9uZS1wdWJsaWM=",
          presharedKey: null,
          persistentKeepalive: 25,
          lastHandshakeAt: null,
        },
      ],
      features: [
        {
          id: "feature-vouchers",
          featureKey: "voucher-batches",
          name: "Voucher Batch Generator",
          status: "active",
          config: { batchSize: 100, printTemplate: "thermal-a6" },
        },
      ],
      recentPayments: [
        {
          id: "pay-bor-1",
          customerName: "Freedom Tech Hub",
          amount: 12000,
          method: "cash",
          paidAt: "2026-03-22T13:00:00.000Z",
          reference: null,
        },
      ],
    },
  ],
};

export async function getPlatformSnapshot(): Promise<PlatformSnapshot> {
  try {
    const [tenants, routers, peers, plans, customers, subscriptions, invoices, payments, features] =
      await Promise.all([
        db.select().from(tenant).orderBy(tenant.name),
        db.select().from(router).orderBy(router.name),
        db.select().from(wireguardPeer).orderBy(wireguardPeer.name),
        db.select().from(servicePlan).orderBy(servicePlan.name),
        db.select().from(customer).orderBy(customer.fullName),
        db.select().from(subscription),
        db.select().from(invoice),
        db.select().from(payment),
        db.select().from(businessFeature).orderBy(businessFeature.name),
      ]);

    if (tenants.length === 0) {
      return demoSnapshot;
    }

    const snapshotTenants = tenants.map((currentTenant) => {
      const tenantRouters = routers.filter((item) => item.tenantId === currentTenant.id);
      const tenantPeers = peers.filter((item) => item.tenantId === currentTenant.id);
      const tenantPlans = plans.filter((item) => item.tenantId === currentTenant.id);
      const tenantCustomers = customers.filter((item) => item.tenantId === currentTenant.id);
      const tenantSubscriptions = subscriptions
        .filter((item) => item.tenantId === currentTenant.id)
        .sort((left, right) => right.renewsAt.getTime() - left.renewsAt.getTime());
      const tenantInvoices = invoices
        .filter((item) => item.tenantId === currentTenant.id)
        .sort((left, right) => right.dueDate.getTime() - left.dueDate.getTime());
      const tenantPayments = payments
        .filter((item) => item.tenantId === currentTenant.id)
        .sort((left, right) => right.paidAt.getTime() - left.paidAt.getTime());
      const tenantFeatures = features.filter((item) => item.tenantId === currentTenant.id);

      const customerMap = new Map(tenantCustomers.map((item) => [item.id, item]));
      const planMap = new Map(tenantPlans.map((item) => [item.id, item]));
      const routerMap = new Map(tenantRouters.map((item) => [item.id, item]));

      return {
        id: currentTenant.id,
        name: currentTenant.name,
        slug: currentTenant.slug,
        currency: currentTenant.currency,
        status: currentTenant.status,
        metrics: {
          mrr: tenantSubscriptions.reduce((sum, item) => {
            const plan = planMap.get(item.planId);
            return sum + Number(plan?.price ?? 0);
          }, 0),
          overdue: tenantInvoices
            .filter((item) => item.status === "overdue")
            .reduce((sum, item) => sum + Number(item.balance), 0),
          customers: tenantCustomers.length,
          activeSubscriptions: tenantSubscriptions.filter((item) => item.status === "active").length,
          routersOnline: tenantRouters.filter((item) => item.status === "online").length,
          routersTotal: tenantRouters.length,
          wireguardConnected: tenantPeers.filter((item) => item.status === "connected").length,
          wireguardTotal: tenantPeers.length,
        },
        routers: tenantRouters.map((item) => ({
          id: item.id,
          name: item.name,
          siteName: item.siteName,
          role: item.role,
          status: item.status,
          host: item.host,
          username: item.username,
          routerOsVersion: item.routerOsVersion,
          lastSeenAt: item.lastSeenAt?.toISOString() ?? null,
        })),
        plans: tenantPlans.map((item) => ({
          id: item.id,
          name: item.name,
          profileName: item.profileName,
          serviceType: item.serviceType,
          price: Number(item.price),
          validityDays: item.validityDays,
          speedDownKbps: item.speedDownKbps,
          speedUpKbps: item.speedUpKbps,
        })),
        customers: tenantSubscriptions.slice(0, 6).map((item) => ({
          id: item.customerId,
          fullName: customerMap.get(item.customerId)?.fullName ?? "Unknown customer",
          accountNumber: customerMap.get(item.customerId)?.accountNumber ?? "-",
          status: item.status,
          activePlan: planMap.get(item.planId)?.name ?? "Unassigned plan",
          renewsAt: item.renewsAt.toISOString(),
          balance: tenantInvoices
            .filter((invoiceItem) => invoiceItem.customerId === item.customerId)
            .reduce((sum, invoiceItem) => sum + Number(invoiceItem.balance), 0),
        })),
        invoices: tenantInvoices.slice(0, 6).map((item) => ({
          id: item.id,
          invoiceNumber: item.invoiceNumber,
          customerName: customerMap.get(item.customerId)?.fullName ?? "Unknown customer",
          status: item.status,
          amount: Number(item.amount),
          balance: Number(item.balance),
          dueDate: item.dueDate.toISOString(),
        })),
        wireguardPeers: tenantPeers.map((item) => ({
          id: item.id,
          routerId: item.routerId,
          routerName: routerMap.get(item.routerId)?.name ?? "Unknown router",
          name: item.name,
          status: item.status,
          endpoint: item.endpoint,
          allowedIps: item.allowedIps,
          interfaceAddress: item.interfaceAddress,
          dns: item.dns,
          publicKey: item.publicKey,
          presharedKey: item.presharedKey,
          persistentKeepalive: item.persistentKeepalive,
          lastHandshakeAt: item.lastHandshakeAt?.toISOString() ?? null,
        })),
        features: tenantFeatures.map((item) => ({
          id: item.id,
          featureKey: item.featureKey,
          name: item.name,
          status: item.status,
          config: item.config ?? {},
        })),
        recentPayments: tenantPayments.slice(0, 6).map((item) => ({
          id: item.id,
          customerName: customerMap.get(item.customerId)?.fullName ?? "Unknown customer",
          amount: Number(item.amount),
          method: item.method,
          paidAt: item.paidAt.toISOString(),
          reference: item.reference,
        })),
      };
    });

    return {
      generatedAt: new Date().toISOString(),
      mode: "database",
      tenants: snapshotTenants,
    };
  } catch {
    return demoSnapshot;
  }
}

export async function getWireguardClientConfig(routerId: string, peerId: string) {
  const snapshot = await getPlatformSnapshot();

  for (const currentTenant of snapshot.tenants) {
    const routerItem = currentTenant.routers.find((item) => item.id === routerId);
    const peerItem = currentTenant.wireguardPeers.find((item) => item.id === peerId);

    if (routerItem && peerItem) {
      return {
        tenantName: currentTenant.name,
        routerName: routerItem.name,
        peerName: peerItem.name,
        config: [
          "[Interface]",
          `Address = ${peerItem.interfaceAddress}`,
          `PrivateKey = <replace-with-${peerItem.name.toLowerCase().replaceAll(" ", "-")}-private-key>`,
          `DNS = ${peerItem.dns}`,
          "",
          "[Peer]",
          "PublicKey = <router-public-key>",
          peerItem.presharedKey ? `PresharedKey = ${peerItem.presharedKey}` : null,
          `AllowedIPs = ${peerItem.allowedIps}`,
          `Endpoint = ${peerItem.endpoint}`,
          `PersistentKeepalive = ${peerItem.persistentKeepalive}`,
        ]
          .filter(Boolean)
          .join("\n"),
      };
    }
  }

  return null;
}

export async function getTenantBySlug(slug: string) {
  try {
    const tenantRecords = await db.select().from(tenant);
    const tenantRecord = tenantRecords.find((item) => item.slug === slug);

    if (!tenantRecord) {
      return demoSnapshot.tenants.find((item) => item.slug === slug) ?? null;
    }

    const snapshot = await getPlatformSnapshot();
    return snapshot.tenants.find((item) => item.id === tenantRecord.id) ?? null;
  } catch {
    return demoSnapshot.tenants.find((item) => item.slug === slug) ?? null;
  }
}
