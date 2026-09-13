import { getData, postData } from "@/services/api";
import type {
  ChurnAnalyticsData,
  CsvValidationData,
  CustomerDetail,
  CustomerListData,
  DashboardSummary,
  DemoLoadData,
  GeneratedMessageData,
  GenerateMessageRequest,
  HealthData,
  InsightsData,
  PlatformSettingsData,
  PredictionData,
  PredictionRunData,
  RetentionListData,
  RetentionRecord,
  RevenueRiskData,
  RiskFactorsData,
  SegmentListData,
} from "@/types/api";

export type CustomerQuery = {
  search?: string;
  status?: string;
  plan?: string;
  risk_level?: string;
  segment?: string;
  high_value_only?: boolean;
  sort_by?: string;
  sort_dir?: "asc" | "desc";
  page?: number;
  page_size?: number;
};

function pruneQuery(query: CustomerQuery): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(query).filter(([, value]) => value !== undefined && value !== null && value !== "" && value !== false),
  );
}

export const churnpilot = {
  health: () => getData<HealthData>("/health"),
  dashboardSummary: () => getData<DashboardSummary>("/dashboard/summary"),
  customers: (query: CustomerQuery = {}) => getData<CustomerListData>("/customers", pruneQuery(query)),
  customer: (id: string) => getData<CustomerDetail>(`/customers/${id}`),
  prediction: (id: string) => getData<PredictionData>(`/customers/${id}/prediction`),
  riskFactors: (id: string) => getData<RiskFactorsData>(`/customers/${id}/risk-factors`),
  retention: (id: string) => getData<RetentionListData>(`/customers/${id}/retention`),
  generateRetention: (id: string) => postData<RetentionRecord>(`/customers/${id}/generate-retention`),
  generateMessage: (id: string, body: GenerateMessageRequest) =>
    postData<GeneratedMessageData>(`/customers/${id}/generate-message`, body),
  segments: () => getData<SegmentListData>("/segments"),
  insights: () => getData<InsightsData>("/insights"),
  churnAnalytics: () => getData<ChurnAnalyticsData>("/analytics/churn"),
  revenueRisk: () => getData<RevenueRiskData>("/analytics/revenue-risk"),
  platformSettings: () => getData<PlatformSettingsData>("/settings"),
  runPredictions: () => postData<PredictionRunData>("/predictions/run"),
  loadDemo: () => postData<DemoLoadData>("/demo/load"),
  uploadCsv: (file: File, persist: boolean) => {
    const form = new FormData();
    form.append("file", file);
    return postData<CsvValidationData>(`/upload/csv?persist=${persist ? "true" : "false"}`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
};
