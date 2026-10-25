package com.doping.kesif.catalog;

import com.doping.kesif.common.api.KesifApiException;
import com.doping.kesif.puzzle.PuzzleRepository;
import java.util.List;
import java.util.UUID;
import java.util.stream.IntStream;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class CatalogService {
    private static final int QUESTIONS_PER_GAME = 10;
    private final SubjectRepository subjects;
    private final TopicRepository topics;
    private final PuzzleRepository puzzles;
    public CatalogService(SubjectRepository subjects, TopicRepository topics, PuzzleRepository puzzles) {
        this.subjects = subjects; this.topics = topics; this.puzzles = puzzles;
    }
    public List<GradeView> grades() {
        return IntStream.rangeClosed(5,8).mapToObj(grade -> new GradeView(grade,
            subjects.findAvailableSubjects((short)grade, QuestionStatus.PUBLISHED).stream()
                .anyMatch(s -> s.getQuestionCount() >= QUESTIONS_PER_GAME))).toList();
    }
    public List<SubjectView> subjects(short grade) {
        return subjects.findAvailableSubjects(grade, QuestionStatus.PUBLISHED).stream()
            .map(s -> new SubjectView(s.getId(),s.getCode(),s.getName(),s.getQuestionCount(),s.getQuestionCount() >= QUESTIONS_PER_GAME)).toList();
    }
    public List<TopicView> topics(short grade, UUID subjectId) {
        subjects.findByIdAndActiveTrue(subjectId).orElseThrow(() ->
            new KesifApiException(HttpStatus.NOT_FOUND,"SUBJECT_NOT_FOUND","Ders bulunamadı."));
        return topics.findAvailableTopics(subjectId,grade,QuestionStatus.PUBLISHED).stream()
            .map(t -> new TopicView(t.getId(),t.getCode(),t.getName(),t.getQuestionCount(),t.getQuestionCount() >= QUESTIONS_PER_GAME)).toList();
    }
    public List<PuzzleView> puzzles() {
        return puzzles.findByActiveTrueOrderByTitleAsc().stream()
            .map(p -> new PuzzleView(p.getId(),p.getCode(),p.getTitle(),p.getAssetKey(),p.getPieceCount())).toList();
    }
    public record GradeView(int gradeLevel, boolean playable) { }
    public record SubjectView(UUID id,String code,String name,long availableQuestionCount,boolean playable) { }
    public record TopicView(UUID id,String code,String name,long availableQuestionCount,boolean playable) { }
    public record PuzzleView(UUID id,String code,String title,String assetKey,int pieceCount) { }
}
