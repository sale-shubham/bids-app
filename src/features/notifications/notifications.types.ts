export interface NotificationDTO {
  id: string;
  type: string;
  title: string;
  body: string;
  /** In-app path (or absolute URL) to open when the notification is clicked. */
  url: string | null;
  readAt: string | null;
  createdAt: string;
}
