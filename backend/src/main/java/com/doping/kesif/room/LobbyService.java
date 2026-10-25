package com.doping.kesif.room;

import com.doping.kesif.auth.CurrentPlayerService;
import com.doping.kesif.boutique.BoutiqueGroupGateway;
import com.doping.kesif.catalog.*;
import com.doping.kesif.common.api.KesifApiException;
import com.doping.kesif.invitation.*;
import com.doping.kesif.outbox.*;
import com.doping.kesif.player.*;
import com.doping.kesif.puzzle.PuzzleRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.*;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import static com.doping.kesif.room.LobbyDtos.*;

@Service
@Transactional
public class LobbyService {
    @PersistenceContext private EntityManager entityManager;
    private static final List<RoomStatus> OPEN = List.of(RoomStatus.OPEN,RoomStatus.FULL);
    private final KesifRoomRepository rooms;
    private final RoomPlayerRepository members;
    private final InvitationRepository invitations;
    private final PlayerProfileRepository players;
    private final CurrentPlayerService currentPlayer;
    private final SubjectRepository subjects;
    private final TopicRepository topics;
    private final PuzzleRepository puzzles;
    private final BoutiqueGroupGateway groups;
    private final OutboxEventRepository outbox;
    private final RoomPolicy policy;
    private final RoomCodeCodec codes;
    private final Clock clock;
    private final ObjectMapper mapper;

    public LobbyService(KesifRoomRepository rooms,RoomPlayerRepository members,InvitationRepository invitations,
            PlayerProfileRepository players,CurrentPlayerService currentPlayer,SubjectRepository subjects,TopicRepository topics,
            PuzzleRepository puzzles,BoutiqueGroupGateway groups,OutboxEventRepository outbox,RoomPolicy policy,
            RoomCodeCodec codes,Clock clock,ObjectMapper mapper) {
        this.rooms=rooms; this.members=members; this.invitations=invitations; this.players=players;
        this.currentPlayer=currentPlayer; this.subjects=subjects; this.topics=topics; this.puzzles=puzzles;
        this.groups=groups; this.outbox=outbox; this.policy=policy; this.codes=codes; this.clock=clock; this.mapper=mapper;
    }

    public RoomView createCodeRoom(String subject,CreateRoomRequest request) {
        PlayerProfile actor=lockActor(subject);
        var existing=rooms.findByOwnerPlayerIdAndCreationRequestId(actor.getId(),request.clientRequestId());
        if(existing.isPresent()) {
            KesifRoom room=lockRoom(existing.get().getId());
            requireGroup(subject,room.getGroupExternalId());
            sameRequest(room,JoinMethod.CODE,request.selection()); expireIfDue(room);
            return view(room,actor.getId());
        }
        validateSelection(subject,request.selection()); ensureFree(actor.getId());
        KesifRoom room=createRoom(actor,request.clientRequestId(),request.selection(),JoinMethod.CODE,policy.ttl());
        return view(room,actor.getId());
    }

    public InvitationView invite(String subject,CreateInvitationRequest request) {
        PlayerProfile actor=lockActor(subject);
        var existing=rooms.findByOwnerPlayerIdAndCreationRequestId(actor.getId(),request.clientRequestId());
        if(existing.isPresent()) {
            KesifRoom room=lockRoom(existing.get().getId()); sameRequest(room,JoinMethod.INVITATION,request.selection());
            requireGroup(subject,room.getGroupExternalId());
            Invitation invitation=invitations.findByRoomId(room.getId()).stream().findFirst().orElseThrow();
            PlayerProfile invitee=players.findById(invitation.getInviteeId()).orElseThrow();
            if(!invitee.getExternalUserId().equals(request.inviteeExternalUserId())) throw conflict("IDEMPOTENCY_CONFLICT");
            expireIfDue(room); return invitationView(invitation,room);
        }
        validateSelection(subject,request.selection());
        if(subject.equals(request.inviteeExternalUserId())) throw invalid("CANNOT_INVITE_SELF");
        boolean friend=groups.friendsFor(subject,request.selection().groupId()).stream()
            .anyMatch(f->f.externalUserId().equals(request.inviteeExternalUserId()));
        if(!friend) throw forbidden("NOT_SAME_GROUP");
        ensureFree(actor.getId());
        PlayerProfile invitee=currentPlayer.resolve(request.inviteeExternalUserId());
        Duration ttl=policy.invitationTtl().compareTo(policy.ttl())<0?policy.invitationTtl():policy.ttl();
        KesifRoom room=createRoom(actor,request.clientRequestId(),request.selection(),JoinMethod.INVITATION,ttl);
        Invitation invitation=invitations.save(new Invitation(room.getId(),actor.getId(),invitee.getId(),
            InvitationStatus.PENDING,room.getExpiresAt(),null));
        event(room,"INVITATION_RECEIVED",Map.of("invitationId",invitation.getId().toString(),"inviteeId",invitee.getId().toString()));
        return invitationView(invitation,room);
    }

