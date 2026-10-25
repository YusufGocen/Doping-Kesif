package com.doping.kesif.local;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.*;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** Insert-only fixtures, exclusively local. Never a production migration. */
@Component
@Profile("local & !prod")
@ConditionalOnProperty(name = "kesif.local.seed-enabled", havingValue = "true")
public class LocalDemoSeeder implements ApplicationRunner {
    public static final UUID MATH_ID = id("subject:math");
    public static final UUID ALGEBRA_ID = id("topic:algebra-8");
    private final JdbcTemplate jdbc;
    private final LocalIdentityDirectory directory;
    private final ObjectMapper mapper;
    public LocalDemoSeeder(JdbcTemplate jdbc, LocalIdentityDirectory directory, ObjectMapper mapper) {
        this.jdbc=jdbc; this.directory=directory; this.mapper=mapper;
    }
    @Override @Transactional
    public void run(ApplicationArguments args) throws Exception {
        for(var user:directory.users()) jdbc.update("INSERT INTO kesif.kesif_player_profile(id,external_user_id,display_name) VALUES (?,?,?) ON CONFLICT DO NOTHING",
            id("user:"+user.userKey()),user.externalUserId(),user.displayName());
        jdbc.update("INSERT INTO kesif.kesif_subject(id,code,name,active) VALUES (?,'DEMO_MATH','Matematik',true) ON CONFLICT DO NOTHING",MATH_ID);
        jdbc.update("INSERT INTO kesif.kesif_topic(id,subject_id,grade_level,code,name,active) VALUES (?,?,8,'DEMO_ALGEBRA','Cebirsel İfadeler',true) ON CONFLICT DO NOTHING",ALGEBRA_ID,MATH_ID);
        String[][] puzzles={{"history","Tarihi Şehir"},{"nature","Doğa Keşfi"},{"city","Şehir Manzarası"},{"world","Renkli Dünya"}};
        for(String[] puzzle:puzzles) jdbc.update("INSERT INTO kesif.kesif_puzzle(id,code,title,asset_key,piece_count,active) VALUES (?,?,?,?,20,true) ON CONFLICT DO NOTHING",
            id("puzzle:"+puzzle[0]),"DEMO_"+puzzle[0].toUpperCase(Locale.ROOT),puzzle[1],"demo/puzzles/"+puzzle[0]);
        String[][] questions={
            {"x + 5 = 12 ise x kaçtır?","7","5","12","17"},
            {"3x = 21 ise x kaçtır?","7","3","18","24"},
            {"2x + 4 = 14 ise x kaçtır?","5","7","9","10"},
            {"(x + 3)² ifadesinin açılımı hangisidir?","x² + 6x + 9","x² + 3x + 9","x² + 9","2x + 9"},
            {"5a - 2a ifadesinin eşiti hangisidir?","3a","7a","3","a³"},
            {"4(x + 2) ifadesinin eşiti hangisidir?","4x + 8","4x + 2","x + 8","6x"},
            {"2x + 3x ifadesinin eşiti hangisidir?","5x","6x","5x²","x"},
            {"x = 4 ise x² kaçtır?","16","8","4","12"},
            {"7x - 2 = 19 ise x kaçtır?","3","7","17","21"},
            {"a² - b² ifadesinin çarpanlara ayrılmış biçimi hangisidir?","(a - b)(a + b)","(a - b)²","(a + b)²","a(a - b)"},
            {"(x - 2)² ifadesinin açılımı hangisidir?","x² - 4x + 4","x² - 4","x² + 4x + 4","x² - 2x + 4"},
            {"3(x + 1) = 12 ise x kaçtır?","3","4","9","11"}
        };
        for(int i=0;i<questions.length;i++) {
            UUID questionId=id("question:"+i);
            jdbc.update("INSERT INTO kesif.kesif_question(id,topic_id,body,content_version,status) VALUES (?,?,CAST(? AS jsonb),1,'PUBLISHED') ON CONFLICT DO NOTHING",
                questionId,ALGEBRA_ID,mapper.writeValueAsString(Map.of("text",questions[i][0],"format","PLAIN_TEXT")));
            for(int option=0;option<4;option++) {
                // Vary the correct slot so the demo does not teach an always-A pattern.
                int source=(option+i)%4;
                jdbc.update("INSERT INTO kesif.kesif_question_option(id,question_id,option_key,body,correct) VALUES (?,?,?,CAST(? AS jsonb),?) ON CONFLICT DO NOTHING",
                    id("option:"+i+":"+option),questionId,String.valueOf((char)('A'+option)),
                    mapper.writeValueAsString(Map.of("text",questions[i][source+1],"format","PLAIN_TEXT")),source==0);
            }
        }
        LocalQuestionBank.seed(jdbc, mapper);
    }
    private static UUID id(String key) { return LocalFixtureIds.demo(key); }
}
