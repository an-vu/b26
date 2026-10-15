package com.b26.backend.board.api;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class AppearanceRulesTest {
  @ParameterizedTest
  @CsvSource({"default,berry", "frutiger-aero,aero", "omahakase,omakase", "lofi,valencia",
      "berry,berry", "aero,aero", "aqua,aqua", "omakase,omakase", "kiwi,kiwi", "valencia,valencia",
      "unknown,unknown"})
  void normalizeThemeFamilyMapsLegacyIdsAndPassesOthersThrough(String input, String expected) {
    assertEquals(expected, AppearanceRules.normalizeThemeFamily(input));
  }

  @Test
  void normalizeThemeFamilyKeepsNullAndEveryLegacyIdNormalizesToAValidTheme() {
    assertNull(AppearanceRules.normalizeThemeFamily(null));
    for (String legacy : new String[]{"default", "frutiger-aero", "omahakase", "lofi"}) {
      assertTrue(AppearanceRules.normalizeThemeFamily(legacy).matches(AppearanceRules.THEME), legacy);
    }
  }
}
