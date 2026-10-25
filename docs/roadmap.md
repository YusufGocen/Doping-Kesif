# Doping Keşif — İnceleme ve geliştirme yol haritası

Tarih: 22 Ekim 2026 · Sürüm: 5. Altyapı, 18 tablo, JWT/katalog, lobi, REST oyun motoru, kişisel koleksiyon/XP/geçmiş ve tek instance WebSocket/outbox uygulandı. Güncel sözleşmeler: [oyun](game-api.md), [koleksiyon/ödül](progress-and-rewards-api.md), [canlı protokol](realtime-protocol.md). Sonraki sıra: dashboard orta alanına frontend ve otomatik reconnect → gerçek kurum servisleri → uçtan uca/yük/dağıtım doğrulaması. Çok instance için ortak broker ayrı aşamadır. Aşağıdaki ilk plan bölümlerindeki öneriler ve henüz uygulanmadı ifadeleri tarihsel plan bağlamındadır; güncel durum README ve aşama raporlarından izlenir.

## 0. Güncel kapsam — dashboard içine Kesif ve kodlu oda

Bu bölüm, aşağıdaki ilk incelemede yer alan bağımsız uygulama/yerleşim önerilerini gerektiği yerde günceller.

### Yerleşim ve görsel dil

- Mevcut Doping Hafıza sol sidebar'ı, üst arama alanı, sağ üst hesap/ayar/bildirim alanı ve sağ takvim/yolculuk paneli korunacak.
- Sol sidebar'ın en alt menü öğesi Doping Keşif logosu ve etiketi olacak. Seçildiğinde orta içerik alanında Kesif ana sayfası açılacak.
- Kesif'ın seçim, oda, lobi, soru, puzzle, sonuç ve koleksiyon sayfaları aynı orta içerik alanında çalışacak. İkinci sidebar, üst hesap menüsü veya takvim oluşturulmayacak.
- Beyaz ve açık gri zeminler, Doping'in mevcut mavi butonları, marka renkleri, tipografi, kenarlık ve boşluk sistemi esas alınacak. Önceki mor ağırlıklı tasarım önerisi güncellendi. Kesin renk kodları ekran görüntüsünden tahmin edilmek yerine mevcut tema kaynaklarından alınacak.
- Dar ekranlarda mevcut platformun responsive davranışı kullanılacak. Sağ panelin davranışı platform bileşenlerinden devralınacak.
- Platform kodu sağlanana kadar yerelde dashboard kabuğu temsili oluşturulabilir; gerçek entegrasyon tamamlandı diye sunulmayacak. Frontend framework kararı mevcut platform kodu incelendikten sonra kesinleşecek; React planı henüz kurum altyapısı hakkında bir tespit değildir.

### İki katılım yolu

1. Butik arkadaşından davet: puzzle ve ders ayarları → uygun Butik grubunu/arkadaşını seç → davet gönder → karşı taraf kabul etsin → ortak lobi.
2. Oda koduyla katılım: puzzle ve ders ayarları → oda oluştur → kodu göster → diğer öğrenci Kesif içindeki Odaya Katıl ekranına kodu yazsın → ortak lobi.

İki yol aynı maç oluşturma ve oyun motoruna bağlanacak. Kodlu oda ayrı bir oyun türü değildir. Butik çalışma grubunda 4–5 kişi bulunabilmesi Kesif'ın 4–5 kişilik olacağı anlamına gelmez. Mevcut oyun tasarımı iki kişi, 10 soru ve 20 parça olarak korunuyor; çok oyunculu genişleme ayrıca ürün kararı gerektirir.

Kod tek başına kimlik veya grup yetkisi sayılmaz. Planlama varsayımı: kodla katılan öğrenci giriş yapmış ve oda sahibiyle aynı uygun Butik grubunda olmalı. Kullanıcının sınıf içinde daha geniş erişim isteyip istemediği açık karardır. Oda kodu sohbet üzerinden gönderilmesi gereken bir entegrasyon olarak yorumlanmaz; kullanıcıya kopyalama aracı sağlanır.

### Yeni ve değişen ekranlar

