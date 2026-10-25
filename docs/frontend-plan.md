# Doping Keşif — referansa uygun frontend planı

22 Ekim 2026 güncellemesi. Görsel referans: kullanıcının dokuz ekranlı UI kolajı. Beyaz zemin, Doping mavisi, kompakt kartlar ve mevcut platform çerçevesi esas alınır. Sol logo/sidebar, üst arama/profil/ayarlar ve sağ takvim/yolculuk paneli korunur. Yeni akış orta alanda çalışır.

1. **Ana sayfa:** iki öğrencili yatay banner, dört küçük bilgi kutusu, dört görselli puzzle kartı ve Oyna bağlantıları. Uygulandı.
2. **Oyun Ayarları:** ayrı sayfada seçilen görev, 5–8. sınıf, ders ve isteğe bağlı konu. Mevcut API seçimi bu sayfaya taşındı. Sonraki iş: referanstaki ders ikonları ve Devam Et ile seçim aktarımının tamamlanması.
3. **Arkadaş seçimi / oda kodu:** Butik arkadaşlarını davet etme veya kodla katılma.
4. **Davet bekleniyor:** kabul, ret, iptal ve zaman aşımı durumları.
5. **Lobi:** iki oyuncu, hazır durumları, ortak oyun bilgileri ve başlatma.
6. **Soru:** ortak soru, seçenekler, süre ve cevap bekleme.
7. **Puzzle açılması:** iki oyuncunun sonucu ve açılan parçalar.
8. **Sonuç:** doğrular, parça sayısı, XP ve yeniden oynama.
9. **Koleksiyon:** tamamlanan/devam eden puzzle ve oyun geçmişi.

Her adım components / pages / api / model / styles ayrımıyla yürütülür. Özellikler birbirini doğrudan içe aktarmaz; uygulama sayfaları bileşimi yapar. React Query ve şema doğrulamalı API katmanı korunur. Her adım ilerleme.md dosyasına kaydedilir.

## İlk adımın davranışı

- `/kesif`: banner ve puzzle galerisi. Giriş öncesi dört kart açıkça önizleme olarak gösterilir.
- Giriş sonrası görevler `/puzzles`, gerçek ilerleme `/collections` üzerinden okunur. İlerleme isteği başarısızsa sahte sıfır gösterilmez; yeniden deneme sunulur.
- Oyna: `/kesif/ayarlar?gorev=...`. Görev kimliği/kodu backend kataloğunda çözümlenir.
- Yerel test hesabı ana sayfanın altında açılır bölümde bulunur. Üretim kimlik entegrasyonu ayrı iştir.
- Referanstaki Kesif metinleri kullanıcı arayüzünde Doping Keşif olarak kullanılır.
- Tarayıcıda görsel karşılaştırma henüz yapılmadı. Otomatik DOM testleri piksel uyumunu doğrulamaz.
## Ayrı giriş ekranı — 22 Ekim 2026

Kullanıcı isteğiyle yerel hesap kutusu Keşif ana sayfasından ve Oyun Ayarları sayfasından kaldırıldı. `/giris` bağımsız bir başlangıç ekranıdır: solda mavi tanıtım alanı ve tablet görünümü, sağda Merhaba başlığı ile backend’den gelen kullanıcı kartları bulunur. Kullanıcı seçimi mevcut yerel token + doğrulanmış /me akışını kullanır; yeni bir üretim kimlik sistemi kurulmadı.

Oturumsuz dashboard erişimi giriş ekranına yönlenir. Giriş tamamlanınca istenen Keşif sayfasına dönülür; dönüş adresi yalnız `/kesif` altındaki uygulama yollarıyla sınırlıdır. Oturum sona erdiğinde veya profil penceresinden Çıkış yap seçildiğinde giriş ekranı açılır. Token depolama davranışı değişmedi: sayfa yenilenince yeniden giriş gerekir. Kullanıcı ekleme/silme backend’i bu adımda eklenmedi.

Sonraki oyun adımları önceki sırada devam eder: Oyun Ayarları Devam Et → arkadaş/oda → davet → lobi → oyun.

Giriş görseli güncellemesi: sol alan kullanıcının sağladığı login-platform.png görselini doğrudan kullanır. Giriş 100dvh düzenindedir; Yusuf, Ayşe, Mert ve Zeynep kartları gösterilir. Ortak UserAvatar bileşeni giriş, üst profil ve profil penceresinde aynı kimliğe aynı avatarı çizer.

