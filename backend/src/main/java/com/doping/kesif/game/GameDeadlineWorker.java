package com.doping.kesif.game;

import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name="kesif.game.deadlines-enabled",havingValue="true",matchIfMissing=true)
public class GameDeadlineWorker {
    private static final Logger LOG=LoggerFactory.getLogger(GameDeadlineWorker.class);
    private final JdbcTemplate jdbc;
    private final GameService games;
    public GameDeadlineWorker(JdbcTemplate jdbc,GameService games) { this.jdbc=jdbc; this.games=games; }
    @Scheduled(initialDelay=1000,fixedDelay=1000)
    public void run() {
        var ids=jdbc.queryForList("SELECT DISTINCT r.session_id FROM kesif.kesif_round r JOIN kesif.kesif_session s ON s.id=r.session_id "
            +"WHERE s.status='IN_PROGRESS' AND ((r.status='QUESTION_OPEN' AND r.deadline_at<=now()) "
            +"OR (r.status='REVEAL' AND r.reveal_deadline_at<=now())) LIMIT 100",UUID.class);
        // Each call is a separate transaction; one failed session does not undo other sessions.
        for(UUID id:ids) try { games.processDeadline(id); } catch(RuntimeException ex) { LOG.warn("Deadline processing failed for session {}: {}",id,ex.getClass().getSimpleName()); }
    }
}

@Configuration(proxyBeanMethods=false)
@EnableConfigurationProperties(GamePolicy.class)
class GameConfiguration { }