| Ekran | İçerik |
|---|---|
| Kesif ana sayfa | Puzzle görevleri, Oyun Oluştur, Odaya Katıl, koleksiyon ve geçmiş erişimi |
| Oyun ayarları | Puzzle, sınıf, ders, isteğe bağlı konu veya Tüm Konular |
| Katılım yöntemi | Butik arkadaşını davet et veya kodlu oda oluştur |
| Butik arkadaşları | Uygun grup/arkadaş, davet ve kabul bekleme |
| Oda oluşturuldu | Oda kodu, kodu kopyala, katılımcı bekleme, süre ve iptal |
| Odaya katıl | Kod girişi; geçersiz, süresi dolmuş, dolu veya erişilemez oda durumları |
| Ortak lobi | İki oyuncu, oyun ayarları ve her oyuncunun hazır durumu |
| Soru / reveal / sonuç | Aynı orta alanda eşzamanlı 10 tur ve 20 parça sınırı |
| Koleksiyon ve geçmiş | Kişisel kalıcı ilerleme ve önceki maçlar |

### Backend ve veri modeline etkisi

- Öneri: kesif_room tablosu; owner_player_id, group_external_id, puzzle ve seçim referansları, erişim kodunun güvenli doğrulama değeri, expires_at, status, version ve oluşturulan session referansı. Kesin kolonlar tek veri modeli çalışmasında yazılacak.
- Oda yaşam döngüsü önerisi: OPEN → FULL → STARTED; başlamadan CANCELLED veya EXPIRED. Kalıcı oyuncu kaydı ve oda/session sınırı Faz 1'de kesinleştirilecek.
- Davetli maçlar invitation üzerinden, kodlu maçlar room üzerinden başlatılabilir. Mevcut zorunlu invitation_id varsayımı değişmeli; kaynak türü ve kaynak tekilliği kısıtları yazılmalı. İki farklı yoldan aynı oda için çift session üretilmemeli.
- Oda yalnız iki farklı öğrenci kabul eder. Son boş yere eşzamanlı katılım atomik kilit/constraint ile korunur; üçüncü öğrenci reddedilir. Aynı öğrencinin tekrar katılması güvenli ve idempotent olur.
- Kod sunucuda tahmin edilmesi zor şekilde üretilir, süreli olur, aktif kod çakışması engellenir; deneme sayısı sınırlanır ve kodlar loglara yazılmaz. Kısa kodların doğrulama yöntemi ve entropisi birlikte tasarlanır.
- Oda sahibinin ayrılması, ikinci oyuncunun lobiden çıkması, kod yenileme ve dolu odanın yeniden açılması kuralları açık karar olarak tutulur. Başlamış maça kodla yeni katılımcı alınmaz.
- Tüm Konular seçeneği için topic_id zorunlu olmamalı veya açık bir seçim kapsamı modeli bulunmalı; soru seçimi sınıf ve ders filtresini korumalı.
- Önceki 16 çekirdek tablo hedefi sabit bir sınır değildir. Oda gereksinimiyle envanter güncellenecek; salt eski sayıyı korumak için gereksinim kaybedilmeyecek.

### Önerilen ek API ve olaylar

API prefix'i için /api/v1/kesif önerisi sürüyor. Aşağıdakiler henüz uygulanmış endpoint'ler değildir.

| İşlem | Önerilen sözleşme |
|---|---|
| Oda oluştur | POST /rooms |
| Kodla katıl | POST /rooms/join; kod request body içinde |
| Oda görüntüle | GET /rooms/{id}; yalnız yetkili katılımcı |
| Odadan ayrıl | POST /rooms/{id}/leave |
| Oda iptal | POST /rooms/{id}/cancel; oda sahibi |
| Oda olayları | ROOM_PLAYER_JOINED, ROOM_PLAYER_LEFT, ROOM_CANCELLED, ROOM_EXPIRED; yalnız yetkili alıcılar |

Lobi hazır olma, soru, cevap, reveal ve final mevcut ortak session sözleşmesini kullanır. Oda kodu URL içinde taşınmaz. Henüz katılımcı olmayan kullanıcıya oda detayları açılmaz.

### Güncellenmiş uygulama sırası