    public RoomView joinCode(String subject,String rawCode) {
        PlayerProfile actor=lockActor(subject);
        KesifRoom candidate=rooms.findByCodeDigestAndStatusIn(codes.digest(rawCode),OPEN)
            .orElseThrow(()->missing("ROOM_NOT_AVAILABLE"));
        KesifRoom room=lockRoom(candidate.getId()); requireGroup(subject,room.getGroupExternalId()); requireOwnerGroup(room); requireOpen(room);
        addGuest(room,actor); return view(room,actor.getId());
    }

    public RoomView accept(String subject,UUID invitationId) {
        PlayerProfile actor=lockActor(subject);
        Invitation invitation=invitations.findById(invitationId).orElseThrow(()->missing("INVITATION_NOT_FOUND"));
        if(!invitation.getInviteeId().equals(actor.getId())) throw missing("INVITATION_NOT_FOUND");
        KesifRoom room=lockRoom(invitation.getRoomId()); requireGroup(subject,room.getGroupExternalId()); requireOwnerGroup(room);
        // Re-read after the room lock; a previous concurrent accept may have committed.
        invitation=refreshInvitation(invitationId);
        if(invitation.getStatus()==InvitationStatus.ACCEPTED) { expireIfDue(room); return view(room,actor.getId()); }
        requirePending(invitation); requireOpen(room);
        addGuest(room,actor); invitation.respond(InvitationStatus.ACCEPTED,clock.instant());
        event(room,"INVITATION_ACCEPTED",Map.of("invitationId",invitationId.toString()));
        return view(room,actor.getId());
    }

    public InvitationView respond(String subject,UUID invitationId,boolean cancel) {
        PlayerProfile actor=lockActor(subject);
        Invitation invitation=invitations.findById(invitationId).orElseThrow(()->missing("INVITATION_NOT_FOUND"));
        UUID permitted=cancel?invitation.getInviterId():invitation.getInviteeId();
        if(!permitted.equals(actor.getId())) throw missing("INVITATION_NOT_FOUND");
        KesifRoom room=lockRoom(invitation.getRoomId()); invitation=refreshInvitation(invitationId);
        InvitationStatus target=cancel?InvitationStatus.CANCELLED:InvitationStatus.REJECTED;
        if(invitation.getStatus()==target) return invitationView(invitation,room);
        requirePending(invitation); requireOpen(room);
        invitation.respond(target,clock.instant());
        close(room,RoomStatus.CANCELLED);
        return invitationView(invitation,room);
    }

    public List<InvitationView> incoming(String subject,int page,int size) {
        UUID actor=currentPlayer.resolve(subject).getId();
        List<Invitation> pending=invitations.findByInviteeIdAndStatusAndExpiresAtAfterOrderByCreatedAtDesc(
            actor,InvitationStatus.PENDING,clock.instant(),PageRequest.of(page,size));
        Map<UUID,KesifRoom> roomMap=rooms.findAllById(pending.stream().map(Invitation::getRoomId).toList())
            .stream().collect(Collectors.toMap(KesifRoom::getId,Function.identity()));
        return pending.stream().filter(i->OPEN.contains(roomMap.get(i.getRoomId()).getStatus()))
            .map(i->invitationView(i,roomMap.get(i.getRoomId()))).toList();
    }

    public RoomView getRoom(String subject,UUID id) {
        UUID actor=currentPlayer.resolve(subject).getId(); KesifRoom room=lockRoom(id);
        requireMember(room,actor); requireGroup(subject,room.getGroupExternalId()); expireIfDue(room);
        return view(room,actor);
    }

