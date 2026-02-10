package com.bento26.backend.common.api;

import com.bento26.backend.analytics.domain.CardNotFoundForProfileException;
import com.bento26.backend.analytics.domain.ClickRateLimitedException;
import com.bento26.backend.profile.domain.InvalidProfileUpdateException;
import com.bento26.backend.profile.domain.ProfileNotFoundException;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.http.converter.HttpMessageNotReadableException;

@RestControllerAdvice
public class GlobalExceptionHandler {
  @ExceptionHandler(ProfileNotFoundException.class)
  @ResponseStatus(HttpStatus.NOT_FOUND)
  public ApiError handleProfileNotFound(ProfileNotFoundException exception) {
    return new ApiError(exception.getMessage());
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

  @ExceptionHandler(InvalidProfileUpdateException.class)
  @ResponseStatus(HttpStatus.BAD_REQUEST)
  public ValidationErrorResponse handleInvalidUpdate(InvalidProfileUpdateException exception) {
    return new ValidationErrorResponse(
        "Validation failed", List.of(new ValidationFieldError("cards", exception.getMessage())));
  }

  @ExceptionHandler(CardNotFoundForProfileException.class)
  @ResponseStatus(HttpStatus.BAD_REQUEST)
  public ApiError handleCardNotInProfile(CardNotFoundForProfileException exception) {
    return new ApiError(exception.getMessage());
  }

  @ExceptionHandler(ClickRateLimitedException.class)
  @ResponseStatus(HttpStatus.TOO_MANY_REQUESTS)
  public ApiError handleClickRateLimit(ClickRateLimitedException exception) {
    return new ApiError(exception.getMessage());
  }
}
