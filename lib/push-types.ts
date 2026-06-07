export interface ScheduledPushReminder {
  id: string;
  fireAt: string;
  title: string;
  body: string;
  url: string;
  tag: string;
  sent?: boolean;
}

export interface PushStore {
  subscriptions: PushSubscriptionJSON[];
  reminders: ScheduledPushReminder[];
  updatedAt: number;
}

export const EMPTY_PUSH_STORE: PushStore = {
  subscriptions: [],
  reminders: [],
  updatedAt: 0,
};
