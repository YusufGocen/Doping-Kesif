package com.doping.kesif.local;

import java.util.List;
import java.util.Optional;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

/** Demo identities only; not an institution user directory. */
@Component
@Profile("local & !prod")
public class LocalIdentityDirectory {
    private final List<DemoUser> users = List.of(
        new DemoUser("yusuf", "local:yusuf", "Yusuf Göçen", "local-group-8a"),
        new DemoUser("ayse", "local:ayse", "Ayşe Yılmaz", "local-group-8a"),
        new DemoUser("mert", "local:mert", "Mert Demir", "local-group-8a"),
        new DemoUser("zeynep", "local:zeynep", "Zeynep Kaya", "local-group-8a"),
        new DemoUser("emir", "local:emir", "Emir Arslan", "local-group-8b")
    );
    public List<DemoUser> users() { return users; }
    public Optional<DemoUser> findByKey(String key) { return users.stream().filter(u -> u.userKey().equals(key)).findFirst(); }
    public Optional<DemoUser> findBySubject(String subject) { return users.stream().filter(u -> u.externalUserId().equals(subject)).findFirst(); }
    public record DemoUser(String userKey, String externalUserId, String displayName, String groupReference) { }
}
