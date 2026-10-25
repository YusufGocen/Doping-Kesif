package com.doping.kesif.local;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIllegalArgumentException;

class LocalQuestionBankTest {
    @Test void authoredBankCoversEveryGradeWithEightSubjectsAndValidAnswerKeys() throws Exception {
        var bank = LocalQuestionBank.load(new ObjectMapper());
        assertThat(bank.subjects()).hasSize(9);
        for (int grade = 5; grade <= 8; grade++) {
            int selectedGrade = grade;
            var matching = bank.subjects().stream().flatMap(s -> s.topics().stream())
                .filter(t -> t.grade() == selectedGrade).toList();
            assertThat(matching).hasSize(8);
            assertThat(matching).allSatisfy(t -> assertThat(t.questions()).hasSize(10));
        }
        assertThat(bank.subjects().stream().flatMap(s -> s.topics().stream()).mapToInt(t -> t.questions().size()).sum()).isEqualTo(320);
    }

    @Test void malformedContentIsRejectedBeforeSeeding() {
        var valid = new LocalQuestionBank.Item("Soru?", List.of("Bir", "İki", "Üç", "Dört"), 0);
        for (var invalid : List.of(
            new LocalQuestionBank.Item(" ", valid.options(), 0),
            new LocalQuestionBank.Item("Soru?", List.of("Bir", "Bir", "Üç", "Dört"), 0),
            new LocalQuestionBank.Item("Soru?", List.of("Bir", "İki", "Üç"), 0),
            new LocalQuestionBank.Item("Soru?", valid.options(), 4))) {
            assertThatIllegalArgumentException().isThrownBy(() -> LocalQuestionBank.validate(bankWith(invalid, 5)));
        }
        assertThatIllegalArgumentException().isThrownBy(() -> LocalQuestionBank.validate(bankWith(valid, 4)));
        assertThatIllegalArgumentException().isThrownBy(() -> LocalQuestionBank.validate(bankWith(valid, 9)));
        var duplicate = new LocalQuestionBank.TopicContent("TOPIC", "Konu", 5, java.util.Collections.nCopies(10, valid));
        assertThatIllegalArgumentException().isThrownBy(() -> LocalQuestionBank.validate(
            new LocalQuestionBank.Bank(List.of(new LocalQuestionBank.SubjectContent("TEST", "Ders", List.of(duplicate))))));
    }

    private LocalQuestionBank.Bank bankWith(LocalQuestionBank.Item item, int grade) {
        var items = new ArrayList<LocalQuestionBank.Item>();
        items.add(item);
        for (int i = 1; i < 10; i++) items.add(new LocalQuestionBank.Item("Soru " + i, List.of("A", "B", "C", "D"), i % 4));
        return new LocalQuestionBank.Bank(List.of(new LocalQuestionBank.SubjectContent("TEST", "Ders", List.of(
            new LocalQuestionBank.TopicContent("TOPIC", "Konu", grade, items)))));
    }
}
