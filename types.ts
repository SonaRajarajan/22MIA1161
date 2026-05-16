/**
 * @file utils/types.ts
 * @description Shared TypeScript types for the frontend application.
 */

export type NotificationType = "Placement" | "Event" | "Result" | "All";

export interface Notification {
  ID: string;
  Type: "Placement" | "Event" | "Result";
  Message: string;
  Timestamp: string;
  isRead?: boolean;
}

export interface PrioritisedNotification extends Notification {
  priorityScore: number;
}

export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  limit: number;
}

export interface NotificationsApiResponse {
  success: boolean;
  data: {
    notifications: Notification[];
    pagination: PaginationInfo;
  };
}

export interface PriorityApiResponse {
  success: boolean;
  data: {
    topN: number;
    notifications: PrioritisedNotification[];
  };
}