1. Gereksinim ve karar kaydını bu açıklamaya göre birleştir: dashboard sınırı, iki katılım yolu, iki kişilik maç.
2. Tek DB/ERD ve API/WS sözleşmelerini oda modeli, Tüm Konular ve kaynak türüyle tamamla.
3. Orta alana sığan ekran akışlarını ve Doping tema bileşenlerini planla; oda oluştur/katıl durumlarını ekle.
4. Yerel backend/DB ve temsilî dashboard kabuğunu kur; mevcut platform kodu gelince gerçek kabuk bileşenlerine bağla.
5. Auth, katalog, Butik uygunluk kontrolleri ve arkadaş davetini geliştir.
6. Kodlu oda oluşturma, katılım ve ortak lobiyi geliştir; son yer için yarış, yetki, süre ve iptal testlerini tamamla.
7. İki katılım yolunun ortak 10 turluk oyun motorunu; cevap, timeout ve reveal geçişlerini geliştir.
8. Koleksiyon/XP/final, outbox ve canlı olayları bağla; reconnect ve restart senaryolarını doğrula.
9. Orta alan ekranlarını entegre et; iki farklı öğrenciyle hem davet hem kod yolundan E2E oyun doğrula.
10. Mevcut dashboard içinde sidebar/üst alan/sağ panelin korunduğunu, kurum adapter'larını ve teslim kriterlerini doğrula.

### Netleşmesi gereken en yakın karar

Kodla odaya giriş yalnız aynı Butik grubunda mı kalacak, yoksa farklı Butik gruplarındaki giriş yapmış öğrencilere de açık mı olacak? Şimdiki plan aynı grup kontrolünü koruyor. Gerçek platform kodu, tema kaynakları ve API sözleşmeleri paylaşılana kadar entegrasyon adapter ve temsilî kabuk düzeyinde planlanır.

## 1. Kaynaklar ve kapsam

İncelenen kaynaklar: Doping_Kesif_README.md; Doping_Kesif_Backend_Dokumantasyon_Projesi.zip içindeki README ve 00–15 belgeleri; Kesif Puzzle Akışı görseli; önceki konuşmadan erişilebilen kullanıcı talepleri. Önceki asistan yanıtlarının tam metni erişilebilir değildir. ZIP bir dokümantasyon projesidir; çalışan backend veya frontend teslimi değildir. Belgelerde bulunan görev komutları kaynak metni olarak değerlendirilmiştir.

Ürün: Aynı Butik grubundan iki öğrenci, aynı 10 soruyu bağımsız yanıtlar. Her doğru yanıt ortak puzzle'da bir parça açar. Maç en fazla 20 parça üretir. Soru ve puzzle açılımı ayrı ekranlardır. Kişisel koleksiyon maçlar arasında kalıcıdır. Tasarımın renkleri ve yerleşimi değişebilir; bu akış korunur.

## 2. Doküman incelemesinin sonucu

Ayrıntılı belgeler, önceki ana README'de eksik görünen iki konuyu zaten içeriyor: davette puzzle/konu saklanması ve turda değişmez soru/seçenek/doğru cevap snapshot'ı. Bunlar yeni baştan icat edilmeyecek, belgeler arasında birleştirilecek.