    public Optional<RoomView> activeRoom(String subject) {
        UUID actor=currentPlayer.resolve(subject).getId();
        // Only fetch the ID before locking; do not cache membership flags before a concurrent close.
        return members.findActiveRoomId(actor).map(roomId->getRoom(subject,roomId));
    }

    public RoomView ready(String subject,UUID id,boolean ready) {
        PlayerProfile actor=lockActor(subject); KesifRoom room=lockRoom(id);
        RoomPlayer member=requireMember(room,actor.getId()); requireGroup(subject,room.getGroupExternalId()); requireOpen(room);
        requireRosterGroup(room);
        if(!member.getActive()) throw forbidden("NOT_ROOM_MEMBER");
        if(member.getReady()!=ready) { member.markReady(ready,clock.instant()); event(room,"PLAYER_READY",Map.of("playerId",actor.getId().toString(),"ready",ready)); }
        return view(room,actor.getId());
    }

    public RoomView leaveOrCancel(String subject,UUID id,boolean ownerOnly) {
        PlayerProfile actor=lockActor(subject); KesifRoom room=lockRoom(id); requireMember(room,actor.getId());
        if(ownerOnly&&!room.getOwnerPlayerId().equals(actor.getId())) throw forbidden("NOT_ROOM_OWNER");
        if(room.getStatus()==RoomStatus.STARTED||room.getStatus()==RoomStatus.CLOSED) throw conflict("GAME_ALREADY_STARTED");
        close(room,RoomStatus.CANCELLED); return view(room,actor.getId());
    }

    public int expireDueRooms() {
        int count=0;
        for(KesifRoom candidate:rooms.findByStatusInAndExpiresAtBeforeOrderByExpiresAt(OPEN,clock.instant(),PageRequest.of(0,100))) {
            KesifRoom room=lockRoom(candidate.getId()); if(expireIfDue(room)) count++;
        }
        return count;
    }

    public void expireUnrecoverableCodeRooms() {
        for(KesifRoom candidate:rooms.findByJoinMethodAndStatusIn(JoinMethod.CODE,OPEN)) {
            KesifRoom room=lockRoom(candidate.getId());
            if(OPEN.contains(room.getStatus())&&!Objects.equals(room.getCodeDigest(),codes.digest(codes.codeFor(room.getOwnerPlayerId(),room.getCreationRequestId()))))
                close(room,RoomStatus.EXPIRED);
        }
    }

