import type { WidgetDraft } from './board-page.widget-edit';

export function applyOnWidgetTypeChange(params: {
  draft: WidgetDraft;
  resetWidgetConfigForType: (draft: WidgetDraft) => void;
  draftValidationErrors: WeakMap<WidgetDraft, string>;
}): void {
  params.resetWidgetConfigForType(params.draft);
  params.draftValidationErrors.delete(params.draft);
}

export function applyOnWidgetDraftFieldChange(params: {
  draft: WidgetDraft;
  draftValidationErrors: WeakMap<WidgetDraft, string>;
  widgetSaveError: string;
}): string {
  params.draftValidationErrors.delete(params.draft);
  if (params.widgetSaveError === 'Fix highlighted widget fields before saving.') {
    return '';
  }
  return params.widgetSaveError;
}

export function getDraftValidationErrorState(params: {
  draft: WidgetDraft;
  draftValidationErrors: WeakMap<WidgetDraft, string>;
}): string {
  return params.draftValidationErrors.get(params.draft) ?? '';
}
