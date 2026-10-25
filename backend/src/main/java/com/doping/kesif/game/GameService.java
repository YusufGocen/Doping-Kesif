package com.doping.kesif.game;

import com.doping.kesif.auth.CurrentPlayerService;
import com.doping.kesif.boutique.BoutiqueGroupGateway;
import com.doping.kesif.catalog.*;
import com.doping.kesif.common.api.KesifApiException;
import com.doping.kesif.outbox.*;
import com.doping.kesif.player.PlayerProfileRepository;
import com.doping.kesif.puzzle.*;
import com.doping.kesif.room.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.*;
import java.time.*;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import static com.doping.kesif.game.GameDtos.*;

/** All mutations acquire room then session; no player locks while holding a room lock. */
@Service
@Transactional
public class GameService {
    @PersistenceContext private EntityManager em;
    private final GameSessionRepository sessions;
    private final GameRoundRepository rounds;
    private final SessionPlayerRepository players;
    private final RoundAnswerRepository answers;
    private final PieceUnlockRepository pieces;
    private final KesifRoomRepository rooms;
    private final RoomPlayerRepository members;
    private final CurrentPlayerService identity;
    private final PlayerProfileRepository profiles;
    private final BoutiqueGroupGateway groups;
    private final QuestionOptionRepository options;
    private final PuzzleRepository puzzles;
    private final SubjectRepository subjects;
    private final OutboxEventRepository outbox;
    private final GamePolicy policy;
    private final ObjectMapper mapper;
    private final Clock clock;
    private final com.doping.kesif.reward.RewardPolicy rewardPolicy;
    private final com.doping.kesif.reward.RewardFinalizer rewardFinalizer;

    public GameService(GameSessionRepository sessions,GameRoundRepository rounds,SessionPlayerRepository players,
            RoundAnswerRepository answers,PieceUnlockRepository pieces,KesifRoomRepository rooms,RoomPlayerRepository members,
            CurrentPlayerService identity,PlayerProfileRepository profiles,BoutiqueGroupGateway groups,
            QuestionOptionRepository options,PuzzleRepository puzzles,SubjectRepository subjects,OutboxEventRepository outbox,
            GamePolicy policy,ObjectMapper mapper,Clock clock,com.doping.kesif.reward.RewardPolicy rewardPolicy,
            com.doping.kesif.reward.RewardFinalizer rewardFinalizer) {
        this.sessions=sessions; this.rounds=rounds; this.players=players; this.answers=answers; this.pieces=pieces;
        this.rooms=rooms; this.members=members; this.identity=identity; this.profiles=profiles; this.groups=groups;
        this.options=options; this.puzzles=puzzles; this.subjects=subjects; this.outbox=outbox; this.policy=policy;
        this.mapper=mapper; this.clock=clock;
        this.rewardPolicy=rewardPolicy; this.rewardFinalizer=rewardFinalizer;
    }