    private KesifRoom createRoom(PlayerProfile owner,UUID requestId,Selection s,JoinMethod method,Duration ttl) {
        String digest=method==JoinMethod.CODE?codes.digest(codes.codeFor(owner.getId(),requestId)):null;
        var rules=mapper.createObjectNode().put("lobbyPolicyVersion",1).put("questionCount",10).put("puzzlePieceCount",20)
            .put("sameBoutiqueGroupRequired",true).put("lobbyTtlSeconds",ttl.toSeconds());
        KesifRoom room=new KesifRoom(owner.getId(),s.groupId(),method,digest,s.puzzleId(),s.subjectId(),s.gradeLevel().shortValue(),s.topicId(),rules,RoomStatus.OPEN,clock.instant().plus(ttl));
        room.identifyCreation(requestId); rooms.saveAndFlush(room);
        members.save(new RoomPlayer(room.getId(),owner.getId(),(short)1,false,true,clock.instant()));
        event(room,"ROOM_CREATED",Map.of()); return room;
    }
    private void addGuest(KesifRoom room,PlayerProfile actor) {
        List<RoomPlayer> roster=members.findByRoomIdOrderBySlot(room.getId());
        if(roster.stream().anyMatch(m->m.getPlayerId().equals(actor.getId())&&m.getActive())) return;
        if(room.getStatus()!=RoomStatus.OPEN||roster.size()>=2) throw conflict("ROOM_FULL");
        ensureFree(actor.getId());
        members.save(new RoomPlayer(room.getId(),actor.getId(),(short)2,false,true,clock.instant()));
        room.changeLobbyStatus(RoomStatus.FULL); event(room,"ROOM_PLAYER_JOINED",Map.of("playerId",actor.getId().toString()));
    }
    private PlayerProfile lockActor(String subject) {
        UUID id=currentPlayer.resolve(subject).getId();
        // Serialize reservations without blocking FK KEY SHARE locks from a cross-invitation.
        entityManager.createNativeQuery("SELECT id FROM kesif.kesif_player_profile WHERE id=:id FOR NO KEY UPDATE")
            .setParameter("id",id).getSingleResult();
        return players.findById(id).orElseThrow();
    }
    private KesifRoom lockRoom(UUID id) {
        // A prior code/idempotency lookup may have cached an older @Version.
        // Lock the row independently of that cached version, then refresh under the held DB lock.
        if(entityManager.createNativeQuery("SELECT id FROM kesif.kesif_room WHERE id=:id FOR UPDATE")
                .setParameter("id",id).getResultList().isEmpty()) throw missing("ROOM_NOT_FOUND");
        KesifRoom room=rooms.findById(id).orElseThrow(()->missing("ROOM_NOT_FOUND"));
        entityManager.refresh(room);
        return room;
    }
    private Invitation refreshInvitation(UUID id) {
        Invitation invitation=invitations.findById(id).orElseThrow(()->missing("INVITATION_NOT_FOUND"));
        entityManager.refresh(invitation);
        return invitation;
    }
    private void ensureFree(UUID playerId) {
        if(members.findByPlayerIdAndActiveTrue(playerId).isPresent()) throw conflict("PLAYER_BUSY");
    }
    private RoomPlayer requireMember(KesifRoom room,UUID actor) {
        return members.findByRoomId(room.getId()).stream().filter(m->m.getPlayerId().equals(actor)).findFirst()
            .orElseThrow(()->missing("ROOM_NOT_FOUND"));
    }
    private void requireGroup(String subject,String group) {
        if(groups.groupsFor(subject).stream().noneMatch(g->g.id().equals(group))) throw forbidden("NOT_SAME_GROUP");
    }
    private void requireOwnerGroup(KesifRoom room) {
        requireGroup(players.findById(room.getOwnerPlayerId()).orElseThrow().getExternalUserId(),room.getGroupExternalId());
    }
    private void requireRosterGroup(KesifRoom room) {
        List<UUID> active=members.findByRoomId(room.getId()).stream().filter(RoomPlayer::getActive).map(RoomPlayer::getPlayerId).toList();
        players.findAllById(active).forEach(p->requireGroup(p.getExternalUserId(),room.getGroupExternalId()));
    }
    private void validateSelection(String subject,Selection s) {
        requireGroup(subject,s.groupId());
        if(puzzles.findById(s.puzzleId()).filter(p->p.getActive()).isEmpty()) throw missing("PUZZLE_NOT_FOUND");
        if(subjects.findByIdAndActiveTrue(s.subjectId()).isEmpty()) throw missing("SUBJECT_NOT_FOUND");
        long count;
        if(s.topicId()!=null) {
            Topic topic=topics.findById(s.topicId()).filter(t->t.getActive()).orElseThrow(()->missing("TOPIC_NOT_FOUND"));
            if(!topic.getSubjectId().equals(s.subjectId())||topic.getGradeLevel()!=s.gradeLevel()) throw invalid("SELECTION_MISMATCH");
            count=topics.findAvailableTopics(s.subjectId(),s.gradeLevel().shortValue(),QuestionStatus.PUBLISHED).stream()
                .filter(t->t.getId().equals(s.topicId())).mapToLong(CatalogSummary::getQuestionCount).findFirst().orElse(0);
        } else count=subjects.findAvailableSubjects(s.gradeLevel().shortValue(),QuestionStatus.PUBLISHED).stream()
            .filter(t->t.getId().equals(s.subjectId())).mapToLong(CatalogSummary::getQuestionCount).findFirst().orElse(0);
        if(count<10) throw invalid("INSUFFICIENT_QUESTIONS");
    }
    private void sameRequest(KesifRoom room,JoinMethod method,Selection selection) {
        if(room.getJoinMethod()!=method||!selection(room).equals(selection)) throw conflict("IDEMPOTENCY_CONFLICT");
    }
    private void requirePending(Invitation invitation) {
        if(!invitation.getExpiresAt().isAfter(clock.instant())||invitation.getStatus()==InvitationStatus.EXPIRED) throw expired();
        if(invitation.getStatus()!=InvitationStatus.PENDING) throw conflict("INVITATION_NOT_PENDING");
    }
    private void requireOpen(KesifRoom room) {
        if(!room.getExpiresAt().isAfter(clock.instant())||room.getStatus()==RoomStatus.EXPIRED) throw expired();
        if(!OPEN.contains(room.getStatus())) throw conflict("ROOM_NOT_OPEN");
    }
    private boolean expireIfDue(KesifRoom room) {
        if(OPEN.contains(room.getStatus())&&!room.getExpiresAt().isAfter(clock.instant())) { close(room,RoomStatus.EXPIRED); return true; }
        return false;
    }
    private void close(KesifRoom room,RoomStatus status) {
        if(!OPEN.contains(room.getStatus())) return;
        room.changeLobbyStatus(status);
        members.findByRoomId(room.getId()).forEach(m->m.release(clock.instant()));
        invitations.findByRoomId(room.getId()).stream().filter(i->i.getStatus()==InvitationStatus.PENDING)
            .forEach(i->i.respond(status==RoomStatus.EXPIRED?InvitationStatus.EXPIRED:InvitationStatus.CANCELLED,clock.instant()));
        event(room,status==RoomStatus.EXPIRED?"ROOM_EXPIRED":"ROOM_CANCELLED",Map.of());
    }
    private void event(KesifRoom room,String type,Map<String,Object> data) {
        var payload=mapper.valueToTree(data);
        outbox.save(new OutboxEvent("ROOM",room.getId(),type,room.nextEventSequence(),payload,null,0,clock.instant()));
    }
    private RoomView view(KesifRoom room,UUID actor) {
        List<RoomPlayer> roster=members.findByRoomIdOrderBySlot(room.getId());
        Map<UUID,PlayerProfile> profiles=players.findAllById(roster.stream().map(RoomPlayer::getPlayerId).toList()).stream()
            .collect(Collectors.toMap(PlayerProfile::getId,Function.identity()));
        var views=roster.stream().map(m->new PlayerView(m.getPlayerId(),profiles.get(m.getPlayerId()).getDisplayName(),m.getSlot(),m.getReady(),m.getActive())).toList();
        boolean ready=room.getStatus()==RoomStatus.FULL&&views.size()==2&&views.stream().allMatch(m->m.ready()&&m.active());
        String code=null;
        if(room.getJoinMethod()==JoinMethod.CODE&&room.getOwnerPlayerId().equals(actor)&&OPEN.contains(room.getStatus())) {
            String candidate=codes.codeFor(actor,room.getCreationRequestId());
            if(Objects.equals(room.getCodeDigest(),codes.digest(candidate))) code=candidate;
        }
        return new RoomView(room.getId(),room.getOwnerPlayerId(),room.getJoinMethod(),room.getStatus(),selection(room),room.getExpiresAt(),views,ready,room.getEventSequence(),code);
    }
    private Selection selection(KesifRoom room) { return new Selection(room.getGroupExternalId(),room.getPuzzleId(),room.getSubjectId(),(int)room.getGradeLevel(),room.getTopicId()); }
    private InvitationView invitationView(Invitation i,KesifRoom room) { return new InvitationView(i.getId(),i.getRoomId(),i.getInviterId(),i.getInviteeId(),i.getStatus(),i.getExpiresAt(),selection(room)); }
    private static KesifApiException missing(String code) { return new KesifApiException(HttpStatus.NOT_FOUND,code,"Kayıt bulunamadı veya erişim yetkiniz yok."); }
    private static KesifApiException forbidden(String code) { return new KesifApiException(HttpStatus.FORBIDDEN,code,"Bu işlem için yetkiniz yok."); }
    private static KesifApiException conflict(String code) { return new KesifApiException(HttpStatus.CONFLICT,code,"İşlem mevcut lobi durumuyla çakışıyor."); }
    private static KesifApiException invalid(String code) { return new KesifApiException(HttpStatus.UNPROCESSABLE_ENTITY,code,"Seçimler veya soru havuzu bu oyun için uygun değil."); }
    private static KesifApiException expired() { return new KesifApiException(HttpStatus.GONE,"LOBBY_EXPIRED","Oda veya davetin süresi doldu."); }
}
