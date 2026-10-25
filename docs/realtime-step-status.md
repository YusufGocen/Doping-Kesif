# WebSocket ve outbox — doğrulama raporu

22 Ekim 2026 IDE uyarı temizliği: kullanılmayan importlar kaldırıldı, KesifApiException için serialVersionUID eklendi, test PostgreSQLContainer oluşturma zinciri alan sahipliğini açıkça gösterecek şekilde ayrıldı. Mevcut shutdown hook korundu. Boş target klasöründen yeniden derleme ve tam verify sonucu: **0 derleyici uyarısı, 0 hata, 102 test geçti, 0 atlanan; BUILD SUCCESS**.

22 Ekim 2026. **102 test geçti; 0 başarısız, 0 hata, 0 atlanan; BUILD SUCCESS.** Gerçek PostgreSQL 16.14, Temurin Java 21.0.12.1 ve Maven verify kullanıldı. Başlangıçta önceki 88 test de yeniden çalıştırılıp başarılı bulundu.

Yeni 14 test: RealtimeIntegrationTest 8, OutboxPublisherTest 3, WebSocketLifecycleTest 3. Önceki 88 test son pakette de geçti. Kaynak ve testler boş target klasöründen derlenerek doğrulandı; son READY/olay gönderim sırası düzeltmesinden sonra tam paket yeniden çalıştırıldı. Spring Boot JAR üretildi ve test PostgreSQL'i kapatıldı. Sürekli açık sunucu veya yayın kurulmadı.

## Test edilen davranışlar

- Gerçek embedded Tomcat ve Java WebSocket istemcileriyle AUTH/READY/PING/PONG.
- Sahte token, yanlış rol, JWT saat toleransında olsa bile süresi dolmuş token reddi.
- Geçersiz Origin ve URL query/token reddi; yetkisiz istemci abonelik seçemez veya oyun komutu gönderemez.
- İki oda katılımcısı aynı bildirimi alır; üçüncü öğrenci alamaz. Ham kod, doğru key ve özel outbox payload'ı gönderilmez.
- Davetli öğrenci henüz odaya katılmadan INVITATION_RECEIVED alır.
- Oyun bildirimi yalnız oturum katılımcılarına gider. Bağlantı kapalıyken durum değiştikten sonra yeni AUTH ve güncel aktif oturum snapshot'ıyla devam edilir; soru aşamasında doğru cevap gizli kalır.
- Outbox dispatch hatasında retry/backoff; önceki başarısız sequence sonraki olayı bekletir. Başarılı kayıt tekrar yayınlanmaz. Desteklenmeyen aggregate beklemeye alınır.
- Kontrollü saat ile 5 saniyelik AUTH süresi, token expiry kapanışı ve aynı oyuncunun beşinci bağlantısının reddi.

Gerçek iki Chrome/Edge penceresiyle görsel oyun testi henüz yapılmadı; frontend ekranları bulunmuyor. WebSocket testleri gerçek ağ bağlantıları kullanır, tarayıcı arayüzü testi değildir. Yük/çok instance/gerçek kurum entegrasyonu bu doğrulamaya dahil değildir.

## Windows derleme uyumluluğu

Bu yönetimli Windows oturumunda javac, JAR ZIP dosya sistemi `toRealPath` işlemlerinde AccessDeniedException verdi. Sorun uygulama testlerinden önce, derleme araçlarında oluşuyordu. Eski Maven önbelleğinde yazma sorunu da görüldü.

Doğrulanan çözüm: yazılabilir yeni Maven önbelleği, JDK 21 ve isteğe bağlı `managed-windows-compiler` profili. Profil Eclipse derleyicisiyle source/target 21 kullanır; varsayılan javac derleyicisi değiştirilmedi. Bu profil yalnız JDK 21 ile kullanılmalıdır.

```powershell
Set-Location backend
.\mvnw.cmd -Pmanaged-windows-compiler verify
```

PostgreSQL test ortamı ayrıca sağlanmalıdır; README'deki Testcontainers veya ayrı *_test veritabanı seçenekleri geçerlidir. Agent doğrulamasında taşınabilir Maven ve ayrı yerel PostgreSQL kullanıldı. PostgreSQL başlatma betiği, Windows restricted-token sorunu için doğrudan ve gizli postgres süreci başlatacak şekilde uyumlandı; veri/uygulama şemasını değiştirmedi.

## Teslim edilen sözleşme ve sınırlar

[Canlı protokol](realtime-protocol.md): ilk AUTH, kişisel alıcı akışı, EVENT metadata, aggregate sequence, REST eşitlemesi ve bağlantı yeniden kurma algoritması.

- Tek backend instance hedeflenir; çok instance öncesi ortak broker/pub-sub gerekir.
- Bildirim teslimi tarayıcı ACK'i değildir. Çevrimdışı toparlanma REST ile yapılır; tekrar event mümkündür ve istemci dedupe yapmalıdır.
- Frontend otomatik reconnect, olay buffer'ı ve ekran güncellemeleri sonraki aşamadır.
- Yeni migration/tablo yok: V9 ve 18 domain tablosu korunur.
- [OpenAPI](openapi.json) REST snapshot'ıdır; WebSocket frame sözleşmesi ayrı protokol belgesindedir.
