import { api } from "@/services/api";
import type { ApiResponse, HealthData } from "@/types/api";

export async function fetchHealth(): Promise<ApiResponse<HealthData>> {
  const response = await api.get<ApiResponse<HealthData>>("/health");
  return response.data;
}
