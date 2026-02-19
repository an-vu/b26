package com.b26.backend.common.api;

import com.b26.backend.auth.domain.AuthConflictException;
import com.b26.backend.auth.domain.AuthUnauthorizedException;
import com.b26.backend.auth.domain.InvalidAuthRequestException;
import com.b26.backend.board.domain.BoardNotFoundException;
import com.b26.backend.board.domain.InvalidBoardUpdateException;
import com.b26.backend.insights.domain.CardNotFoundForBoardException;
import com.b26.backend.insights.domain.ClickRateLimitedException;
import com.b26.backend.user.domain.InvalidUserPreferencesException;
import com.b26.backend.user.domain.InvalidUserProfileException;
import com.b26.backend.user.domain.UserNotFoundException;
import com.b26.backend.widget.domain.InvalidWidgetConfigException;
import com.b26.backend.widget.domain.WidgetNotFoundForBoardException;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {
  @ExceptionHandler(BoardNotFoundException.class)
  @ResponseStatus(HttpStatus.NOT_FOUND)
  public ApiError handleBoardNotFound(BoardNotFoundException exception) {
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

  @ExceptionHandler(InvalidBoardUpdateException.class)
  @ResponseStatus(HttpStatus.BAD_REQUEST)
  public ValidationErrorResponse handleInvalidUpdate(InvalidBoardUpdateException exception) {
    return new ValidationErrorResponse(
        "Validation failed", List.of(new ValidationFieldError("board", exception.getMessage())));
  }

  @ExceptionHandler(CardNotFoundForBoardException.class)
  @ResponseStatus(HttpStatus.BAD_REQUEST)
  public ApiError handleCardNotInBoard(CardNotFoundForBoardException exception) {
    return new ApiError(exception.getMessage());
  }

  @ExceptionHandler(ClickRateLimitedException.class)
  @ResponseStatus(HttpStatus.TOO_MANY_REQUESTS)
  public ApiError handleClickRateLimit(ClickRateLimitedException exception) {
    return new ApiError(exception.getMessage());
  }

  @ExceptionHandler(InvalidWidgetConfigException.class)
  @ResponseStatus(HttpStatus.BAD_REQUEST)
  public ApiError handleInvalidWidgetConfig(InvalidWidgetConfigException exception) {
    return new ApiError(exception.getMessage());
  }

  @ExceptionHandler(WidgetNotFoundForBoardException.class)
  @ResponseStatus(HttpStatus.NOT_FOUND)
  public ApiError handleWidgetNotFound(WidgetNotFoundForBoardException exception) {
    return new ApiError(exception.getMessage());
  }

  @ExceptionHandler(UserNotFoundException.class)
  @ResponseStatus(HttpStatus.NOT_FOUND)
  public ApiError handleUserNotFound(UserNotFoundException exception) {
    return new ApiError(exception.getMessage());
  }

  @ExceptionHandler(InvalidUserPreferencesException.class)
  @ResponseStatus(HttpStatus.BAD_REQUEST)
  public ValidationErrorResponse handleInvalidUserPreferences(InvalidUserPreferencesException exception) {
    return new ValidationErrorResponse(
        "Validation failed", List.of(new ValidationFieldError("preferences", exception.getMessage())));
  }

  @ExceptionHandler(InvalidUserProfileException.class)
  @ResponseStatus(HttpStatus.BAD_REQUEST)
  public ValidationErrorResponse handleInvalidUserProfile(InvalidUserProfileException exception) {
    return new ValidationErrorResponse(
        "Validation failed", List.of(new ValidationFieldError("profile", exception.getMessage())));
  }

  @ExceptionHandler(InvalidAuthRequestException.class)
  @ResponseStatus(HttpStatus.BAD_REQUEST)
  public ValidationErrorResponse handleInvalidAuthRequest(InvalidAuthRequestException exception) {
    return new ValidationErrorResponse(
        "Validation failed", List.of(new ValidationFieldError("auth", exception.getMessage())));
  }

  @ExceptionHandler(AuthUnauthorizedException.class)
  @ResponseStatus(HttpStatus.UNAUTHORIZED)
  public ApiError handleAuthUnauthorized(AuthUnauthorizedException exception) {
    return new ApiError(exception.getMessage());
  }

  @ExceptionHandler(AuthConflictException.class)
  @ResponseStatus(HttpStatus.CONFLICT)
  public ApiError handleAuthConflict(AuthConflictException exception) {
    return new ApiError(exception.getMessage());
  }
}
