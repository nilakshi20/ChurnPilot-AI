import axios, { AxiosError } from "axios";

import type { ApiResponse } from "@/types/api";

const baseURL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api";

export const api = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 60_000,
});

export class ApiError extends Error {
  readonly code: string;
  readonly status: number | null;

  constructor(message: string, code = "REQUEST_FAILED", status: number | null = null) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

/**
 * Every backend route answers with the envelope { success, data, message, error_code },
 * so unwrap() is the single place that turns it into a value or a typed error.
 */
export function unwrap<T>(payload: ApiResponse<T>): T {
  if (!payload.success || payload.data === null) {
    throw new ApiError(payload.message ?? "The request could not be completed", payload.error_code ?? "REQUEST_FAILED");
  }
  return payload.data;
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiResponse<unknown>>;
    const body = axiosError.response?.data;
    if (body && typeof body === "object" && "message" in body) {
      return new ApiError(
        body.message ?? "The request could not be completed",
        body.error_code ?? "REQUEST_FAILED",
        axiosError.response?.status ?? null,
      );
    }
    if (axiosError.code === "ECONNABORTED") {
      return new ApiError("The API did not respond in time. Please retry.", "TIMEOUT", null);
    }
    if (!axiosError.response) {
      return new ApiError(
        "Cannot reach the ChurnPilot API. Confirm the FastAPI server is running.",
        "NETWORK_ERROR",
        null,
      );
    }
    return new ApiError(axiosError.message, "REQUEST_FAILED", axiosError.response.status);
  }
  if (error instanceof Error) {
    return new ApiError(error.message);
  }
  return new ApiError("Unexpected error");
}

export async function getData<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  try {
    const response = await api.get<ApiResponse<T>>(url, { params });
    return unwrap(response.data);
  } catch (error) {
    throw toApiError(error);
  }
}

export async function postData<T>(url: string, body?: unknown, config?: { headers?: Record<string, string> }): Promise<T> {
  try {
    const response = await api.post<ApiResponse<T>>(url, body, config);
    return unwrap(response.data);
  } catch (error) {
    throw toApiError(error);
  }
}
