package com.doping.kesif.catalog;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.constraints.*;
import java.util.List;
import java.util.UUID;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/kesif")
@SecurityRequirement(name = "bearerAuth")
public class CatalogController {
    private final CatalogService catalog;
    public CatalogController(CatalogService catalog) { this.catalog = catalog; }
    @GetMapping("/catalog/grades")
    @Operation(summary = "5–8. sınıflar ve mevcut içerikle oynanabilirlik")
    public List<CatalogService.GradeView> grades() { return catalog.grades(); }
    @GetMapping("/catalog/subjects")
    @Operation(summary = "Sınıfa uygun aktif ve yayınlanmış içeriği bulunan dersler")
    public List<CatalogService.SubjectView> subjects(@RequestParam @Min(5) @Max(8) short grade) { return catalog.subjects(grade); }
    @GetMapping("/catalog/topics")
    @Operation(summary = "Ders ve sınıfa göre konular; on sorudan az içerik oynanamaz olarak işaretlenir")
    public List<CatalogService.TopicView> topics(@RequestParam @Min(5) @Max(8) short grade, @RequestParam UUID subjectId) {
        return catalog.topics(grade,subjectId);
    }
    @GetMapping("/puzzles")
    @Operation(summary = "Aktif 20 parçalı puzzle kataloğu")
    public List<CatalogService.PuzzleView> puzzles() { return catalog.puzzles(); }
}
