package com.doping.kesif.player;

import com.doping.kesif.common.persistence.BaseEntity;
import jakarta.persistence.*;
import java.util.Objects;

@Entity
@Table(name = "kesif_player_profile", schema = "kesif")
public class PlayerProfile extends BaseEntity {
    @Column(name = "external_user_id", nullable = false, length = 128)
    private String externalUserId;

    @Column(name = "display_name", nullable = true, length = 100)
    private String displayName;

    protected PlayerProfile() { }

    public PlayerProfile(String externalUserId, String displayName) {
        this.externalUserId = Objects.requireNonNull(externalUserId, "externalUserId");
        this.displayName = displayName;
    }

    public String getExternalUserId() { return externalUserId; }
    public String getDisplayName() { return displayName; }
}

