/**
 * Authoritative Server Timing & Clock Sync Helper
 * SRS Requirements:
 * - FR-TIME-001: The backend is authoritative for all deadlines; client clocks are never trusted
 * - FR-TIME-008: Authoritative remaining-time synchronization helper (display only)
 * - FR-UI-004: Server-synchronized countdown timer with low-time warning
 * - FR-UI-008: Connection status monitoring notifying candidate of network interruptions
 * - Non-Negotiable Rule 1: Client clocks are never used for decisions
 * - Non-Negotiable Rule 9: Timestamps are UTC ISO-8601
 */

export type ConnectionStatus = 'online' | 'degraded' | 'offline';

class TimeSyncService {
  private serverOffsetMs = 0;
  private lastSyncTime: number | null = null;
  private connectionStatus: ConnectionStatus = 'online';
  private listeners: Array<(status: ConnectionStatus) => void> = [];

  /**
   * Synchronizes server time and computes offset
   * offset = serverTime - (clientSend + clientReceive) / 2
   */
  public recordServerTime(serverIsoUtc: string, roundTripStartMs: number, roundTripEndMs: number): void {
    const serverMs = new Date(serverIsoUtc).getTime();
    const networkLatencyMs = Math.max(0, (roundTripEndMs - roundTripStartMs) / 2);
    const estimatedClientArrivalMs = roundTripStartMs + networkLatencyMs;

    this.serverOffsetMs = serverMs - estimatedClientArrivalMs;
    this.lastSyncTime = roundTripEndMs;
    this.setConnectionStatus('online');
  }

  /**
   * Returns current estimated authoritative server time (UTC)
   * Strictly display-only helper (FR-TIME-001)
   */
  public getSyncedServerTime(): Date {
    const nowClientMs = Date.now();
    return new Date(nowClientMs + this.serverOffsetMs);
  }

  /**
   * Calculates remaining seconds to a server deadline
   */
  public getRemainingSeconds(deadlineIsoUtc: string): number {
    const deadlineMs = new Date(deadlineIsoUtc).getTime();
    const currentServerMs = this.getSyncedServerTime().getTime();
    const diffSeconds = Math.floor((deadlineMs - currentServerMs) / 1000);
    return Math.max(0, diffSeconds);
  }

  /**
   * Formats seconds into HH:MM:SS or MM:SS display (per UI Sample: 01:12:45)
   */
  public formatTimeDisplay(totalSeconds: number): string {
    const clamped = Math.max(0, Math.floor(totalSeconds));
    const hours = Math.floor(clamped / 3600);
    const minutes = Math.floor((clamped % 3600) / 60);
    const seconds = clamped % 60;

    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }

  public getConnectionStatus(): ConnectionStatus {
    return this.connectionStatus;
  }

  public setConnectionStatus(status: ConnectionStatus): void {
    if (this.connectionStatus !== status) {
      this.connectionStatus = status;
      this.notifyListeners();
    }
  }

  public onStatusChange(callback: (status: ConnectionStatus) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      listener(this.connectionStatus);
    }
  }

  public getOffsetMs(): number {
    return this.serverOffsetMs;
  }

  public getLastSyncTime(): number | null {
    return this.lastSyncTime;
  }
}

export const timeSync = new TimeSyncService();
