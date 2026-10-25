package com.doping.kesif.puzzle;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PuzzleRepository extends JpaRepository<Puzzle, UUID> {
    List<Puzzle> findByActiveTrueOrderByTitleAsc();
}

