package com.doping.kesif.reward;

import com.doping.kesif.auth.CurrentPlayerService;
import com.doping.kesif.common.api.KesifApiException;
import java.sql.*;
import java.time.Instant;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import static com.doping.kesif.reward.ProgressDtos.*;

@Service
@Transactional(isolation=org.springframework.transaction.annotation.Isolation.REPEATABLE_READ)
public class ProgressService {
    private final JdbcTemplate jdbc;
    private final CurrentPlayerService identity;
    public ProgressService(JdbcTemplate jdbc,CurrentPlayerService identity) { this.jdbc=jdbc; this.identity=identity; }

    public PageView<CollectionView> collections(String subject,CollectionFilter filter,int page,int size) {
        UUID actor=identity.resolve(subject).getId();
        String from=" FROM kesif.kesif_puzzle p LEFT JOIN kesif.kesif_player_collection c ON c.puzzle_id=p.id AND c.player_id=? "
            +"WHERE (p.active OR c.id IS NOT NULL) "+switch(filter) {
                case ALL->"";
                case IN_PROGRESS->"AND c.unlocked_count BETWEEN 1 AND 19 ";
                case COMPLETED->"AND c.unlocked_count=20 ";
            };
        long total=jdbc.queryForObject("SELECT count(*)"+from,Long.class,actor);
        var items=jdbc.query("SELECT p.id,p.title,p.asset_key,COALESCE(c.unlocked_count,0) AS unlocked_count,c.completed_at"+from
            +"ORDER BY p.title,p.id LIMIT ? OFFSET ?",(rs,n)->collection(rs),actor,size,(long)page*size);
        return new PageView<>(items,page,size,total);
    }
    public CollectionDetail collection(String subject,UUID puzzle) {
        UUID actor=identity.resolve(subject).getId();
        var found=jdbc.query("SELECT p.id,p.title,p.asset_key,COALESCE(c.unlocked_count,0) AS unlocked_count,c.completed_at "
            +"FROM kesif.kesif_puzzle p LEFT JOIN kesif.kesif_player_collection c ON c.puzzle_id=p.id AND c.player_id=? "
            +"WHERE p.id=? AND (p.active OR c.id IS NOT NULL)",(rs,n)->collection(rs),actor,puzzle);
        if(found.isEmpty()) throw missing();
        List<Short> pieces=jdbc.queryForList("SELECT cp.piece_index FROM kesif.kesif_collection_piece cp "
            +"JOIN kesif.kesif_player_collection c ON c.id=cp.collection_id WHERE c.player_id=? AND c.puzzle_id=? ORDER BY cp.piece_index",Short.class,actor,puzzle);
        return new CollectionDetail(found.getFirst(),pieces);
    }
    public ProgressView progress(String subject) {
        UUID actor=identity.resolve(subject).getId();
        return jdbc.queryForObject("SELECT (SELECT COALESCE(sum(amount),0) FROM kesif.kesif_xp_ledger WHERE player_id=?) AS xp, "
            +"count(*) AS games,COALESCE(sum(sp.correct_count),0) AS correct FROM kesif.kesif_session_player sp "
            +"JOIN kesif.kesif_session s ON s.id=sp.session_id WHERE sp.player_id=? AND s.status='COMPLETED'",
            (rs,n)->new ProgressView(rs.getLong("xp"),rs.getLong("games"),rs.getLong("correct")),actor,actor);
    }
    public PageView<HistoryView> history(String subject,int page,int size) {
        UUID actor=identity.resolve(subject).getId();
        String from=" FROM kesif.kesif_session s JOIN kesif.kesif_session_player sp ON sp.session_id=s.id "
            +"JOIN kesif.kesif_puzzle p ON p.id=s.puzzle_id WHERE sp.player_id=? AND s.status='COMPLETED' ";
        long total=jdbc.queryForObject("SELECT count(*)"+from,Long.class,actor);
        var items=jdbc.query("SELECT s.id,s.puzzle_id,p.title,s.ended_at,sp.correct_count,s.revealed_count,sp.collection_added_count,s.rewards_finalized_at,"
            +"(SELECT COALESCE(sum(x.amount),0) FROM kesif.kesif_xp_ledger x WHERE x.session_id=s.id AND x.player_id=sp.player_id) AS xp"
            +from+"ORDER BY s.ended_at DESC,s.id DESC LIMIT ? OFFSET ?",
            (rs,n)->new HistoryView(rs.getObject("id",UUID.class),rs.getObject("puzzle_id",UUID.class),rs.getString("title"),instant(rs,"ended_at"),
                rs.getInt("correct_count"),rs.getInt("revealed_count"),rs.getInt("collection_added_count"),rs.getLong("xp"),rs.getTimestamp("rewards_finalized_at")!=null),actor,size,(long)page*size);
        return new PageView<>(items,page,size,total);
    }
    public ResultView result(String subject,UUID session) {
        UUID actor=identity.resolve(subject).getId();
        // A participant check in the root query prevents probing another student's session.
        var roots=jdbc.query("SELECT s.id,s.puzzle_id,s.status,s.revealed_count,s.ended_at,s.rewards_finalized_at FROM kesif.kesif_session s "
            +"WHERE s.id=? AND EXISTS(SELECT 1 FROM kesif.kesif_session_player sp WHERE sp.session_id=s.id AND sp.player_id=?)",
            (rs,n)->new Object[]{rs.getObject("puzzle_id",UUID.class),rs.getString("status"),rs.getInt("revealed_count"),instant(rs,"ended_at"),rs.getTimestamp("rewards_finalized_at")!=null},session,actor);
        if(roots.isEmpty()) throw missing();
        Object[] root=roots.getFirst();
        if(!"COMPLETED".equals(root[1])) throw new KesifApiException(HttpStatus.CONFLICT,"GAME_NOT_COMPLETED","Oyun henüz tamamlanmadı.");
        var roster=jdbc.query("SELECT sp.player_id,p.display_name,sp.correct_count,sp.collection_added_count,"
            +"(SELECT COALESCE(sum(x.amount),0) FROM kesif.kesif_xp_ledger x WHERE x.session_id=sp.session_id AND x.player_id=sp.player_id) AS xp "
            +"FROM kesif.kesif_session_player sp JOIN kesif.kesif_player_profile p ON p.id=sp.player_id WHERE sp.session_id=? ORDER BY sp.slot",
            (rs,n)->new PlayerResult(rs.getObject("player_id",UUID.class),rs.getString("display_name"),rs.getInt("correct_count"),rs.getInt("collection_added_count"),rs.getLong("xp")),session);
        return new ResultView(session,(UUID)root[0],(Integer)root[2],(Instant)root[3],(Boolean)root[4],roster);
    }
    private static CollectionView collection(ResultSet rs) throws SQLException {
        return new CollectionView(rs.getObject("id",UUID.class),rs.getString("title"),rs.getString("asset_key"),rs.getInt("unlocked_count"),instant(rs,"completed_at"));
    }
    private static Instant instant(ResultSet rs,String field) throws SQLException { Timestamp value=rs.getTimestamp(field); return value==null?null:value.toInstant(); }
    private static KesifApiException missing() { return new KesifApiException(HttpStatus.NOT_FOUND,"RESULT_NOT_FOUND","Kayıt bulunamadı veya erişim yetkiniz yok."); }
}
