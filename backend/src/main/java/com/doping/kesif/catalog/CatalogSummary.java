package com.doping.kesif.catalog;

import java.util.UUID;

/** Read-only aggregate projection; no question body or answer key. */
public interface CatalogSummary {
    UUID getId();
    String getCode();
    String getName();
    long getQuestionCount();
}
