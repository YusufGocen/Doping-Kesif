package com.doping.kesif.boutique;

import java.util.List;

public interface BoutiqueGroupGateway {
    List<GroupView> groupsFor(String trustedExternalUserId);
    List<FriendView> friendsFor(String trustedExternalUserId, String groupReference);
    record GroupView(String id, String name, int memberCount) { }
    record FriendView(String externalUserId, String displayName) { }
}
