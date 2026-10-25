package com.doping.kesif.reward;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface XpLedgerEntryRepository extends JpaRepository<XpLedgerEntry, UUID> {
}