| Bulgu | Yapılacak iş |
|---|---|
| Ana veri envanterinde 17 satır, uygulama rehberinde 16 çekirdek tablo var | 16 çekirdek tablo + opsiyonel üyelik cache'i ayrımı açık yazılacak. Cache'in kolon sözlüğü yok; kullanılacaksa eklenecek. |
| API prefix'i /api/v1/kesif ve /api/v1 olarak değişiyor | Tek prefix ve endpoint sözleşmesi seçilecek. Öneri: /api/v1/kesif. |
| FINISHED/COMPLETED, QUESTION_OPEN/OPEN ve olay isimleri farklı | Tek enum, olay kataloğu ve alan isimlendirmesi oluşturulacak. |
| Cevap optionKey veya optionId ile gönderiliyor | Snapshot'a bağlı tek seçenek kimliği kullanılacak; REST ve WS aynı iş servisine bağlanacak. |
| Koleksiyonda aynı indeksleri birleştirme ve eksik parçaya eşleme birlikte anlatılıyor | Ürün kararı olarak tek algoritma seçilecek. Öneri: kazanım sayısı kadar eksik parça, en fazla 20. |
| Davet ve session karşılıklı FK içeriyor | Tek otoriter ilişki önerisi: session.invitation_id UNIQUE; ters bağlantı sorgudan türetilsin. |
| Bazı kolonlar, nullability/default ve indeks referansları eksik | Tam kolon sözlüğü, ERD ve gerçek migration planı aynı modele bağlanacak. |
| Reveal devam komutu ve kalıcı hazır bilgisi tüm belgelerde yer almıyor | Tur bazlı devam onayı ve deadline alanları tasarlanacak. |
| Tam OpenAPI YAML pakette yok | Request/response/error şemalarıyla doğrulanabilir sözleşme üretilecek. |
| Snapshot'tan sonra abonelik önerisi olay kaçırabilir | Önce abonelik ve tamponlama, sonra sequence içeren snapshot ve yeni olayların uygulanması tasarlanacak; sıra boşluğunda yeniden snapshot alınacak. |
| Commit sonrası yayın ile outbox alternatif bırakılmış | Öneri: kalıcı olaylar için transaction içinde outbox; tekrar teslimi istemcide eventId ile ele alma. |
| Rozet ve çevrimiçi durumu görselde var | Ayrı özellikler olarak kapsamı belirlenecek; mevcut sistem adapter'ı veya sonraki faz olarak planlanacak. |

## 3. Görsel ve kullanıcı akışı

Korunacak yaklaşım: açık zemin, mor vurgu, Doping sol menüsü, görev kartları, sade iki oyuncu alanı, ayrı soru/reveal ekranları ve koleksiyon filtreleri. Görsel kesin ekran ölçüsü veya nihai tasarım değildir.

| Ekran | Geliştirme karşılığı ve düzeltme |
|---|---|
| Ana sayfa | Puzzle kartları kişisel koleksiyon ilerlemesini gösterir. Yeni maç sıfırdan başlar; bu fark metinde belirtilir. Tam görsel önizlemesinin sürpriz hedefiyle uyumu kararlaştırılır. |
| Ayarlar | Sınıf, uygun ders ve konu; görselde konu seçimi eksik. İçerik bulunmayan seçenekler aktifmiş gibi sunulmaz. |
| Arkadaş seçimi | Grup seçimi gerekebilir. Davet gönder, gönderildi, kabul, ret, süre doldu durumları eklenir. Buradaki buton doğrudan maç başlatmaz. |
| Lobi | İki taraf kendi hazır bilgisini verir. İki taraf hazır olmadan oyun başlamaz. 10 soru ve 20 parça ayrı satırlarda gösterilir. |
| Soru | Seçim, gönderim, kabul edildi ve arkadaş bekleniyor durumları ayrılır. Tur kapanmadan doğru cevabı çağrıştıran onay işareti kullanılmaz. Matematik gösterimi desteklenir. |
| Puzzle açılımı | 20 hücreli, örneğin 5 sütun × 4 satır ızgara; görseldeki ızgara bu kurala uymuyor. 0, 1 ve 2 parça senaryoları ayrı metin/animasyon alır. |
| Sonuç | Ortak kazanım, benim doğru sayım, arkadaşımın doğru sayısı, kişisel yeni parçalar ve XP ayrı gösterilir. Görselde 7 doğru + 9 doğru = 16 parça tutarlı; +70 XP önerilen formülle açıklanamıyor. |
| Koleksiyon | Tamamlanan/devam eden filtreleri; kişisel kalıcı ilerleme. Rozet alanı ayrı kapsam kararıdır. |

Ek ekran/durumlar: gelen davet bildirimi, davet bekleme, soru havuzu yetersiz, bağlantı kesildi, yeniden bağlanıyor, arkadaş ayrıldı, oturum süresi doldu, oyun geçmişi. Ana platform araması ve sidebar bağlantıları mevcut platforma ait kabuktur.

## 4. Katmanlar ve geliştirilecek parçalar

Teknolojiler mevcut dokümanlardan alınan planlama önerileridir. Kesin bağımlılık sürümleri uygulama öncesinde destek ve uyumluluk kontrolüyle sabitlenecek.

