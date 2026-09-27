import ping from "ping";
import net from "node:net";
import os from "node:os";
import { exec } from "node:child_process";
import { promisify } from "node:util";

import { MacVendorService } from "./mac-vendor.service";

const execAsync = promisify(exec);

export type DeviceType =
  | "router"
  | "laptop"
  | "desktop"
  | "mobile"
  | "tablet"
  | "unknown";

export type DetectionConfidence = "high" | "probable" | "low" | "unknown";

export interface NetworkDevice {
  ip: string;
  mac: string;
  hostname: string;
  manufacturer: string;
  deviceType: DeviceType;
  confidence: DetectionConfidence;
  detectionMethod: string;
  openPorts: number[];
  status: "online";
}

export class NetworkService {
  private readonly macVendorService = new MacVendorService();

  private readonly portsToScan = [
    22, // SSH
    80, // HTTP
    443, // HTTPS
    445, // Windows SMB
    3389, // Windows RDP
    5900, // VNC
    8080, // HTTP alternative
    62078, // Apple-related service
  ];

  async discoverDevices(): Promise<NetworkDevice[]> {
    const subnet = this.getLocalSubnet();

    console.log(`Scanning network: ${subnet}.0/24`);

    /*
     * Get the local machine information.
     * This helps identify the PC running RemoteDesk.
     */
    const localDevice = this.getLocalNetworkInfo();

    /*
     * First ping all devices.
     */
    const aliveIps: string[] = [];

    const pingPromises = [];

    for (let i = 1; i <= 254; i++) {
      const ip = `${subnet}.${i}`;

      pingPromises.push(
        this.checkPing(ip).then((alive) => {
          if (alive) {
            aliveIps.push(ip);
          }
        }),
      );
    }

    await Promise.all(pingPromises);

    console.log(`Alive devices found: ${aliveIps.length}`);

    /*
     * Refresh ARP table AFTER pinging.
     *
     * This is important because pinging the devices
     * causes Windows to populate the ARP table.
     */
    const arpTable = await this.getArpTable();

    const promises = aliveIps.map((ip) =>
      this.checkDevice(ip, arpTable, localDevice),
    );

    const results = await Promise.all(promises);

    const devices = results.filter(
      (device): device is NetworkDevice => device !== null,
    );

    devices.sort((a, b) => this.ipToNumber(a.ip) - this.ipToNumber(b.ip));

    return devices;
  }

  /*
   * ---------------------------------------------------------
   * LOCAL NETWORK
   * ---------------------------------------------------------
   */

  private getLocalSubnet(): string {
    const interfaces = os.networkInterfaces();

    /*
     * Prefer Wi-Fi / Ethernet.
     */
    for (const interfaceName of Object.keys(interfaces)) {
      const networkInterface = interfaces[interfaceName];

      if (!networkInterface) {
        continue;
      }

      const name = interfaceName.toLowerCase();

      if (
        name.includes("virtual") ||
        name.includes("loopback") ||
        name.includes("bluetooth") ||
        name.includes("docker") ||
        name.includes("vmware") ||
        name.includes("hyper-v")
      ) {
        continue;
      }

      if (
        !name.includes("wi-fi") &&
        !name.includes("wifi") &&
        !name.includes("ethernet")
      ) {
        continue;
      }

      for (const network of networkInterface) {
        if (network.family !== "IPv4" || network.internal) {
          continue;
        }

        const parts = network.address.split(".");

        if (parts.length === 4) {
          return parts.slice(0, 3).join(".");
        }
      }
    }

    return "192.168.0";
  }

