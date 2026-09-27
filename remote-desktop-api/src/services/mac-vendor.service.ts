export class MacVendorService {

  private readonly vendors: Record<string, string> = {

    // Apple
    '00-05-02': 'Apple',
    '00-03-93': 'Apple',
    '00-17-F2': 'Apple',
    '00-1B-63': 'Apple',
    '3C-22-FB': 'Apple',

    // Dell
    '00-14-22': 'Dell',
    '18-03-73': 'Dell',
    'B8-CA-3A': 'Dell',

    // HP
    '00-1A-4B': 'Hewlett-Packard',
    '00-1E-0B': 'Hewlett-Packard',

    // ASUS
    '00-1E-8C': 'ASUSTek',
    '04-92-26': 'ASUSTek',

    // Lenovo
    '00-09-6B': 'Lenovo',

    // TP-Link
    '00-1C-10': 'TP-Link',
    '34-60-F9': 'TP-Link Systems Inc',
    '50-C7-BF': 'TP-Link',
    'C0-06-C3': 'TP-Link',

    // Cisco
    '00-1D-7E': 'Cisco',
    '00-1E-13': 'Cisco',

    // Samsung
    '00-16-6C': 'Samsung',
    '5C-0A-5B': 'Samsung',
    'B4-F1-DA': 'Samsung',

    // Huawei
    '00-07-AB': 'Huawei',
    '00-46-4B': 'Huawei',

    // LG
    '00-17-88': 'LG Electronics',

    // Google
    '3C-5A-B4': 'Google',

    // Microsoft
    '00-15-5D': 'Microsoft',

    // Intel
    '00-1B-21': 'Intel',
    '3C-97-0E': 'Intel',

    // VMware
    '00-50-56': 'VMware'
  };

  getManufacturer(
    mac: string
  ): string {

    if (
      !mac ||
      mac === 'Unknown'
    ) {

      return 'Unknown';

    }

    const normalizedMac =
      mac
        .toUpperCase()
        .replace(/:/g, '-');

    const prefix =
      normalizedMac
        .split('-')
        .slice(0, 3)
        .join('-');

    return (
      this.vendors[prefix] ??
      'Unknown'
    );
  }
}