    public SessionView start(String subject,UUID roomId) {
        UUID actor=identity.resolve(subject).getId(); KesifRoom room=lockRoom(roomId);
        if(!room.getOwnerPlayerId().equals(actor)) throw error(HttpStatus.FORBIDDEN,"NOT_ROOM_OWNER");
        var existing=sessions.findByRoomId(roomId);
        if(existing.isPresent()) { GameSession session=existing.get(); tick(session); return view(session); }
        List<RoomPlayer> roster=members.findByRoomIdOrderBySlot(roomId);
        if(room.getStatus()!=RoomStatus.FULL||roster.size()!=2||roster.stream().anyMatch(p->!p.getActive()||!p.getReady()))
            throw error(HttpStatus.CONFLICT,"ROOM_NOT_READY");
        if(!room.getExpiresAt().isAfter(clock.instant())) throw error(HttpStatus.GONE,"LOBBY_EXPIRED");
        for(var member:roster) {
            String external=profiles.findById(member.getPlayerId()).orElseThrow().getExternalUserId();
            if(groups.groupsFor(external).stream().noneMatch(g->g.id().equals(room.getGroupExternalId())))
                throw error(HttpStatus.FORBIDDEN,"NOT_SAME_GROUP");
        }
        if(puzzles.findById(room.getPuzzleId()).filter(Puzzle::getActive).isEmpty()
                ||subjects.findByIdAndActiveTrue(room.getSubjectId()).isEmpty()) throw error(HttpStatus.CONFLICT,"CONTENT_UNAVAILABLE");
        // Bounded DB selection, revalidated at start; correct keys remain in server-only columns.
        var selection=em.createQuery("select q from Question q, Topic t where q.topicId=t.id and t.active=true "
                +"and t.subjectId=:subject and t.gradeLevel=:grade and q.status=:status "
                +(room.getTopicId()==null?"":"and t.id=:topic ")+"order by function('random')",Question.class)
            .setParameter("subject",room.getSubjectId()).setParameter("grade",room.getGradeLevel())
            .setParameter("status",QuestionStatus.PUBLISHED).setMaxResults(10);
        if(room.getTopicId()!=null) selection.setParameter("topic",room.getTopicId());
        List<Question> selected=selection.getResultList();
        if(selected.size()!=10) throw error(HttpStatus.UNPROCESSABLE_ENTITY,"INSUFFICIENT_QUESTIONS");
        var snapshots=new ArrayList<com.fasterxml.jackson.databind.node.ObjectNode>();
        var correct=new ArrayList<String>();
        for(Question question:selected) {
            List<QuestionOption> opts=options.findByQuestionId(question.getId()).stream()
                .sorted(Comparator.comparing(QuestionOption::getOptionKey)).toList();
            if(opts.size()<2||opts.stream().filter(QuestionOption::getCorrect).count()!=1)
                throw error(HttpStatus.UNPROCESSABLE_ENTITY,"INVALID_QUESTION_OPTIONS");
            var snapshot=mapper.createObjectNode().put("contentVersion",question.getContentVersion());
            snapshot.set("body",question.getBody()); var array=snapshot.putArray("options");
            for(var option:opts) array.addObject().put("key",option.getOptionKey()).set("body",option.getBody());
            snapshots.add(snapshot); correct.add(opts.stream().filter(QuestionOption::getCorrect).findFirst().orElseThrow().getOptionKey());
        }
        List<Integer> order=new ArrayList<>(); for(int i=1;i<=20;i++) order.add(i); Collections.shuffle(order);
        var rules=mapper.createObjectNode().put("version",1).put("questionCount",10).put("puzzlePieceCount",20)
            .put("questionMillis",policy.questionDuration().toMillis()).put("revealMillis",policy.revealDuration().toMillis());
        Instant now=now();
        if(rewardPolicy.enabled()) rules.set("rewards",rewardPolicy.snapshot(mapper));
        GameSession session=sessions.saveAndFlush(new GameSession(roomId,room.getPuzzleId(),rules,SessionStatus.IN_PROGRESS,
            (short)1,(short)0,mapper.valueToTree(order),0,now,null));
        for(var member:roster) players.save(new SessionPlayer(session.getId(),roomId,member.getPlayerId(),member.getSlot(),(short)0,(short)0,true));
        for(int i=0;i<10;i++) rounds.save(new GameRound(session.getId(),(short)(i+1),selected.get(i).getId().toString(),
            snapshots.get(i),correct.get(i),i==0?RoundStatus.QUESTION_OPEN:RoundStatus.PENDING,
            i==0?now:null,i==0?now.plus(policy.questionDuration()):null,null,null));
        room.changeLobbyStatus(RoomStatus.STARTED);
        outbox.save(new OutboxEvent("ROOM",roomId,"GAME_STARTED",room.nextEventSequence(),
            mapper.valueToTree(Map.of("sessionId",session.getId())),null,0,now));
        event(session,"QUESTION_OPENED"); return view(session);
    }

