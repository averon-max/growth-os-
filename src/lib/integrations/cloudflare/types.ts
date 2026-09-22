export interface CloudflareDailyGroup {
  dimensions: {
    date: string;
    clientCountryName: string;
    clientDeviceType: string;
    verifiedBotCategory: string;
  };
  count: number;
  sum: {
    visits: number;
    edgeResponseBytes: number;
  };
}

export interface CloudflareDailySummaryGroup {
  dimensions: {
    date: string;
  };
  sum: {
    requests: number;
    bytes: number;
  };
  uniq: {
    uniques: number;
  };
}

export interface CloudflareGraphQLError {
  message: string;
}

export interface CloudflareGraphQLResponse {
  data?: {
    viewer?: {
      zones?: Array<{
        groups?: CloudflareDailyGroup[];
      }>;
    };
  };
  errors?: CloudflareGraphQLError[];
}

export interface CloudflareDailySummaryResponse {
  data?: {
    viewer?: {
      zones?: Array<{
        groups?: CloudflareDailySummaryGroup[];
      }>;
    };
  };
  errors?: CloudflareGraphQLError[];
}

export interface TrafficByCountry {
  country: string;
  requests: number;
  visits: number;
}

export interface TrafficByDevice {
  device: string;
  requests: number;
  visits: number;
}

export interface TrafficByBotCategory {
  category: string;
  requests: number;
}

export interface DailyTrafficData {
  date: string;

  totalRequests: number;
  uniqueVisitors: number;
  bandwidthBytes: number;

  detailAvailable: boolean;
  detailTotalRequests: number;

  byCountry: TrafficByCountry[];
  byDevice: TrafficByDevice[];
  byBotCategory: TrafficByBotCategory[];
}