## 22 Ekim 2026 — Devam Et ve arkadaş seçimi

Oyun Ayarları ekranındaki Devam Et, backend kataloğunda oynanabilir sınıf/ders/konu seçimi tamamlanınca etkinleşir. Konu isteğe bağlıdır; seçilmezse topicId null ile Tüm Konular kullanılır. Seçilen puzzle, sınıf, ders ve konu uygulama sayfası üzerinden `/kesif/arkadas` sayfasına aktarılır. Taslak mevcut kullanıcı kimliğine bağlıdır; eksik/geçersiz veya başka kullanıcıya ait taslak ana sayfaya döner.

Arkadaş ekranı mevcut kabuğun orta alanında açılır. `/groups` ile Butik grupları, `/groups/{groupId}/friends` ile arkadaşlar okunur. Grup seçimi, Türkçe arama, ortak avatarlar, tek arkadaş seçimi, yüklenme/boş/hata/tekrar dene durumları bulunur. API çevrimiçi durum sağlamadığı için çevrimiçi etiketi uydurulmaz. Kendisi listeden çıkarılır.

Oyun Daveti Gönder gerçek `/invitations` POST isteğini yapar; istek boyunca düğme ve seçimler kilitlenir. Belirsiz hatadan sonra aynı seçimle yeniden denemede aynı clientRequestId korunur. Başarıda davet bekleme ve son geçerlilik saati gösterilir. Daveti İptal Et gerçek iptal ucuna bağlıdır.

Sonraki adım: alıcıda gelen davetler/kabul/ret, canlı bekleme durumu, lobiye geçiş ve oda koduyla katılma. Bu adımda kabulün otomatik takibi ve lobi yoktur. Sayfadan ayrılıp geri gelindiğinde aktif daveti backend’den geri yükleme henüz eklenmedi. Backend dosyaları değiştirilmedi.

## Davet ve lobi durumu — 22 Ekim

Gelen davet kabul/ret, gönderenin kabul sonrası lobiye geçişi, aktif odaya dönüş, hazır durumu ve ayrılma backend'e bağlandı. 2–3 saniyelik polling kullanılır. Gerçek HTTP iki kullanıcı kontrolü geçti; tarayıcı E2E yapılmadı. Sonraki adım oyunu başlatma ve ortak soru ekranıdır; oda kodu ve WebSocket bağlantısı ayrıca tamamlanacaktır.

## Ortak soru ekranı — 22 Ekim 2026

Oda sahibine iki oyuncu hazır olduğunda Oyunu Başlat düğmesi açılır. Başlatma gerçek backend oturumunu oluşturur; davetli oyuncu STARTED odası ve aktif oturum üzerinden aynı oyun sayfasına geçer. `/kesif/oyun/:id` katılımcı oturumunu yükler. Başka sayfaya gidip geri gelindiğinde aktif oyun bağlantısıyla devam edilir.

Soru/seçenekler, tur numarası, oyuncuların doğru sayıları, cevap bekleme ve backend deadline'ına dayalı kalan süre gösterilir. İlk cevap sonrası seçenekler kilitlenir. Belirsiz hatada aynı tur/seçenek için aynı clientRequestId yeniden kullanılır. Yalnız backend'in beklediği clientRequestId ve optionKey gönderilir. Süre bittiğinde istemci kendi başına sonuç üretmez; sunucu snapshot'ı beklenir.

REVEAL aşamasında doğru seçenek, oyuncuların doğru/yanlış/timeout sonucu ve açılmış 20 parça ızgarası gösterilir. Sonraki Soru/son turda Sonuçları Gör, backend devam onayına bağlıdır. Diğer oyuncunun onayı veya sunucu süresi beklenir. Tamamlanmada temel doğru/parça özeti ve ana sayfaya dönüş vardır; ayrıntılı XP/rozet/oyun geçmişi ekranı sonraki iştir.

Katmanlar: features/game/api, model, components, styles; app sayfaları game ve social bileşimini yapar. Social özelliği game özelliğini içe aktarmaz; lobi oyun kontrollerini uygulama katmanından slot ile alır. Şema doğrulaması ve oturum koruması sürer. Snapshot'lar 1 saniyelik polling ile güncellenir; WebSocket frontend entegrasyonu sonraki optimizasyondur.
## 22 Ekim 2026 — Sonuç, koleksiyon ve geçmiş

