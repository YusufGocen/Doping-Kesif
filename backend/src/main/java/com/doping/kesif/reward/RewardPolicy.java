package com.doping.kesif.reward;

import org.springframework.boot.context.properties.ConfigurationProperties;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;

/** Provisional local policy. Nonlocal rollout is disabled until explicit configuration. */
@ConfigurationProperties("kesif.rewards")
public record RewardPolicy(boolean enabled, Integer completionXp, Integer correctAnswerXp,
        Integer collectionCompletionXp, String collectionMapping) {
    public RewardPolicy {
        if(enabled) {
            for(Integer value:new Integer[]{completionXp,correctAnswerXp,collectionCompletionXp})
                if(value==null||value<0||value>10000) throw new IllegalArgumentException("Explicit XP values in 0..10000 required");
            if(!"SHARED_UNION".equals(collectionMapping)) throw new IllegalArgumentException("Explicit SHARED_UNION mapping required");
        }
    }
    public ObjectNode snapshot(ObjectMapper mapper) {
        return mapper.createObjectNode().put("version",1).put("completionXp",completionXp)
            .put("correctAnswerXp",correctAnswerXp).put("collectionCompletionXp",collectionCompletionXp)
            .put("collectionMapping",collectionMapping);
    }
}
