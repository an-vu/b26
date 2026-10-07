package com.b26.backend.board.api;

import com.b26.backend.widget.api.UpsertWidgetWithIdRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.List;

public record SaveBoardEditRequest(
    @NotNull @Min(0) Long version,
    @NotBlank(message = "Title is required") @Size(max = 255) String name,
    @NotBlank(message = "Description is required") @Size(max = 255) String headline,
    @NotNull List<@NotNull @Valid UpsertWidgetWithIdRequest> widgets,
    @Size(max = 2048) @Pattern(regexp = "(?i)^(https?://[^\\s]+)?$", message = "Website must be an http or https URL") String website,
    @Size(max = 255) @Pattern(regexp = "(?s).*\\S.*", message = "Name is required") String ownerDisplayName) {}
