package com.doping.kesif.boutique;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.constraints.Size;
import java.util.List;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/kesif/groups")
@SecurityRequirement(name = "bearerAuth")
public class BoutiqueController {
    private final BoutiqueGroupGateway gateway;
    public BoutiqueController(BoutiqueGroupGateway gateway) { this.gateway = gateway; }
    @GetMapping
    @Operation(summary = "Öğrencinin uygun Butik grupları")
    public List<BoutiqueGroupGateway.GroupView> groups(@AuthenticationPrincipal Jwt jwt) {
        return gateway.groupsFor(jwt.getSubject());
    }
    @GetMapping("/{groupId}/friends")
    @Operation(summary = "Yalnız aynı gruptaki arkadaşlar; kendisi hariç")
    public List<BoutiqueGroupGateway.FriendView> friends(@AuthenticationPrincipal Jwt jwt,
            @PathVariable @Size(max = 128) String groupId) {
        return gateway.friendsFor(jwt.getSubject(), groupId);
    }
}