| Katman | Planlanan araçlar | Sorumluluk |
|---|---|---|
| Web | React, TypeScript, Vite, Tailwind, React Router | Ekranlar, ortak bileşenler, responsive ve erişilebilir davranış |
| İstemci verisi | TanStack Query, fetch, STOMP istemcisi | REST cache, komutlar, olay reducer'ı, reconnect |
| Matematik | Öneri: KaTeX; içerik formatıyla doğrulanacak | Formüller, seçenekler ve medya gösterimi |
| Backend | Java 21 tabanı, Spring Boot, Maven | Modüler monolit; iş kuralları ve transaction'lar |
| Güvenlik | Spring Security, JWT/SSO adapter'ı | Kimlik, grup ve maç yetkisi; local test kimlikleri |
| Veri | PostgreSQL, JPA/Hibernate, Flyway | Katalog, davet, oturum, snapshot, cevap, parça, koleksiyon, XP ve outbox |
| Canlı olaylar | Spring WebSocket/STOMP | Davet, hazır olma, soru, cevap durumu, reveal ve final bildirimleri |
| API sözleşmesi | OpenAPI, Swagger UI | DTO, hata ve yetki sözleşmeleri |
| Görseller | Local statik asset; sonra kurum CDN adapter'ı | Kart kapakları, puzzle ve soru medyası; DB'de dosya yerine metadata |
| Yerel ortam | Docker Compose | PostgreSQL ve tekrar kurulabilir demo ortamı |
| Doğrulama | JUnit, Testcontainers, Vitest/RTL, Playwright | İş kuralı, DB, eşzamanlılık, güvenlik ve iki oyunculu E2E |
| İşletim | Actuator, Micrometer, yapılandırılmış log | Sağlık, hata, süre, reconnect ve outbox takibi |

İlk MVP tek backend instance ile planlanır. Broker/Redis ve çoklu instance gereksinimi kapasite hedefiyle ayrıca tasarlanır. Kurumun mevcut frontend altyapısı farklıysa bağımsız Vite uygulaması kararı yeniden değerlendirilir.

## 5. Veri sahipliği ve güvenilir akış

Kurum kimlik, Butik üyelik ve soru bankasının otoritesidir. Kesif bunların gerçek API'lerini varsaymaz; adapter üzerinden bağlanır. Local profilde test kullanıcıları, grup fixture'ları ve soru havuzu kullanılır. Yalnız desteklenen içerik kombinasyonları seçilebilir.

Backend; kimlik ve katılımcılığı denetler, soru setini sabitler, cevapları snapshot'a göre doğrular, deadline'ı uygular ve sonucu hesaplar. Frontend doğru cevap, XP veya parça seçmez.

Önerilen komut yaklaşımı: davet, hazır, cevap ve devam REST üzerinden; anlık değişiklikler WebSocket üzerinden. Böylece ilk tam maç WebSocket olmadan da doğrulanabilir. Daha sonra WS komutları gerekirse aynı servis ve idempotency kurallarına bağlanır.

Sabit lock sırası, oyuncu/tur unique kısıtı, aynı cevabın güvenli tekrar gönderimi ve idempotent final zorunludur. Yeniden başlatma sonrası zamanı dolan turlar veritabanından bulunur. Presence için heartbeat/bağlantı zaman aşımı kullanılır; çevrimiçi görünmek oynamaya uygun olmakla aynı değildir.

Soru ekranına doğru cevap ve gelecekteki soru seti gönderilmez. Puzzle maskesi görsel bir deneyimdir: tarayıcıya tam görsel indirilirse gizli hücreler teknik olarak erişilebilir olur. Gerçek parça gizliliği istenirse sunucuda ayrı tile/asset erişimi tasarlanır.

## 6. Aşamalı iş planı ve kabul ölçütleri