  private getLocalNetworkInfo(): {
    ip: string;
    mac: string;
  } | null {
    const interfaces = os.networkInterfaces();

    for (const interfaceName of Object.keys(interfaces)) {
      const networkInterface = interfaces[interfaceName];

      if (!networkInterface) {
        continue;
      }

      const name = interfaceName.toLowerCase();

      if (
        name.includes("virtual") ||
        name.includes("loopback") ||
        name.includes("bluetooth") ||
        name.includes("docker") ||
        name.includes("vmware") ||
        name.includes("hyper-v")
      ) {
        continue;
      }

      if (
        !name.includes("wi-fi") &&
        !name.includes("wifi") &&
        !name.includes("ethernet")
      ) {
        continue;
      }

      for (const network of networkInterface) {
        if (network.family !== "IPv4" || network.internal) {
          continue;
        }

        return {
          ip: network.address,
          mac: network.mac.toUpperCase().replace(/:/g, "-"),
        };
      }
    }

    return null;
  }

  /*
   * ---------------------------------------------------------
   * PING
   * ---------------------------------------------------------
   */

  private async checkPing(ip: string): Promise<boolean> {
    try {
      const result = await ping.promise.probe(ip, {
        timeout: 1,
      });

      return result.alive;
    } catch {
      return false;
    }
  }

  /*
   * ---------------------------------------------------------
   * DEVICE
   * ---------------------------------------------------------
   */

  private async checkDevice(
    ip: string,
    arpTable: Map<string, string>,
    localDevice: {
      ip: string;
      mac: string;
    } | null,
  ): Promise<NetworkDevice | null> {
    try {
      let mac = arpTable.get(ip) ?? "Unknown";

      /*
       * Our own machine might not appear in ARP.
       */
      if (localDevice && ip === localDevice.ip) {
        mac = localDevice.mac;
      }

      const hostname = await this.getHostname(ip);

      const manufacturer = this.macVendorService.getManufacturer(mac);

      const openPorts = await this.scanPorts(ip);

      const detection = this.detectDeviceType(
        ip,
        mac,
        hostname,
        manufacturer,
        openPorts,
        localDevice,
      );

      return {
        ip,

        mac,

        hostname,

        manufacturer,

        deviceType: detection.deviceType,

        confidence: detection.confidence,

        detectionMethod: detection.detectionMethod,

        openPorts,

        status: "online",
      };
    } catch (error) {
      console.error(`Failed to inspect ${ip}:`, error);

      return null;
    }
  }

  /*
   * ---------------------------------------------------------
   * ARP
   * ---------------------------------------------------------
   */

  private async getArpTable(): Promise<Map<string, string>> {
    const arpTable = new Map<string, string>();

    try {
      const { stdout } = await execAsync("arp -a");

      const lines = stdout.split("\n");

      for (const line of lines) {
        const match = line.match(
          /^\s*(\d+\.\d+\.\d+\.\d+)\s+([0-9a-f-]{17})\s+/i,
        );

        if (!match) {
          continue;
        }

        const ip = match[1];

        const mac = match[2].toUpperCase();

        /*
         * Ignore broadcast / multicast.
         */
        if (mac === "FF-FF-FF-FF-FF-FF") {
          continue;
        }

        if (mac.startsWith("01-00-5E")) {
          continue;
        }

        if (mac.startsWith("33-33")) {
          continue;
        }

        arpTable.set(ip, mac);
      }
    } catch (error) {
      console.error("Failed to read ARP table:", error);
    }

    return arpTable;
  }

  /*
   * ---------------------------------------------------------
   * PORT SCANNING
   * ---------------------------------------------------------
   */

  private async scanPorts(ip: string): Promise<number[]> {
    const results = await Promise.all(
      this.portsToScan.map((port) => this.checkPort(ip, port)),
    );

    return this.portsToScan.filter((_port, index) => results[index]);
  }