    public SessionView snapshot(String subject,UUID id) {
        GameSession session=authorized(subject,id); tick(session); return view(session);
    }
    public Optional<SessionView> active(String subject) {
        UUID actor=identity.resolve(subject).getId();
        List<?> ids=em.createNativeQuery("SELECT session_id FROM kesif.kesif_session_player WHERE player_id=:player AND active=true")
            .setParameter("player",actor).getResultList();
        return ids.isEmpty()?Optional.empty():Optional.of(snapshot(subject,(UUID)ids.getFirst()));
    }
    public SessionView answer(String subject,UUID id,UUID roundId,AnswerRequest request) {
        GameSession session=authorized(subject,id); UUID actor=identity.resolve(subject).getId();
        var retry=answers.findByPlayerIdAndClientRequestId(actor,request.clientRequestId());
        if(retry.isPresent()) {
            RoundAnswer prior=retry.get();
            if(!prior.getSessionId().equals(id)||!prior.getRoundId().equals(roundId)||!Objects.equals(prior.getOptionKey(),request.optionKey()))
                throw error(HttpStatus.CONFLICT,"IDEMPOTENCY_CONFLICT");
            tick(session); return view(session);
        }
        GameRound round=rounds.findById(roundId).filter(r->r.getSessionId().equals(id))
            .orElseThrow(()->error(HttpStatus.NOT_FOUND,"ROUND_NOT_FOUND"));
        boolean valid=false;
        for(var option:round.getQuestionSnapshot().get("options")) if(option.get("key").asText().equals(request.optionKey())) valid=true;
        if(!valid) throw error(HttpStatus.UNPROCESSABLE_ENTITY,"INVALID_OPTION");
        tick(session);
        // Late submissions return the authoritative state, never overwrite a timeout or a prior answer.
        if(round.getStatus()!=RoundStatus.QUESTION_OPEN) return view(session);
        Instant acceptedAt=now();
        if(!round.getDeadlineAt().isAfter(acceptedAt)) { tick(session); return view(session); }
        if(answers.findByRoundId(roundId).stream().anyMatch(a->a.getPlayerId().equals(actor))) throw error(HttpStatus.CONFLICT,"ANSWER_ALREADY_SUBMITTED");
        answers.saveAndFlush(new RoundAnswer(id,roundId,actor,request.optionKey(),request.optionKey().equals(round.getCorrectOptionKey()),
            AnswerSource.SUBMITTED,request.clientRequestId(),acceptedAt));
        event(session,"ANSWER_RECEIVED");
        if(answers.findByRoundId(roundId).size()==2) resolve(session,round,acceptedAt);
        return view(session);
    }
    public SessionView next(String subject,UUID id,short roundNo) {
        GameSession session=authorized(subject,id); UUID actor=identity.resolve(subject).getId(); tick(session);
        if(roundNo<session.getCurrentRoundNo()||session.getStatus()==SessionStatus.COMPLETED) return view(session);
        GameRound round=current(session);
        if(roundNo!=round.getRoundNo()||round.getStatus()!=RoundStatus.REVEAL) throw error(HttpStatus.CONFLICT,"ROUND_NOT_REVEALED");
        SessionPlayer player=players.findBySessionId(id).stream().filter(p->p.getPlayerId().equals(actor)).findFirst().orElseThrow();
        if(player.getContinueRoundNo()!=roundNo) { player.continueAfter(roundNo); event(session,"PLAYER_CONTINUING"); }
        if(players.findBySessionId(id).stream().allMatch(p->p.getContinueRoundNo()==roundNo)) advance(session,round,now());
        return view(session);
    }

