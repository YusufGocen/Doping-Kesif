package com.doping.kesif.boutique;

import com.doping.kesif.common.api.KesifApiException;
import com.doping.kesif.local.LocalIdentityDirectory;
import java.util.List;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

@Component
@Profile("local & !prod")
public class LocalBoutiqueGroupGateway implements BoutiqueGroupGateway {
    private final LocalIdentityDirectory directory;
    public LocalBoutiqueGroupGateway(LocalIdentityDirectory directory) { this.directory = directory; }
    @Override public List<GroupView> groupsFor(String subject) {
        return directory.findBySubject(subject).map(user -> List.of(new GroupView(user.groupReference(),
            user.groupReference().equals("local-group-8a") ? "8-A Matematik Demo Grubu" : "8-B Demo Grubu",
            (int) directory.users().stream().filter(u -> u.groupReference().equals(user.groupReference())).count()))).orElse(List.of());
    }
    @Override public List<FriendView> friendsFor(String subject, String groupReference) {
        boolean member = groupsFor(subject).stream().anyMatch(g -> g.id().equals(groupReference));
        if (!member) throw new KesifApiException(HttpStatus.FORBIDDEN, "NOT_SAME_GROUP", "Bu Butik grubuna erişim yetkiniz yok.");
        return directory.users().stream().filter(u -> u.groupReference().equals(groupReference) && !u.externalUserId().equals(subject))
            .map(u -> new FriendView(u.externalUserId(), u.displayName())).toList();
    }
}
