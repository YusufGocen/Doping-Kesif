package com.doping.kesif.local;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;

/** Project-authored local content. Correct answers never form part of catalogue DTOs. */
public final class LocalQuestionBank {
    private LocalQuestionBank() { }

    public record Bank(List<SubjectContent> subjects) { }
    public record SubjectContent(String code, String name, List<TopicContent> topics) { }
    public record TopicContent(String code, String name, int grade, List<Item> questions) { }
    public record Item(String text, List<String> options, int correctIndex) { }

    public static Bank load(ObjectMapper mapper) throws IOException {
        try (var stream = new ClassPathResource("content/local-question-bank.json").getInputStream()) {
            Bank bank = mapper.readValue(stream, Bank.class);
            validate(bank);
            return bank;
        }
    }

    public static void validate(Bank bank) {
        require(bank != null && bank.subjects() != null && !bank.subjects().isEmpty(), "Empty bank");
        Set<String> subjects = new HashSet<>();
        Set<String> topics = new HashSet<>();
        for (var subject : bank.subjects()) {
            require(validCode(subject.code()) && subjects.add(subject.code()) && nonBlank(subject.name()), "Invalid subject");
            require(subject.topics() != null && !subject.topics().isEmpty(), "Empty subject");
            for (var topic : subject.topics()) {
                require(validCode(topic.code()) && topics.add(topic.code()) && nonBlank(topic.name()), "Invalid topic");
                require(topic.grade() >= 5 && topic.grade() <= 8, "Invalid grade");
                require(topic.questions() != null && topic.questions().size() == 10, "Topic must contain 10 questions");
                Set<String> texts = new HashSet<>();
                for (var item : topic.questions()) {
                    require(nonBlank(item.text()) && texts.add(item.text().strip()), "Blank or duplicate question");
                    require(item.options() != null && item.options().size() == 4, "Four options required");
                    Set<String> options = new HashSet<>();
                    for (String option : item.options()) {
                        require(nonBlank(option) && options.add(option.strip()), "Blank or duplicate option");
                    }
                    require(item.correctIndex() >= 0 && item.correctIndex() < 4, "Invalid answer index");
                }
            }
        }
    }

    /** Caller owns the transaction. Validate the complete resource before inserting any row. */
    public static void seed(JdbcTemplate jdbc, ObjectMapper mapper) throws IOException {
        Bank bank = load(mapper);
        for (var subject : bank.subjects()) {
            UUID subjectId = subject.code().equals("MATH") ? LocalDemoSeeder.MATH_ID : id("subject:" + subject.code());
            jdbc.update("INSERT INTO kesif.kesif_subject(id,code,name,active) VALUES (?,?,?,true) ON CONFLICT DO NOTHING",
                subjectId, subject.code().equals("MATH") ? "DEMO_MATH" : "LOCAL_" + subject.code(), subject.name());
            for (var topic : subject.topics()) {
                UUID topicId = id("topic:" + topic.code());
                jdbc.update("INSERT INTO kesif.kesif_topic(id,subject_id,grade_level,code,name,active) VALUES (?,?,?,?,?,true) ON CONFLICT DO NOTHING",
                    topicId, subjectId, topic.grade(), "LOCAL_" + topic.code(), topic.name());
                for (int i = 0; i < topic.questions().size(); i++) {
                    var item = topic.questions().get(i);
                    UUID questionId = id("question:" + topic.code() + ":" + i);
                    jdbc.update("INSERT INTO kesif.kesif_question(id,topic_id,body,content_version,status) VALUES (?,?,CAST(? AS jsonb),1,'PUBLISHED') ON CONFLICT DO NOTHING",
                        questionId, topicId, mapper.writeValueAsString(Map.of("text", item.text(), "format", "PLAIN_TEXT")));
                    for (int option = 0; option < 4; option++) {
                        jdbc.update("INSERT INTO kesif.kesif_question_option(id,question_id,option_key,body,correct) VALUES (?,?,?,CAST(? AS jsonb),?) ON CONFLICT DO NOTHING",
                            id("option:" + topic.code() + ":" + i + ":" + option), questionId, String.valueOf((char) ('A' + option)),
                            mapper.writeValueAsString(Map.of("text", item.options().get(option), "format", "PLAIN_TEXT")), option == item.correctIndex());
                    }
                }
            }
        }
    }

    private static UUID id(String key) {
        return LocalFixtureIds.content(key);
    }
    private static boolean nonBlank(String value) { return value != null && !value.isBlank(); }
    private static boolean validCode(String value) { return value != null && value.matches("[A-Z][A-Z0-9_]{1,49}"); }
    private static void require(boolean condition, String message) {
        if (!condition) throw new IllegalArgumentException("Local question bank: " + message);
    }
}
