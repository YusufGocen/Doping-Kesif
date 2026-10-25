package com.doping.kesif.room;

import java.util.UUID;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RoomPlayerRepository extends JpaRepository<RoomPlayer, UUID> {
    List<RoomPlayer> findByRoomId(UUID roomId);
    Optional<RoomPlayer> findByPlayerIdAndActiveTrue(UUID playerId);
    List<RoomPlayer> findByRoomIdOrderBySlot(UUID roomId);
    @Query("select m.roomId from RoomPlayer m where m.playerId=:playerId and m.active=true")
    Optional<UUID> findActiveRoomId(@Param("playerId") UUID playerId);
}

