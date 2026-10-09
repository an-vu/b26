import type { Type } from '@angular/core';
import { EmbedWidgetComponent } from './embed-widget/embed-widget';
import { LinkWidgetComponent } from './link-widget/link-widget';
import { MapWidgetComponent } from './map-widget/map-widget';
import { AccountSettingsFormComponent } from '../components/account-settings-form/account-settings-form';
import { SigninFormComponent } from '../components/signin-form/signin-form';
import { SignupFormComponent } from '../components/signup-form/signup-form';
import { UnknownWidgetComponent } from './unknown-widget/unknown-widget';

export const WIDGET_COMPONENT_REGISTRY: Record<string, Type<unknown>> = {
  embed: EmbedWidgetComponent,
  link: LinkWidgetComponent,
  map: MapWidgetComponent,
  // Compatibility for saved system-board widgets; new app pages use these forms directly.
  'user-settings': AccountSettingsFormComponent,
  signin: SigninFormComponent,
  signup: SignupFormComponent,
};

export const DEFAULT_WIDGET_COMPONENT = UnknownWidgetComponent;