    public void processDeadline(UUID id) { GameSession session=lockSession(id); tick(session); }
    private void tick(GameSession session) {
        // At most 20 transitions. Persisted deadlines recover after downtime without resetting timers.
        for(int i=0;i<20&&session.getStatus()==SessionStatus.IN_PROGRESS;i++) {
            GameRound round=current(session); Instant now=now();
            if(round.getStatus()==RoundStatus.QUESTION_OPEN&&!round.getDeadlineAt().isAfter(now)) {
                List<RoundAnswer> existing=answers.findByRoundId(round.getId());
                for(var player:players.findBySessionId(session.getId())) if(existing.stream().noneMatch(a->a.getPlayerId().equals(player.getPlayerId())))
                    answers.save(new RoundAnswer(session.getId(),round.getId(),player.getPlayerId(),null,false,AnswerSource.TIMEOUT,null,round.getDeadlineAt()));
                answers.flush(); resolve(session,round,round.getDeadlineAt());
            } else if(round.getStatus()==RoundStatus.REVEAL&&!round.getRevealDeadlineAt().isAfter(now)) advance(session,round,round.getRevealDeadlineAt());
            else break;
        }
    }
    private void resolve(GameSession session,GameRound round,Instant at) {
        List<SessionPlayer> roster=players.findBySessionId(session.getId());
        List<RoundAnswer> submitted=answers.findByRoundId(round.getId());
        for(var player:roster.stream().sorted(Comparator.comparingInt(SessionPlayer::getSlot)).toList()) {
            if(submitted.stream().anyMatch(a->a.getPlayerId().equals(player.getPlayerId())&&a.getCorrect())) {
                player.score(); pieces.save(new PieceUnlock(session.getId(),round.getId(),player.getPlayerId(),session.unlockPiece()));
            }
        }
        round.reveal(at,at.plusMillis(session.getRulesSnapshot().get("revealMillis").asLong())); event(session,"ROUND_REVEALED");
    }
    private void advance(GameSession session,GameRound round,Instant at) {
        round.complete();
        if(round.getRoundNo()==10) {
            session.complete(at); players.findBySessionId(session.getId()).forEach(SessionPlayer::finish);
            members.findByRoomId(session.getRoomId()).forEach(m->m.release(at));
            KesifRoom room=rooms.findById(session.getRoomId()).orElseThrow(); room.completeGame();
            outbox.save(new OutboxEvent("ROOM",room.getId(),"ROOM_CLOSED",room.nextEventSequence(),mapper.createObjectNode(),null,0,clock.instant()));
            event(session,"GAME_COMPLETED");
            rewardFinalizer.finalizeSession(session.getId());
        } else {
            session.advance(); current(session).open(at,at.plusMillis(session.getRulesSnapshot().get("questionMillis").asLong()));
            event(session,"QUESTION_OPENED");
        }
    }
    private GameSession authorized(String subject,UUID id) {
        UUID actor=identity.resolve(subject).getId(); GameSession session=lockSession(id);
        if(players.findBySessionId(id).stream().noneMatch(p->p.getPlayerId().equals(actor))) throw error(HttpStatus.NOT_FOUND,"SESSION_NOT_FOUND");
        return session;
    }
    private KesifRoom lockRoom(UUID id) {
        if(em.createNativeQuery("SELECT id FROM kesif.kesif_room WHERE id=:id FOR UPDATE").setParameter("id",id).getResultList().isEmpty())
            throw error(HttpStatus.NOT_FOUND,"ROOM_NOT_FOUND");
        KesifRoom room=rooms.findById(id).orElseThrow(); em.refresh(room); return room;
    }
    private GameSession lockSession(UUID id) {
        List<?> ids=em.createNativeQuery("SELECT room_id FROM kesif.kesif_session WHERE id=:id").setParameter("id",id).getResultList();
        if(ids.isEmpty()) throw error(HttpStatus.NOT_FOUND,"SESSION_NOT_FOUND");
        lockRoom((UUID)ids.getFirst());
        GameSession session=sessions.findById(id).orElseThrow(); em.refresh(session); return session;
    }
    private GameRound current(GameSession session) {
        return rounds.findBySessionIdOrderByRoundNo(session.getId()).stream().filter(r->r.getRoundNo()==session.getCurrentRoundNo()).findFirst().orElseThrow();
    }
    private void event(GameSession session,String type) {
        outbox.save(new OutboxEvent("SESSION",session.getId(),type,session.nextEventSequence(),
            mapper.valueToTree(Map.of("sessionId",session.getId(),"roundNo",session.getCurrentRoundNo())),null,0,clock.instant()));
    }
    private SessionView view(GameSession session) {
        GameRound round=current(session); List<RoundAnswer> submitted=answers.findByRoundId(round.getId());
        boolean revealed=round.getStatus()==RoundStatus.REVEAL||round.getStatus()==RoundStatus.COMPLETED;
        var roster=players.findBySessionId(session.getId()).stream().sorted(Comparator.comparingInt(SessionPlayer::getSlot))
            .map(p->new PlayerView(p.getPlayerId(),p.getSlot(),p.getCorrectCount(),submitted.stream().anyMatch(a->a.getPlayerId().equals(p.getPlayerId())),p.getContinueRoundNo()==round.getRoundNo())).toList();
        var visibleAnswers=revealed?submitted.stream().map(a->new AnswerView(a.getPlayerId(),a.getOptionKey(),a.getCorrect(),a.getSource())).toList():List.<AnswerView>of();
        var visiblePieces=pieces.findBySessionId(session.getId()).stream().map(PieceUnlock::getPieceIndex).sorted().toList();
        return new SessionView(session.getId(),session.getRoomId(),session.getPuzzleId(),session.getStatus(),session.getCurrentRoundNo(),
            session.getRevealedCount(),visiblePieces,roster,new RoundView(round.getId(),round.getRoundNo(),round.getStatus(),
            round.getQuestionSnapshot(),round.getDeadlineAt(),round.getRevealDeadlineAt(),revealed?round.getCorrectOptionKey():null,visibleAnswers),session.getEventSequence());
    }
    private static KesifApiException error(HttpStatus status,String code) { return new KesifApiException(status,code,"Oyun işlemi mevcut durum veya erişim kurallarıyla uyumlu değil."); }
    // PostgreSQL timestamptz stores microseconds; responses must use the same precision as durable deadlines.
    private Instant now() { return clock.instant().truncatedTo(java.time.temporal.ChronoUnit.MICROS); }
}
