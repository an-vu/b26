export type WidgetConfig = Record<string, unknown>;

export type Widget = {
  id: number;
  type: string;
  title: string;
  layout: string;
  config: WidgetConfig;
  enabled: boolean;
  order: number;
};

export type UpsertWidgetRequest = {
  type: string;
  title: string;
  layout: string;
  config: WidgetConfig;
  enabled: boolean;
  order: number;
};
