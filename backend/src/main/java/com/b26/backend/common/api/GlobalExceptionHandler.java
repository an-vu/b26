package com.b26.backend.common.api;

import java.util.List;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {
  @ExceptionHandler(ApiException.class)
  public ResponseEntity<Object> handleApiException(ApiException exception) {
    Object body = exception instanceof BadRequestException invalid
        ? new ValidationErrorResponse("Validation failed",
            List.of(new ValidationFieldError(invalid.field(), exception.getMessage())))
        : new ApiError(exception.getMessage());
    return ResponseEntity.status(exception.status()).body(body);
  }

  @ExceptionHandler(ObjectOptimisticLockingFailureException.class)
  @ResponseStatus(HttpStatus.CONFLICT)
  public ApiError handleOptimisticLock(ObjectOptimisticLockingFailureException exception) {
    return new ApiError(ConflictException.BOARD_CHANGED);
  }

  /** Safety net for races that pass the service-level uniqueness checks. */
  @ExceptionHandler(DataIntegrityViolationException.class)
  @ResponseStatus(HttpStatus.CONFLICT)
  public ApiError handleDataIntegrity(DataIntegrityViolationException exception) {
    return new ApiError("This change conflicts with existing data.");
  }

  @ExceptionHandler(MethodArgumentNotValidException.class)
  @ResponseStatus(HttpStatus.BAD_REQUEST)
  public ValidationErrorResponse handleValidation(MethodArgumentNotValidException exception) {
    List<ValidationFieldError> errors =
        exception.getBindingResult().getFieldErrors().stream()
            .map(error -> new ValidationFieldError(error.getField(), error.getDefaultMessage()))
            .toList();
    return new ValidationErrorResponse("Validation failed", errors);
  }

  @ExceptionHandler(HttpMessageNotReadableException.class)
  @ResponseStatus(HttpStatus.BAD_REQUEST)
  public ValidationErrorResponse handleUnreadableBody(HttpMessageNotReadableException exception) {
    return new ValidationErrorResponse(
        "Invalid request body", List.of(new ValidationFieldError("body", "Malformed JSON payload")));
  }
}
