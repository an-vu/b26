import type { Type } from '@angular/core';
import { EmbedWidgetComponent } from './embed-widget/embed-widget';
import { MapWidgetComponent } from './map-widget/map-widget';
import { UnknownWidgetComponent } from './unknown-widget/unknown-widget';

export const WIDGET_COMPONENT_REGISTRY: Record<string, Type<unknown>> = {
  embed: EmbedWidgetComponent,
  map: MapWidgetComponent,
};

export const DEFAULT_WIDGET_COMPONENT = UnknownWidgetComponent;
