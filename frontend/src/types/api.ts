export type ApiResponse<T> = {
  success: boolean;
  data: T | null;
  message: string | null;
  error_code?: string | null;
};

export type HealthData = {
  status: string;
  database: string;
  version: string;
};

export type PaginationMeta = {
  page: number;
  page_size: number;
  total: number;
};

export type RiskLevel = "low" | "medium" | "high" | "critical";
export type PriorityLevel = "low" | "medium" | "high" | "urgent";
export type MessageChannel = "email" | "whatsapp" | "sms" | "sales_call";
export type MessageTone = "professional" | "friendly" | "concise" | "premium";

export type RiskFactor = {
  feature: string;
  label: string;
  contribution: number;
  effect: "increases_predicted_risk" | "decreases_predicted_risk" | string;
};

export type Explanation = {
  headline: string;
  disclaimer: string;
  factors: RiskFactor[];
};

export type CustomerSummary = {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  company: string | null;
  plan: string | null;
  status: string;
  country: string | null;
  segment: string;
  segment_label: string;
  is_high_value: boolean;
  monthly_spend: number;
  tenure_months: number;
  total_orders: number;
  days_since_last_order: number;
  last_seen_at: string | null;
  churn_probability: number | null;
  risk_level: RiskLevel | null;
  priority_score: number | null;
  priority_level: PriorityLevel | null;
  retention_opportunity: number | null;
  revenue_at_risk: number | null;
  revenue_at_risk_is_estimate: boolean;
};

export type CustomerDetail = CustomerSummary & {
  billing_interval: string | null;
  signup_date: string | null;
  support_tickets: number;
  complaint_count: number;
  payment_failures: number;
  email_engagement: number;
  login_frequency: number;
  purchase_frequency: number;
  average_order_value: number;
  discount_usage: number;
  features: Record<string, number>;
};

export type CustomerListData = {
  items: CustomerSummary[];
  pagination: PaginationMeta;
};

export type PredictionData = {
  customer_id: string;
  churn_probability: number;
  risk_level: RiskLevel;
  model_name: string;
  model_version: string;
  predicted_at: string;
  revenue_at_risk: number;
  revenue_at_risk_is_estimate: boolean;
  priority_score: number;
  priority_level: PriorityLevel;
  explanation: Explanation;
  features: Record<string, number>;
};

export type RiskFactorsData = {
  customer_id: string;
  headline: string;
  disclaimer: string;
  churn_probability: number;
  risk_level: RiskLevel;
  factors: RiskFactor[];
};

export type GeminiRetentionOutput = {
  strategy: string;
  priority: string;
  reasoning: string;
  recommended_action: string;
  channel: string;
  incentive: string | null;
};

export type RetentionRecord = {
  id: string;
  customer_id: string;
  prediction_id: string | null;
  action_type: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  source: string;
  strategy: string | null;
  reasoning: string | null;
  recommended_action: string | null;
  channel: string | null;
  incentive: string | null;
  created_at: string;
};

export type RetentionListData = {
  items: RetentionRecord[];
};

export type GenerateMessageRequest = {
  channel: MessageChannel;
  tone: MessageTone;
};

export type GeneratedMessageData = {
  id: string;
  customer_id: string;
  channel: string;
  tone: string | null;
  subject: string | null;
  body: string;
  status: string;
  generated_by: string | null;
  send_status: "not_sent";
  created_at: string;
};

export type CountMetric = {
  key: string;
  count: number;
  share: number;
};

export type TrendPoint = {
  period: string;
  churn_rate: number;
  churned_customers: number;
  base_customers: number;
};

export type SegmentRow = {
  segment: string;
  label: string;
  customer_count: number;
  observed_churn_rate: number;
  average_churn_probability: number | null;
  monthly_revenue: number;
  revenue_at_risk: number;
  revenue_at_risk_is_estimate: boolean;
};

export type ModelInfo = {
  name?: string;
  version?: string;
  trained_at?: string;
  feature_names?: string[];
  metrics?: Record<string, number | null>;
};

export type DashboardSummary = {
  total_customers: number;
  active_customers: number;
  churned_customers: number;
  observed_churn_rate: number;
  at_risk_customers: number;
  predicted_high_risk_customers: number;
  total_monthly_revenue: number;
  total_revenue_at_risk: number;
  annualized_revenue_at_risk: number;
  high_value_revenue_at_risk: number;
  retention_opportunity_customers: number;
  retention_opportunity_value: number;
  scored_customers: number;
  estimates_label: string;
  risk_distribution: CountMetric[];
  churn_trend: TrendPoint[];
  revenue_at_risk_by_segment: SegmentRow[];
  segment_distribution: CountMetric[];
  model: ModelInfo | null;
};

export type SegmentListData = {
  items: SegmentRow[];
  estimates_label: string;
};

export type BandRow = {
  band: string;
  customer_count: number;
  observed_churn_rate: number;
  average_churn_probability: number | null;
};

export type ChurnAnalyticsData = {
  observed_churn_rate: number;
  predicted_average_probability: number | null;
  risk_distribution: CountMetric[];
  churn_by_plan: CountMetric[];
  churn_by_segment: SegmentRow[];
  churn_trend: TrendPoint[];
  churn_by_tenure: BandRow[];
  churn_by_spend: BandRow[];
  engagement_vs_churn: BandRow[];
  support_vs_churn: BandRow[];
};

export type RiskCategoryRow = {
  risk_level: string;
  customer_count: number;
  revenue_at_risk: number;
  revenue_at_risk_is_estimate: boolean;
};

export type RetentionOpportunityRow = {
  customer_id: string;
  name: string | null;
  company: string | null;
  segment: string;
  segment_label: string;
  churn_probability: number;
  risk_level: RiskLevel;
  monthly_spend: number;
  revenue_at_risk: number;
  priority_score: number;
  priority_level: PriorityLevel;
};

export type RevenueRiskData = {
  estimates_label: string;
  total_revenue_at_risk: number;
  annualized_revenue_at_risk: number;
  high_value_customer_revenue_at_risk: number;
  by_risk_category: RiskCategoryRow[];
  by_segment: SegmentRow[];
  retention_opportunities: RetentionOpportunityRow[];
};

export type InsightItem = {
  title: string;
  body: string;
  metric_name: string;
  metric_value: number | null;
  severity: string;
  source: "calculated" | "gemini";
};

export type InsightsData = {
  items: InsightItem[];
  metrics_used: Record<string, unknown>;
};

export type PlatformSettingsData = {
  risk_thresholds: Record<string, number>;
  priority_weights: Record<string, number>;
  message_channels: MessageChannel[];
  message_tones: MessageTone[];
  retention_actions: string[];
  segments: Array<{ key: string; label: string }>;
  model: ModelInfo | null;
  demo_seed: number;
  demo_customer_count: number;
};

export type CsvIssue = {
  row_number: number;
  field: string | null;
  code: string;
  message: string;
};

export type CsvValidationData = {
  preview: Array<Record<string, unknown>>;
  stats: Record<string, number>;
  issues: CsvIssue[];
  persisted: number;
};

export type PredictionRunData = {
  scored_customers: number;
  model_name: string;
  model_version: string;
  metrics: Record<string, unknown>;
};

export type DemoLoadData = {
  customers_loaded: number;
  transactions_loaded: number;
  activities_loaded: number;
  support_events_loaded: number;
  predictions: PredictionRunData | null;
};
