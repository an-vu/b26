package com.b26.backend.common.api;

import java.util.List;

public record ValidationErrorResponse(String message, List<ValidationFieldError> errors) {}
