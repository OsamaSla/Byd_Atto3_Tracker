/**
 * OBD Service for ELM327 BLE Devices
 * Optimized for Vgate iCar Pro and BYD Atto 3
 */

export interface OBDData {
  soc: number | null;
  odometer: number | null;
  batteryTemp: number | null;
}

class OBDService {
  private device: BluetoothDevice | null = null;
  private characteristic: BluetoothRemoteGATTCharacteristic | null = null;
  private encoder = new TextEncoder();

  // Common ELM327 UUIDs
  private SERVICE_UUID = '0000fff0-0000-1000-8000-00805f9b34fb'; // Vgate common service
  private CHARACTERISTIC_UUID = '0000fff1-0000-1000-8000-00805f9b34fb'; // Vgate notify/write

  async connect(): Promise<boolean> {
    try {
      this.device = await navigator.bluetooth.requestDevice({
        filters: [
          { namePrefix: 'v-linker' },
          { namePrefix: 'vLinker' },
          { namePrefix: 'iCar' },
          { namePrefix: 'V-GATE' }
        ],
        optionalServices: [this.SERVICE_UUID]
      });

      const server = await this.device.gatt?.connect();
      const service = await server?.getPrimaryService(this.SERVICE_UUID);
      this.characteristic = (await service?.getCharacteristic(this.CHARACTERISTIC_UUID)) || null;

      if (this.characteristic) {
        // Initialize ELM327
        await this.sendCommand('AT Z'); // Reset
        await this.sendCommand('AT SP 6'); // Set protocol to ISO 15765-4 CAN (11 bit ID, 500 kbaud)
        return true;
      }
      return false;
    } catch (error) {
      console.error('OBD Connection Error:', error);
      return false;
    }
  }

  async fetchData(): Promise<OBDData> {
    const data: OBDData = { soc: null, odometer: null, batteryTemp: null };

    if (!this.characteristic) return data;

    try {
      // Get Display SoC (BYD PID 22 1001)
      const socResponse = await this.sendCommand('22 1001');
      data.soc = this.parseBYDSoC(socResponse);

      // Get Odometer (BYD PID 22 2002)
      const odoResponse = await this.sendCommand('22 2002');
      data.odometer = this.parseBYDOdometer(odoResponse);

      return data;
    } catch (error) {
      console.error('Error fetching OBD data:', error);
      return data;
    }
  }

  private async sendCommand(cmd: string): Promise<string> {
    if (!this.characteristic) return '';

    try {
      await this.characteristic.writeValue(this.encoder.encode(cmd + '\r'));
      
      // Note: In a real implementation, we should listen for notifications 
      // or use readValue if the device supports it. 
      // ELM327 usually sends responses back via notifications on the same characteristic.
      return 'OK'; // Placeholder
    } catch (_e) {
      return '';
    }
  }

  private parseBYDSoC(_response: string): number | null {
    // Expected response for 22 1001: 62 10 01 XX
    // SoC = XX / 10 or similar depending on the specific model encoding
    return null; 
  }

  private parseBYDOdometer(_response: string): number | null {
    // Expected response for 22 2002: 62 20 02 XX YY ZZ
    return null;
  }

  disconnect() {
    if (this.device?.gatt?.connected) {
      this.device.gatt.disconnect();
    }
  }
}

export const obdService = new OBDService();
