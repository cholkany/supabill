type DesiredState = {
  dnsServers?: string[];
  ntpServers?: string[];
  timezone?: string;
  hotspotPorts?: string[];
};

export function generateConfig(desiredState: DesiredState): string {
  const dnsServers = desiredState.dnsServers || ["1.1.1.1", "8.8.8.8"];
  const ntpServers = desiredState.ntpServers || ["pool.ntp.org"];
  const timezone = desiredState.timezone || "Africa/Juba";
  const hotspotPorts = desiredState.hotspotPorts || [];

  const scriptLines: string[] = [
    "# SupaBill Desired-State Config Script",
    "",
    "# ── 1. Configure DNS ──",
    `/ip dns set servers="${dnsServers.join(",")}"`,
    "",
    "# ── 2. Configure NTP ──",
    `/system ntp client set enabled=yes servers="${ntpServers.join(",")}"`,
    "",
    "# ── 3. Configure Timezone ──",
    `/system clock set time-zone-name="${timezone}"`,
    "",
  ];

  if (hotspotPorts.length > 0) {
    const portsArrayStr = hotspotPorts.map(p => `"${p}"`).join(",");
    scriptLines.push(
      "# ── 4. Configure Hotspot ──",
      ':local bridgeName "supabill-hotspot"',
      ':local hotspotIp "10.55.0.1"',
      ':local hotspotCidr "10.55.0.1/24"',
      ':local poolRange "10.55.0.10-10.55.0.250"',
      ':local poolName "supabill-pool"',
      ':local profileName "supabill-default"',
      ':local hotspotName "supabill-hotspot"',
      "",
      "# Create bridge if missing",
      ":if ([:len [/interface bridge find name=$bridgeName]] = 0) do={",
      "  /interface bridge add name=$bridgeName protocol-mode=none",
      "}",
      "",
      "# Attach ports to bridge",
      `:foreach port in={${portsArrayStr}} do={`,
      "  :do {",
      "    /interface bridge port remove [find interface=$port]",
      "    /interface bridge port add bridge=$bridgeName interface=$port",
      "  } on-error={}",
      "}",
      "",
      "# Assign IP address to bridge",
      ":if ([:len [/ip address find interface=$bridgeName]] = 0) do={",
      "  /ip address add address=$hotspotCidr interface=$bridgeName",
      "}",
      "",
      "# Create IP pool",
      ":if ([:len [/ip pool find name=$poolName]] = 0) do={",
      "  /ip pool add name=$poolName ranges=$poolRange",
      "}",
      "",
      "# Create Hotspot profile",
      ":if ([:len [/ip hotspot profile find name=$profileName]] = 0) do={",
      '  /ip hotspot profile add name=$profileName hotspot-address=$hotspotIp dns-name="login.supabill.local" rate-limit="10M/10M"',
      "}",
      "",
      "# Create Hotspot server",
      ":if ([:len [/ip hotspot find interface=$bridgeName]] = 0) do={",
      "  /ip hotspot add name=$hotspotName interface=$bridgeName address-pool=$poolName profile=$profileName disabled=no",
      "}"
    );
  }

  return scriptLines.join("\n");
}
