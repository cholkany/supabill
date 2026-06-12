type BootstrapTemplateParams = {
  claimCode: string;
  interfaceName: string;
  routerPrivateKey: string;
  routerTunnelIp: string; // e.g. 10.100.0.2/32
  serverPublicKey: string;
  serverTunnelIp: string; // e.g. 10.100.0.1/32
  serverEndpoint: string; // public-ip:port
  serverBaseUrl: string; // e.g. http://api.yourdomain.com
};

function splitEndpoint(endpoint: string): { host: string; port: string } {
  const trimmed = endpoint.trim();
  if (trimmed.includes("://")) {
    const url = new URL(trimmed);
    return { host: url.hostname, port: url.port || "51820" };
  }
  const noPath = trimmed.split("/")[0] ?? trimmed;
  const parts = noPath.split(":");
  if (parts.length === 2 && parts[0] && parts[1]) {
    return { host: parts[0], port: parts[1] };
  }
  return { host: noPath, port: "51820" };
}

export function generateBootstrapTemplate(params: BootstrapTemplateParams): string {
  const {
    claimCode,
    interfaceName,
    routerPrivateKey,
    routerTunnelIp,
    serverPublicKey,
    serverTunnelIp,
    serverEndpoint,
    serverBaseUrl,
  } = params;

  const serverAllowedIp = serverTunnelIp.split("/")[0] + "/32";
  const { host: endpointHost, port: endpointPort } = splitEndpoint(serverEndpoint);

  // Clean trailing slashes from serverBaseUrl
  const normalizedBaseUrl = serverBaseUrl.replace(/\/+$/, "");

  return [
    "# SupaBill RouterOS Zero-Touch Bootstrap Script",
    "# Clean up existing if any",
    `/interface/wireguard/remove [find name="${interfaceName}"]`,
    "",
    "# 1. Add WireGuard Interface",
    `/interface/wireguard/add name="${interfaceName}" private-key="${routerPrivateKey}" comment="SupaBill Central Hub Tunnel"`,
    "",
    "# 2. Assign Tunnel IP Address",
    `/ip/address/add address="${routerTunnelIp}" interface="${interfaceName}" comment="SupaBill Tunnel Address"`,
    "",
    "# 3. Add SupaBill server as WireGuard Peer",
    `/interface/wireguard/peers/add interface="${interfaceName}" public-key="${serverPublicKey}" allowed-address="${serverAllowedIp}" endpoint-address="${endpointHost}" endpoint-port=${endpointPort} persistent-keepalive=25s comment="SupaBill Central Server"`,
    "",
    "# 4. Security Hardening Firewall Rules",
    "/ip/firewall/address-list/remove [find list=\"supabill-mgmt\"]",
    "/ip/firewall/address-list/add list=\"supabill-mgmt\" address=\"10.100.0.0/16\" comment=\"SupaBill Management IPs\"",
    `/ip/firewall/filter/add chain=input src-address-list=\"supabill-mgmt\" protocol=tcp dst-port=8729 action=accept comment=\"Accept SupaBill API-SSL\"`,
    `/ip/firewall/filter/add chain=input protocol=tcp dst-port=8728 action=drop comment=\"Block unencrypted plain API\"`,
    "",
    "# 5. Execute Registration Callback to SupaBill Server",
    ":local serial \"unknown\"",
    ":do { :set serial [/system routerboard get serial-number] } on-error={}",
    ":local version [/system resource get version]",
    ":local arch [/system resource get architecture-name]",
    ":local ident [/system identity get name]",
    "",
    `:local postdata "{\\\"serialNumber\\\":\\\"$serial\\\",\\\"routerOsVersion\\\":\\\"$version\\\",\\\"architecture\\\":\\\"$arch\\\",\\\"identity\\\":\\\"$ident\\\"}"`,
    `:log info "Registering router to SupaBill at ${normalizedBaseUrl}"`,
    `/tool/fetch url="${normalizedBaseUrl}/router/register/${claimCode}" http-method=post http-header-field="Content-Type: application/json" http-data=$postdata keep-result=no`,
  ].join("\n");
}
