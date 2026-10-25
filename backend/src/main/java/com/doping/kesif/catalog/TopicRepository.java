package com.doping.kesif.catalog;

import java.util.UUID;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TopicRepository extends JpaRepository<Topic, UUID> {
    List<Topic> findBySubjectIdAndGradeLevelAndActiveTrue(UUID subjectId, short gradeLevel);

    @Query("""
        select t.id as id, t.code as code, t.name as name, count(q.id) as questionCount
        from Topic t join Subject s on s.id = t.subjectId join Question q on q.topicId = t.id
        where t.active = true and s.active = true and t.subjectId = :subjectId
            and t.gradeLevel = :grade and q.status = :status
        group by t.id, t.code, t.name order by t.name
        """)
    List<CatalogSummary> findAvailableTopics(@Param("subjectId") UUID subjectId, @Param("grade") short grade,
                                            @Param("status") QuestionStatus status);
}

