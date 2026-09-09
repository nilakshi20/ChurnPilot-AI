export type ApiResponse<T> = {
  success: boolean;
  data: T | null;
  message: string | null;
};

export type HealthData = {
  status: string;
  database: string;
  version: string;
};
