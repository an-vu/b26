package com.b26.backend.widget.api;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record SyncWidgetsRequest(
    @NotNull(message = "widgets is required") List<@Valid UpsertWidgetWithIdRequest> widgets) {}
