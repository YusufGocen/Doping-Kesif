package com.doping.kesif.reward;

import java.time.Instant;
import java.util.*;

public final class ProgressDtos {
    private ProgressDtos() { }
    public enum CollectionFilter { ALL, IN_PROGRESS, COMPLETED }
    public record PageView<T>(List<T> items,int page,int size,long total) { }
    public record CollectionView(UUID puzzleId,String title,String assetKey,int unlockedCount,Instant completedAt) { }
    public record CollectionDetail(CollectionView collection,List<Short> pieces) { }
    public record ProgressView(long totalXp,long completedGames,long correctAnswers) { }
    public record HistoryView(UUID sessionId,UUID puzzleId,String puzzleTitle,Instant endedAt,int correctCount,
            int revealedCount,int collectionAddedCount,long earnedXp,boolean rewardsFinalized) { }
    public record PlayerResult(UUID playerId,String displayName,int correctCount,int collectionAddedCount,long earnedXp) { }
    public record ResultView(UUID sessionId,UUID puzzleId,int revealedCount,Instant endedAt,
            boolean rewardsFinalized,List<PlayerResult> players) { }
}
