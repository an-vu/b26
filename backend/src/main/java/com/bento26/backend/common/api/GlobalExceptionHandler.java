package com.bento26.backend.common.api;

import com.bento26.backend.analytics.domain.CardNotFoundForBoardException;
import com.bento26.backend.analytics.domain.ClickRateLimitedException;
import com.bento26.backend.board.domain.InvalidBoardUpdateException;
import com.bento26.backend.board.domain.BoardNotFoundException;
import com.bento26.backend.widget.domain.InvalidWidgetConfigException;
import com.bento26.backend.widget.domain.WidgetNotFoundForBoardException;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.http.converter.HttpMessageNotReadableException;

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
        "Validation failed", List.of(new ValidationFieldError("cards", exception.getMessage())));
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
}