Tamamlanan oyun `/kesif/sonuc/:id` ekranına yönlenir. Sonuç backend'deki iki oyuncunun doğru, earnedXp ve collectionAddedCount değerlerini gösterir; XP formülü frontend'de hesaplanmaz. rewardsFinalized=false durumunda uyarı gösterilir. Oyun içi açılan parçalar session snapshot'ından, kişisel birikim collection detail uçlarından okunur.

`/kesif/koleksiyon`: toplam XP/oyun/doğru özeti; Tümü, Tamamlananlar, Devam Edenler filtreleri ve sayfalama. Oyun Geçmişim sekmesi kişisel geçmişi gösterir ve kayıtları sonuç ekranına bağlar. `/kesif/koleksiyon/:id`: gerçek kişisel parça ızgarası ve yeniden oynama. Ana sayfada Koleksiyonum bağlantısı, üst aramada Koleksiyonum yönlendirmesi eklendi.

Sıradaki işler: oda koduyla oluşturma/katılma; frontend WebSocket/reconnect; tarayıcıda iki oturum E2E, mobil ve görsel referans kontrolü. Rozet sistemi backend sözleşmesinde bulunmadığı için bu adımda rozet ödülü üretilmez.

## 23 Ekim — Kod/link akışı tamamlandı

Yeni referansa göre yöntem kartları, oluştur/katıl, paylaşım ve avatar odaklı lobi uygulandı. Ders seçiminden sonra /kesif/eslesme; ana sayfadan /kesif/oda?tab=katil; paylaşım /kesif/oda/:id/paylas. Gerçek sunucu kodu ve geçerliliği kullanılır; oda adı/süre seçimi eklenmedi. 58 test ve gerçek iki kullanıcı HTTP oyun akışı başarılı. Tarayıcı envanteri boş olduğundan görsel QA kalır. Sıradaki adımlar WebSocket/reconnect, mobil/görsel kabul ve iki tarayıcı E2E'dir.


## 23 Ekim — Canlı bağlantı durumu

WebSocket/reconnect, READY sonrası REST eşitleme, buffer/dedupe/sequence, heartbeat, bağlantı göstergesi ve fallback polling eklendi. 67 test ve gerçek iki WebSocket kullanıcısıyla ret/iptal, kod, 10 tur, süre dolması, reconnect ve sonuç tutarlılığı doğrulandı. Gerçek iki tarayıcı E2E ise araçta tarayıcı oturumu bulunmadığından açık kaldı; docs/frontend-browser-e2e-status.md takip listesidir. Sonraki tamamlanacak iş bu tarayıcı kabulü ve görsel/mobil kontroldür.

## Otomatik lobiye geçiş

Kod paylaşım ekranı, backend oda durumu FULL veya STARTED olduğunda `/kesif/lobi/:id` adresine otomatik ve history replace ile geçer. Kullanıcıdan Arkadaşım Katıldı/Devam Et onayı istenmez. WebSocket snapshot yenilemesi bu geçişi tetikler; bağlantı kopuksa mevcut polling aynı durumu kontrol eder. OPEN durumda kod/link paylaşımı ve bekleme sürer; kapanan veya süresi dolan odalar otomatik geçirilmez.

### 23 Ekim 2026 — Yeni Keşif ana sayfası

- Üst tanıtım alanı: mevcut öğrenci illüstrasyonu, Doping Keşif başlığı ve oyun bilgileri tek bölümde.
- Üç işlevli kısayol: oda koduyla katıl, koleksiyonum, görev listesine git. Seçim yapılmadan arkadaş daveti başlatılmaz; görev seçme akışı korunur.
- Keşif görevleri: yatay görseller, tema etiketleri, açıklamalar, gerçek kişisel ilerleme ve ayarlara giden Keşfe Başla bağlantıları.
- Alt rehber: görev seç, arkadaşını davet et, soruları çöz, dünyayı tamamla; mevcut detaylı yardım penceresine erişim.
- Renkli yüzeyler, dar ekranda uyarlanan sütunlar, klavye bağlantıları ve azaltılmış hareket tercihi korunur.