  private checkPort(ip: string, port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const socket = new net.Socket();

      let finished = false;

      const finish = (isOpen: boolean): void => {
        if (finished) {
          return;
        }

        finished = true;

        socket.destroy();

        resolve(isOpen);
      };

      socket.setTimeout(500);

      socket.once("connect", () => {
        finish(true);
      });

      socket.once("timeout", () => {
        finish(false);
      });

      socket.once("error", () => {
        finish(false);
      });

      socket.once("close", () => {
        finish(false);
      });

      socket.connect(port, ip);
    });
  }

  /*
   * ---------------------------------------------------------
   * HOSTNAME
   * ---------------------------------------------------------
   */

  private async getHostname(ip: string): Promise<string> {
    /*
     * Try nslookup first.
     */
    try {
      const { stdout } = await execAsync(`nslookup ${ip}`, {
        timeout: 3000,
      });

      const lines = stdout.split("\n");

      for (const line of lines) {
        const match = line.match(/^\s*Name:\s+(.+)/i);

        if (!match) {
          continue;
        }

        const hostname = match[1].trim();

        if (hostname && hostname !== ip) {
          return hostname;
        }
      }
    } catch {
      // Continue with other detection methods.
    }

    /*
     * Try Windows NetBIOS.
     *
     * This can identify Windows computers
     * even when reverse DNS is unavailable.
     */
    try {
      const { stdout } = await execAsync(`nbtstat -A ${ip}`, {
        timeout: 3000,
      });

      const lines = stdout.split("\n");

      for (const line of lines) {
        const match = line.match(/^\s*([^\s<]+)\s+<00>\s+UNIQUE/i);

        if (match) {
          return match[1].trim();
        }
      }
    } catch {
      // Ignore.
    }

    return "Unknown";
  }

  /*
   * ---------------------------------------------------------
   * DEVICE TYPE DETECTION
   * ---------------------------------------------------------
   */

  private detectDeviceType(
    ip: string,
    mac: string,
    hostname: string,
    manufacturer: string,
    openPorts: number[],
    localDevice: {
      ip: string;
      mac: string;
    } | null,
  ): {
    deviceType: DeviceType;
    confidence: DetectionConfidence;
    detectionMethod: string;
  } {
    const normalizedHostname = hostname.toLowerCase();

    const normalizedManufacturer = manufacturer.toLowerCase();

    /*
     * -------------------------------------------------------
     * 1. LOCAL COMPUTER
     * -------------------------------------------------------
     */

    if (localDevice && ip === localDevice.ip) {
      return {
        deviceType: "desktop",
        confidence: "high",
        detectionMethod: "Local RemoteDesk computer",
      };
    }

    /*
     * -------------------------------------------------------
     * 2. ROUTER
     * -------------------------------------------------------
     */

    if (ip.endsWith(".1")) {
      if (
        normalizedManufacturer.includes("tp-link") ||
        normalizedManufacturer.includes("cisco") ||
        normalizedManufacturer.includes("netgear") ||
        normalizedManufacturer.includes("d-link") ||
        normalizedManufacturer.includes("router")
      ) {
        return {
          deviceType: "router",
          confidence: "high",
          detectionMethod: "Gateway IP + router manufacturer",
        };
      }

      if (openPorts.includes(80) || openPorts.includes(443)) {
        return {
          deviceType: "router",
          confidence: "probable",
          detectionMethod: "Gateway IP + HTTP/HTTPS service",
        };
      }
    }

    /*
     * -------------------------------------------------------
     * 3. EXPLICIT MOBILE HOSTNAME
     * -------------------------------------------------------
     */

    const mobileKeywords = [
      "iphone",
      "android",
      "galaxy",
      "pixel",
      "redmi",
      "xiaomi",
      "oneplus",
      "oppo",
      "vivo",
      "realme",
      "phone",
      "mobile",
    ];

    for (const keyword of mobileKeywords) {
      if (normalizedHostname.includes(keyword)) {
        return {
          deviceType: "mobile",
          confidence: "high",
          detectionMethod: `Hostname contains "${keyword}"`,
        };
      }
    }

    /*
     * -------------------------------------------------------
     * 4. TABLET HOSTNAME
     * -------------------------------------------------------
     */

    if (
      normalizedHostname.includes("ipad") ||
      normalizedHostname.includes("tablet")
    ) {
      return {
        deviceType: "tablet",
        confidence: "high",
        detectionMethod: "Tablet hostname",
      };
    }

    /*
     * -------------------------------------------------------
     * 5. LAPTOP HOSTNAME
     * -------------------------------------------------------
     */

    if (
      normalizedHostname.includes("laptop") ||
      normalizedHostname.includes("notebook") ||
      normalizedHostname.includes("macbook")
    ) {
      return {
        deviceType: "laptop",
        confidence: "high",
        detectionMethod: "Laptop hostname",
      };
    }

    /*
     * -------------------------------------------------------
     * 6. DESKTOP HOSTNAME
     * -------------------------------------------------------
     */

    if (
      normalizedHostname.includes("desktop") ||
      normalizedHostname.includes("workstation") ||
      normalizedHostname.includes("computer") ||
      normalizedHostname.includes("pc")
    ) {
      return {
        deviceType: "desktop",
        confidence: "high",
        detectionMethod: "Desktop hostname",
      };
    }

    /*
     * -------------------------------------------------------
     * 7. WINDOWS DESKTOP
     * -------------------------------------------------------
     *
     * SMB / RDP are strong indicators.
     */

    if (openPorts.includes(445) || openPorts.includes(3389)) {
      return {
        deviceType: "desktop",
        confidence: "high",
        detectionMethod: "Windows SMB/RDP service",
      };
    }

    /*
     * -------------------------------------------------------
     * 8. VNC COMPUTER
     * -------------------------------------------------------
     */

    if (openPorts.includes(5900)) {
      return {
        deviceType: "desktop",
        confidence: "high",
        detectionMethod: "VNC service on port 5900",
      };
    }

    /*
     * -------------------------------------------------------
     * 9. KNOWN COMPUTER MANUFACTURERS
     * -------------------------------------------------------
     */

    const computerManufacturers = [
      "dell",
      "hewlett-packard",
      "hp",
      "lenovo",
      "asus",
      "acer",
      "msi",
      "gigabyte",
    ];

    for (const vendor of computerManufacturers) {
      if (normalizedManufacturer.includes(vendor)) {
        return {
          deviceType: "laptop",
          confidence: "probable",
          detectionMethod: `Computer manufacturer: ${manufacturer}`,
        };
      }
    }

    /*
     * -------------------------------------------------------
     * 10. APPLE SERVICE
     * -------------------------------------------------------
     *
     * Port 62078 is commonly associated
     * with Apple devices/services.
     *
     * Do not call it 100% mobile because
     * Apple computers can also exist on LAN.
     */

    if (openPorts.includes(62078)) {
      return {
        deviceType: "mobile",
        confidence: "probable",
        detectionMethod: "Apple-related service on port 62078",
      };
    }

    /*
     * -------------------------------------------------------
     * 11. RANDOMIZED MAC ADDRESS
     * -------------------------------------------------------
     *
     * Modern phones frequently use private/randomized
     * Wi-Fi MAC addresses.
     *
     * If such a device:
     *
     * - has no Windows services
     * - has no VNC
     * - has no computer manufacturer
     *
     * then mobile is a reasonable LOW-confidence guess.
     */

    if (this.isLocallyAdministeredMac(mac)) {
      return {
        deviceType: "mobile",
        confidence: "low",
        detectionMethod: "Randomized/private MAC + no desktop services",
      };
    }

    /*
     * -------------------------------------------------------
     * 12. UNKNOWN
     * -------------------------------------------------------
     */

    return {
      deviceType: "unknown",
      confidence: "unknown",
      detectionMethod: "No reliable device type information available",
    };
  }

  /*
   * ---------------------------------------------------------
   * RANDOMIZED MAC
   * ---------------------------------------------------------
   */

  private isLocallyAdministeredMac(mac: string): boolean {
    if (!mac || mac === "Unknown") {
      return false;
    }

    const firstByte = parseInt(mac.substring(0, 2), 16);

    if (Number.isNaN(firstByte)) {
      return false;
    }

    /*
     * Bit 1 indicates locally administered MAC.
     */
    return (firstByte & 2) === 2;
  }

  /*
   * ---------------------------------------------------------
   * IP SORT
   * ---------------------------------------------------------
   */

  private ipToNumber(ip: string): number {
    return ip
      .split(".")
      .reduce((result, octet) => result * 256 + Number(octet), 0);
  }
}
