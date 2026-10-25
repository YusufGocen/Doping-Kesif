package com.doping.kesif.catalog;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SubjectRepository extends JpaRepository<Subject, UUID> {
    Optional<Subject> findByIdAndActiveTrue(UUID id);

    @Query("""
        select s.id as id, s.code as code, s.name as name, count(q.id) as questionCount
        from Subject s join Topic t on t.subjectId = s.id join Question q on q.topicId = t.id
        where s.active = true and t.active = true and t.gradeLevel = :grade and q.status = :status
        group by s.id, s.code, s.name order by s.name
        """)
    List<CatalogSummary> findAvailableSubjects(@Param("grade") short grade, @Param("status") QuestionStatus status);
}

