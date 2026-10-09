package com.b26.backend;

import com.b26.backend.auth.domain.AuthForbiddenException;
import com.b26.backend.auth.domain.AuthService;
import com.b26.backend.board.domain.BoardAccessService;
import com.b26.backend.common.config.ApiAccess;
import com.b26.backend.common.config.ApiAuthorizationInterceptor;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.web.method.HandlerMethod;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;

class ApiAuthorizationPolicyTest {
  private final AuthService auth = mock(AuthService.class);
  private final BoardAccessService boards = mock(BoardAccessService.class);
  private final ApiAuthorizationInterceptor interceptor = new ApiAuthorizationInterceptor(auth, boards);

  @Test
  void anApplicationHandlerWithoutAnExplicitPolicyIsDeniedBeforeItRuns() throws Exception {
    var request = new MockHttpServletRequest("GET", "/api/future-feature");
    request.addHeader("Authorization", "Bearer even-an-admin-cannot-bypass-a-missing-policy");
    assertThrows(AuthForbiddenException.class, () -> interceptor.preHandle(request,
        new MockHttpServletResponse(), new HandlerMethod(new FutureController(), "unclassified")));
    verifyNoInteractions(auth, boards);
  }

  @Test
  void aBoardPolicyWithoutItsMatchedRouteVariableIsDenied() throws Exception {
    var request = new MockHttpServletRequest("PUT", "/api/board/default/future-feature");
    assertThrows(AuthForbiddenException.class, () -> interceptor.preHandle(request,
        new MockHttpServletResponse(), new HandlerMethod(new FutureController(), "misconfigured")));
    verifyNoInteractions(auth, boards);
  }

  private static class FutureController {
    public void unclassified() {}

    @ApiAccess(ApiAccess.Policy.BOARD_WRITE)
    public void misconfigured() {}
  }
}
