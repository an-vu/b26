package com.bento26.backend.profile.api;

import java.util.List;

public record ProfileDto(String id, String name, String headline, List<CardDto> cards) {}