| Faz | İş | Somut teslim ve çıkış ölçütü |
|---|---|---|
| 0 | Gereksinimleri birleştir | Tek kurallar listesi, kaynak uyuşmazlıkları ve karar kaydı; kesin/öneri/açık ayrımı |
| 1 | Teknik sözleşmeler | Tam DB sözlüğü ve ERD, entity/DTO tasarımı, OpenAPI, WS şemaları, state machine ve kabul-test eşlemesi |
| 2 | UX akışını düzelt | Sekiz ana ekran ve eksik durumlar; görev/kişisel koleksiyon ayrımı, 10 soru/20 parça ve davet akışı tutarlı |
| 3 | Çalışma iskeleti | Backend, frontend kabuğu ve PostgreSQL; migration, health ve local auth çalışır; sürümler kilitli |
| 4 | Katalog ve grup erişimi | Puzzle/ders/konu ve uygun arkadaş listesi; grup dışı erişim reddedilir |
| 5 | Davet ve lobi | Kabul/ret/iptal/expiry; iki oyuncu ve hazır olma; çift kabul tek maç üretir |
| 6 | REST oyun motoru | Değişmez 10 soru, tek cevap, 0/1/2 parça, timeout ve reveal devam; eşzamanlı testler geçer |
| 7 | Koleksiyon, XP ve final | İlk tamamlanma ve ödül tek kez; geçmiş ve sonuç tutarlı; 20 üst sınırı korunur |
| 8 | Canlı senkronizasyon | Outbox, yetkili olaylar, sequence, snapshot ve restart recovery; bağlantı kopması sonrası doğru durum |
| 9 | Ekran entegrasyonu | İki tarayıcıda seçimden sonuca tam akış; loading, hata, klavye ve dar ekran davranışları |
| 10 | Teslim ve kurum entegrasyonu | E2E/güvenlik testleri, kurulum yönergesi, demo, açık üretim bağımlılıkları; gerçek API'ler sağlanınca adapter entegrasyonu |

Testler her fazda ilgili özelliklerle birlikte yapılır. Ödül ve outbox altyapısının veri modeli Faz 1'de tanımlanır; sonraki fazlarda mevcut modeli bozacak şekilde sonradan düşünülmez. Frontend kabuğu erken kurulur, tam entegrasyon backend akışları doğrulandıkça yapılır. Takvim; geliştirici kapasitesi, repo ve kurum API'leri bilinmeden kesinleştirilmez.

## 7. Karar bekleyen konular

| Karar | Planlama önerisi / ihtiyaç |
|---|---|
| İlk teslim hedefi | Önce yerelde iki hesapla çalışan demo; üretim entegrasyonu ayrı kabul adımı. Kullanıcı tercihi gerekli. |
| İlk içerik kapsamı | 8. sınıf matematik pilotu; 5–8 genişleme. Desteklenmeyen dersleri oynanabilir göstermeme. |
| Soru süresi | Konfigüre edilebilir; 60 saniye yalnız belgelerdeki örnek, onaylı değil. |
| Reveal geçişi | İki tarafın devam onayı + sunucu deadline'ı; süre açık. |
| Kopma ve terk | Reconnect süresi, timer'ın durması, kalıcı terk ve kısmi ödül birlikte karara bağlanmalı. |
| Koleksiyon | İki oyuncuya ortak kazanım sayısı kadar eksik parça; 20'de durma önerisi, kesin değil. |
| XP | 20 bitirme + 5/kişisel doğru + 30 ilk koleksiyon tamamlama yalnız öneri. Görseldeki +70 referans alınmaz. |
| Aktif maç limiti | Öğrenci başına bir aktif maç; davet çakışmaları ve çoklu sekme politikası tanımlanacak. |
| Rozet | İlk MVP dışında veya mevcut ödül servisi adapter'ı; ayrıca onaylanmalı. |
| Üretim entegrasyonu | Auth, grup, soru ve frontend bileşen sözleşmeleri sağlanmalı; endpoint uydurulmaz. |
| Veri ve kapasite | Kurumsal saklama politikası ve hedef eşzamanlı maç sayısı gerekli. |

## 8. Sonraki somut çalışma

Önce Faz 0: 01–14 belgeleri ile 15 numaralı rehber arasındaki farklılıkları karar kaydında birleştirmek. Ardından Faz 1: tek veri modeli ve API/WS sözleşmeleri. Bu plan, uygulama geliştirmesinin tamamlandığı veya ürün önerilerinin onaylandığı anlamına gelmez.
