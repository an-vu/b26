import type { Type } from '@angular/core';
import { EmbedWidgetComponent } from './embed-widget/embed-widget';
import { LinkWidgetComponent } from './link-widget/link-widget';
import { MapWidgetComponent } from './map-widget/map-widget';
import { UserSettingsWidgetComponent } from './user-settings-widget/user-settings-widget';
import { AdminSettingsWidgetComponent } from './admin-settings-widget/admin-settings-widget';
import { SigninWidgetComponent } from './signin-widget/signin-widget';
import { UnknownWidgetComponent } from './unknown-widget/unknown-widget';

export const WIDGET_COMPONENT_REGISTRY: Record<string, Type<unknown>> = {
  embed: EmbedWidgetComponent,
  link: LinkWidgetComponent,
  map: MapWidgetComponent,
  'user-settings': UserSettingsWidgetComponent,
  'admin-settings': AdminSettingsWidgetComponent,
  signin: SigninWidgetComponent,
};

export const DEFAULT_WIDGET_COMPONENT = UnknownWidgetComponent;
