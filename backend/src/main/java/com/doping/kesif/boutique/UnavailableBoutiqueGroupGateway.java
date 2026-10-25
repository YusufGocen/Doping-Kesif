package com.doping.kesif.boutique;

import com.doping.kesif.common.api.KesifApiException;
import java.util.List;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

@Component
@Profile("!local | prod")
public class UnavailableBoutiqueGroupGateway implements BoutiqueGroupGateway {
    @Override public List<GroupView> groupsFor(String subject) { throw unavailable(); }
    @Override public List<FriendView> friendsFor(String subject, String group) { throw unavailable(); }
    private KesifApiException unavailable() {
        return new KesifApiException(HttpStatus.SERVICE_UNAVAILABLE, "INTEGRATION_NOT_CONFIGURED", "Gerçek Butik entegrasyonu henüz yapılandırılmadı.");
    }
}
