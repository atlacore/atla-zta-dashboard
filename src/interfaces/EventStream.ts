export type EventStreamKind = "webhook" | "splunk_hec";

/** A tenant's export of its events to a SIEM, without its secrets */
export interface EventStream {
  id: string;
  name: string;
  kind: EventStreamKind;
  url: string;
  eventPrefixes: string[];
  includeDecisions: boolean;
  enabled: boolean;
  /** Names of the custom webhook headers; their values are never returned */
  headerNames: string[];
  splunkIndex?: string;
  splunkSourcetype?: string;
  lastDeliveryAt?: string;
  lastError?: string;
  lastErrorAt?: string;
  consecutiveFailures: number;
  nextAttemptAt: string;
  /** How far behind the stream is; about 30-40 s when current */
  lagSeconds: number;
  /** Events lost because they aged past the 7-day window before the SIEM accepted them */
  skippedEvents: number;
  createdAt: string;
}

/** Returned by create and rotate-secret; signingSecret is shown only then */
export interface EventStreamWithSecret extends EventStream {
  signingSecret?: string;
}

export interface EventStreamCreateRequest {
  name: string;
  kind: EventStreamKind;
  url: string;
  eventPrefixes?: string[];
  includeDecisions: boolean;
  enabled?: boolean;
  headers?: Record<string, string>;
  splunkToken?: string;
  splunkIndex?: string;
  splunkSourcetype?: string;
}

export type EventStreamUpdateRequest = Partial<
  Omit<EventStreamCreateRequest, "kind">
>;

export interface EventStreamTestResult {
  delivered: boolean;
  statusCode?: number;
  error?: string;
}
