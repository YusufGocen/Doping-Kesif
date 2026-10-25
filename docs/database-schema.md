# PostgreSQL veri sözlüğü — uygulanan şema

V9 güncellemesi: toplam 18 domain tablosu korunur. kesif_session.rewards_finalized_at TIMESTAMPTZ NULL; doluysa status=COMPLETED olmalıdır. kesif_session_player.collection_added_count SMALLINT NOT NULL DEFAULT 0, aralık 0–20. Geçmiş için completed session(ended_at DESC,id DESC) kısmi indeksi ve session_player(player_id,session_id) indeksi eklendi. rules_snapshot.rewards sürümlü XP/eşleme politikasını taşır. Ayrıntı: [ödül sözleşmesi](progress-and-rewards-api.md). Aşağıdaki V2–V8 envanteri bu eklerle birlikte okunur.

Tarih: 21 Ekim 2026. Kaynak: Flyway V2–V8; V1 değişmedi. Şema: kesif. 18 domain tablosu; opsiyonel Butik üyelik cache'i yok. Yerel soru tabloları gerçek kurum soru bankasının otoritesi değildir. V8, kesif_round(reveal_deadline_at,session_id) için status=REVEAL kısmi indeksi ekler; kolonlar değişmez. Oyun rules_snapshot alanı artık süreleri de taşır; ayrıntı [game-api.md](game-api.md).

V7 ek alanları, kesif_room:

| Kolon | Tip / null / default | Kural |
|---|---|---|
| creation_request_id | UUID NOT NULL DEFAULT gen_random_uuid() | UNIQUE(owner_player_id,creation_request_id); HTTP istemcisinin retry anahtarı. Eski satırlar otomatik UUID alır. JPA'da updatable=false. |
| event_sequence | BIGINT NOT NULL DEFAULT 0 CHECK >=0 | Oda kilidi altında artan outbox olay sırası |

V7 ek indeksi: kesif_room_player(player_id,active). Düz oda kodu saklanmaz; code_digest HMAC değeridir. Lobinin rules_snapshot alanı bu adımda yalnız lobi policy sürümü, 10 soru/20 parça ve lobi TTL bilgisini taşır; onaylanmamış XP/soru süresi varsayılmaz.

V6 ek kısıtları: room üzerinde UNIQUE(id,puzzle_id), session üzerinde FOREIGN KEY(room_id,puzzle_id) → room(id,puzzle_id). Maç odadan farklı puzzle kullanamaz. XP ledger UPDATE ve DELETE işlemleri trigger ile reddedilir; düzeltmeler silme/güncelleme yerine ayrıca tasarlanmış muhasebe akışı gerektirir. Mevcut XP event türleri henüz düzeltme/eksi bakiye akışı içermez.

## Ortak alanlar

Her tabloda id UUID PK DEFAULT gen_random_uuid(), created_at ve updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), version BIGINT NOT NULL DEFAULT 0 CHECK >=0 vardır. JPA UUID üretir; CreationTimestamp/UpdateTimestamp ve Version yönetir. Doğrudan SQL güncellemeleri updated_at ve version alanlarını açıkça yönetmelidir; otomatik DB auditing trigger'ı yoktur. FK'ler açık aksi yoksa NO ACTION; toplu silme/cascade yoktur.

## Birleştirilen kararlar

- Davet ve kod aynı kesif_room lobisini kullanır. Davet odaya; maç tekil room_id ile odaya bağlıdır. Karşılıklı invitation/session FK döngüsü yoktur.
- room_player ile session_player farklıdır: ilki oyun başlamadan kalıcı lobi üyeliği, ikincisi maçın değişmez katılımcısıdır. Oda ve maç başına slot 1/2 + unique sayesinde en fazla iki kişi. Başlatma servisinde tam iki hazır oyuncu ve tam 10 tur kontrolü ayrıca gerekir.
- Oda sahibi üyelik FK'si commit'e ertelenir: oda ve sahibi aynı transaction'da yazılır. Oyuncu başına aktif oda ve maç unique rezervasyonları vardır; terminal işlemler bunları aynı transaction'da serbest bırakmalıdır.
- topic_id null, seçilen sınıf/dersin tüm konuları demektir. Doluysa composite FK sınıf/ders uyumunu korur. Sınıf için içerik bulunması ve yayın uygunluğu servis kontrolüdür.
- Tek durum sözleşmesi: Session COMPLETED, Round QUESTION_OPEN/REVEAL/COMPLETED. TIMEOUT bir cevap kaynağıdır.
- Snapshot ile doğru cevap ayrı alanlardır. Round içerik alanları DB trigger'ı ile değiştirilemez. Entity'ler API'den dönülmez.
- Cevap ve parça kayıtları composite FK ile aynı maç/tur/oyuncuya bağlıdır. Bir cevap en fazla bir parça üretir; cevap doğruluğu servis tarafından ayrıca kontrol edilir.
- Kişisel koleksiyon ile maç indeksleri farklıdır. Eşleme politikası henüz ürün onayında. Koleksiyon parçası kaynak maçıyla aynı puzzle'a ait olmalıdır.
- XP miktarları hardcode edilmedi. İlk koleksiyon tamamlama dedupe anahtarı koleksiyon kimliğini kapsamalı; farklı maçlarda tekrar ödül verilmemeli.
- Butik üyeliği, kod deneme limiti, token güvenliği ve durum geçişleri migration ile tamamlanmış sayılmaz; servis aşamasında uygulanacaktır.
- Soru başına en fazla bir doğru seçenek DB'de korunur; yayın sırasında tam bir doğru ve yeterli seçenek kontrolü serviste uygulanacaktır.

## kesif_player_profile

Asgari kurum oyuncu referansı. Migration: V2. JPA: player.PlayerProfile.

| Kolon | PostgreSQL tipi, null/default/kısıt | Açıklama |
|---|---|---|
| external_user_id | varchar(128) NOT NULL UNIQUE | Kurum kimliği; JWT eşlemesinin referansı |
| display_name | varchar(100) | İsteğe bağlı gösterim adı |

Tablo kısıtları:

- Alan düzeyindeki kısıtlar ve ortak PK.

Ek indeksler:

- PK/UNIQUE indeksleri dışında ek indeks yok.

## kesif_subject

Ders kataloğu. Migration: V2. JPA: catalog.Subject.

| Kolon | PostgreSQL tipi, null/default/kısıt | Açıklama |
|---|---|---|
| code | varchar(32) NOT NULL UNIQUE | Sabit ders kodu |
| name | varchar(100) NOT NULL | Görünen ad |
| active | boolean NOT NULL DEFAULT true | Seçilebilirlik |

Tablo kısıtları:

- Alan düzeyindeki kısıtlar ve ortak PK.

Ek indeksler:

- PK/UNIQUE indeksleri dışında ek indeks yok.

## kesif_topic

Sınıf ve derse bağlı konu. Migration: V2. JPA: catalog.Topic.

| Kolon | PostgreSQL tipi, null/default/kısıt | Açıklama |
|---|---|---|
| subject_id | uuid NOT NULL REFERENCES kesif.kesif_subject(id) | Ders |
| grade_level | smallint NOT NULL CHECK (grade_level BETWEEN 5 AND 8) | Sınıf |
| code | varchar(64) NOT NULL | Konu kodu |
| name | varchar(150) NOT NULL | Görünen ad |
| active | boolean NOT NULL DEFAULT true | Seçilebilirlik |

Tablo kısıtları:

- `UNIQUE (subject_id, grade_level, code)`
- `UNIQUE (id, subject_id, grade_level)`

Ek indeksler:

- PK/UNIQUE indeksleri dışında ek indeks yok.

## kesif_question

Yerel soru veya soru bankası cache kaynağı. Migration: V2. JPA: catalog.Question.

| Kolon | PostgreSQL tipi, null/default/kısıt | Açıklama |
|---|---|---|
| topic_id | uuid NOT NULL REFERENCES kesif.kesif_topic(id) | Konu |
| external_question_id | varchar(128) | Harici soru referansı |
| body | jsonb NOT NULL CHECK (jsonb_typeof(body) = 'object') | Sürümü belli soru metni/medya |
| difficulty_tag | varchar(32) | İç seçim etiketi; UI zorluk seçimi yok |
| content_version | integer NOT NULL CHECK (content_version > 0) | İçerik sürümü |
| status | varchar(24) NOT NULL CHECK (status IN ('DRAFT','PUBLISHED','ARCHIVED')) | Yayın durumu |

Tablo kısıtları:

- Alan düzeyindeki kısıtlar ve ortak PK.

Ek indeksler:

- `CREATE INDEX ix_question_topic_status ON kesif.kesif_question(topic_id, status);`

## kesif_question_option

Sorunun seçenekleri; istemciye entity gönderilmez. Migration: V2. JPA: catalog.QuestionOption.

| Kolon | PostgreSQL tipi, null/default/kısıt | Açıklama |
|---|---|---|
| question_id | uuid NOT NULL REFERENCES kesif.kesif_question(id) | Soru |
| option_key | varchar(8) NOT NULL | Snapshot'a taşınacak kararlı anahtar |
| body | jsonb NOT NULL CHECK (jsonb_typeof(body) = 'object') | Seçenek içeriği |
| correct | boolean NOT NULL | Gizli doğru cevaptır bilgisi |

Tablo kısıtları:

- `UNIQUE (question_id, option_key)`

Ek indeksler:

- `CREATE UNIQUE INDEX uq_question_correct_option ON kesif.kesif_question_option(question_id) WHERE correct;`

## kesif_puzzle

20 parçalık puzzle kataloğu. Migration: V2. JPA: puzzle.Puzzle.

| Kolon | PostgreSQL tipi, null/default/kısıt | Açıklama |
|---|---|---|
| code | varchar(64) NOT NULL UNIQUE | Puzzle kodu |
| title | varchar(120) NOT NULL | Başlık |
| asset_key | varchar(255) NOT NULL | Görsel dosya/CDN referansı |
| piece_count | smallint NOT NULL DEFAULT 20 CHECK (piece_count = 20) | Sabit parça sayısı |
| active | boolean NOT NULL DEFAULT true | Seçilebilirlik |

Tablo kısıtları:

- Alan düzeyindeki kısıtlar ve ortak PK.

Ek indeksler:

- PK/UNIQUE indeksleri dışında ek indeks yok.

## kesif_room

Davet ve kod yollarının ortak lobisi. Migration: V3. JPA: room.KesifRoom.

| Kolon | PostgreSQL tipi, null/default/kısıt | Açıklama |
|---|---|---|
| owner_player_id | uuid NOT NULL REFERENCES kesif.kesif_player_profile(id) | Oda sahibi |
| group_external_id | varchar(128) NOT NULL | Butik grup referansı |
| join_method | varchar(24) NOT NULL CHECK (join_method IN ('INVITATION','CODE')) | Katılım yolu |
| code_digest | varchar(128) | Kodun güvenli doğrulama değeri; düz kod saklanmaz |
| puzzle_id | uuid NOT NULL REFERENCES kesif.kesif_puzzle(id) | Puzzle |
| subject_id | uuid NOT NULL REFERENCES kesif.kesif_subject(id) | Ders |
| grade_level | smallint NOT NULL CHECK (grade_level BETWEEN 5 AND 8) | Sınıf |
| topic_id | uuid | Null ise tüm uygun konular |
| rules_snapshot | jsonb NOT NULL CHECK (jsonb_typeof(rules_snapshot) = 'object') | Süreler ve ödül kuralları; ürün onayı olmadan varsayılan yok |
| status | varchar(24) NOT NULL CHECK (status IN ('OPEN','FULL','STARTED','CLOSED','CANCELLED','EXPIRED')) | Oda durumu |
| expires_at | timestamptz NOT NULL | Katılım süresi |

Tablo kısıtları:

- `FOREIGN KEY (topic_id, subject_id, grade_level) REFERENCES kesif.kesif_topic(id, subject_id, grade_level)`
- `CHECK ((join_method = 'CODE' AND code_digest IS NOT NULL) OR (join_method = 'INVITATION' AND code_digest IS NULL))`
- `CHECK (expires_at > created_at)`

Ek indeksler:

- `CREATE UNIQUE INDEX uq_active_room_code ON kesif.kesif_room(code_digest) WHERE code_digest IS NOT NULL AND status IN ('OPEN','FULL');`
- `CREATE INDEX ix_room_status_expiry ON kesif.kesif_room(status, expires_at);`

## kesif_room_player

İki kişilik kalıcı lobi üyeliği. Migration: V3. JPA: room.RoomPlayer.

| Kolon | PostgreSQL tipi, null/default/kısıt | Açıklama |
|---|---|---|
| room_id | uuid NOT NULL REFERENCES kesif.kesif_room(id) | Oda |
| player_id | uuid NOT NULL REFERENCES kesif.kesif_player_profile(id) | Oyuncu |
| slot | smallint NOT NULL CHECK (slot IN (1,2)) | İki oyuncu sınırı |
| ready | boolean NOT NULL DEFAULT false | Lobi hazırlığı |
| active | boolean NOT NULL DEFAULT true | Terminal duruma kadar rezervasyon |
| last_seen_at | timestamptz | Son bağlantı işareti |

Tablo kısıtları:

- `UNIQUE (room_id, player_id)`
- `UNIQUE (room_id, slot)`

Ek indeksler:

- `CREATE UNIQUE INDEX uq_player_active_room ON kesif.kesif_room_player(player_id) WHERE active;`

## kesif_invitation

Belirli öğrenciye oda daveti. Migration: V3. JPA: invitation.Invitation.

| Kolon | PostgreSQL tipi, null/default/kısıt | Açıklama |
|---|---|---|
| room_id | uuid NOT NULL REFERENCES kesif.kesif_room(id) | Davetin odası ve ayarları |
| inviter_id | uuid NOT NULL REFERENCES kesif.kesif_player_profile(id) | Gönderen |
| invitee_id | uuid NOT NULL REFERENCES kesif.kesif_player_profile(id) | Davet edilen |
| status | varchar(24) NOT NULL CHECK (status IN ('PENDING','ACCEPTED','REJECTED','CANCELLED','EXPIRED')) | Davet durumu |
| expires_at | timestamptz NOT NULL | Son kabul zamanı |
| responded_at | timestamptz | Yanıt zamanı |

Tablo kısıtları:

- `CHECK (inviter_id <> invitee_id)`
- `FOREIGN KEY (room_id, inviter_id) REFERENCES kesif.kesif_room_player(room_id, player_id)`
- `CHECK (expires_at > created_at)`

Ek indeksler:

- `CREATE UNIQUE INDEX uq_room_pending_invitation ON kesif.kesif_invitation(room_id) WHERE status = 'PENDING';`
- `CREATE UNIQUE INDEX uq_room_accepted_invitation ON kesif.kesif_invitation(room_id) WHERE status = 'ACCEPTED';`
- `CREATE INDEX ix_invitation_incoming ON kesif.kesif_invitation(invitee_id, status, expires_at);`

## kesif_session

Ortak 10 turluk oyun. Migration: V3. JPA: game.GameSession.

| Kolon | PostgreSQL tipi, null/default/kısıt | Açıklama |
|---|---|---|
| room_id | uuid NOT NULL UNIQUE REFERENCES kesif.kesif_room(id) | Tek odadan tek maç; davet zorunlu değil |
| puzzle_id | uuid NOT NULL REFERENCES kesif.kesif_puzzle(id) | Sonuç/kolleksiyon puzzle referansı |
| rules_snapshot | jsonb NOT NULL CHECK (jsonb_typeof(rules_snapshot) = 'object') | Başlangıçta sabitlenen kurallar |
| status | varchar(24) NOT NULL CHECK (status IN ('READY','IN_PROGRESS','COMPLETED','CANCELLED','ABANDONED')) | Maç durumu |
| current_round_no | smallint NOT NULL DEFAULT 0 CHECK (current_round_no BETWEEN 0 AND 10) | Aktif soru |
| revealed_count | smallint NOT NULL DEFAULT 0 CHECK (revealed_count BETWEEN 0 AND 20) | Ortak açılım |
| piece_order | jsonb NOT NULL CHECK (kesif.valid_piece_order(piece_order)) | 1–20 tam permütasyon |
| event_sequence | bigint NOT NULL DEFAULT 0 CHECK (event_sequence >= 0) | Kalıcı olay sırası |
| started_at | timestamptz | Başlama |
| ended_at | timestamptz | Bitiş |

Tablo kısıtları:

- `UNIQUE (id, room_id)`
- `UNIQUE (id, puzzle_id)`
- `CHECK (ended_at IS NULL OR (started_at IS NOT NULL AND ended_at >= started_at))`

Ek indeksler:

- `CREATE INDEX ix_session_status_started ON kesif.kesif_session(status, started_at);`

## kesif_session_player

Maç katılımcısı ve reveal ilerleme bilgisi. Migration: V3. JPA: game.SessionPlayer.

| Kolon | PostgreSQL tipi, null/default/kısıt | Açıklama |
|---|---|---|
| session_id | uuid NOT NULL | Maç |
| room_id | uuid NOT NULL | Doğrulanan kaynak oda |
| player_id | uuid NOT NULL REFERENCES kesif.kesif_player_profile(id) | Oyuncu |
| slot | smallint NOT NULL CHECK (slot IN (1,2)) | Oyuncu yeri |
| correct_count | smallint NOT NULL DEFAULT 0 CHECK (correct_count BETWEEN 0 AND 10) | Kişisel doğru sayısı |
| continue_round_no | smallint NOT NULL DEFAULT 0 CHECK (continue_round_no BETWEEN 0 AND 10) | Son devam onayı turu |
| active | boolean NOT NULL DEFAULT true | Tek aktif maç rezervasyonu |

Tablo kısıtları:

- `UNIQUE (session_id, player_id)`
- `UNIQUE (session_id, slot)`
- `FOREIGN KEY (session_id, room_id) REFERENCES kesif.kesif_session(id, room_id)`
- `FOREIGN KEY (room_id, player_id) REFERENCES kesif.kesif_room_player(room_id, player_id)`

Ek indeksler:

- `CREATE UNIQUE INDEX uq_player_active_session ON kesif.kesif_session_player(player_id) WHERE active;`

## kesif_round

Değişmez soru snapshot'ı ve zamanlar. Migration: V4. JPA: game.GameRound.

| Kolon | PostgreSQL tipi, null/default/kısıt | Açıklama |
|---|---|---|
| session_id | uuid NOT NULL REFERENCES kesif.kesif_session(id) | Maç |
| round_no | smallint NOT NULL CHECK (round_no BETWEEN 1 AND 10) | Tur sırası |
| question_reference | varchar(128) NOT NULL | Yerel veya harici kaynak kimliği |
| question_snapshot | jsonb NOT NULL CHECK (jsonb_typeof(question_snapshot) = 'object') | Soru, medya, seçenek sırası ve içerik sürümü; doğru şık hariç |
| correct_option_key | varchar(8) NOT NULL | Yalnız sunucuda tutulan anahtar |
| status | varchar(24) NOT NULL CHECK (status IN ('PENDING','QUESTION_OPEN','REVEAL','COMPLETED')) | Tek tur durum sözleşmesi |
| opened_at | timestamptz | Açılma |
| deadline_at | timestamptz | Cevap süresi |
| resolved_at | timestamptz | Değerlendirme |
| reveal_deadline_at | timestamptz | Sonraki tura sunucu geçiş sınırı |

Tablo kısıtları:

- `UNIQUE (session_id, round_no)`
- `UNIQUE (id, session_id)`
- `UNIQUE (session_id, question_reference)`
- `CHECK (deadline_at IS NULL OR (opened_at IS NOT NULL AND deadline_at > opened_at))`

Ek indeksler:

- `CREATE INDEX ix_round_deadline ON kesif.kesif_round(deadline_at) WHERE status = 'QUESTION_OPEN';`

## kesif_round_answer

Tek oyuncu/tur yanıtı. Migration: V4. JPA: game.RoundAnswer.

| Kolon | PostgreSQL tipi, null/default/kısıt | Açıklama |
|---|---|---|
| session_id | uuid NOT NULL | Üyelik doğrulama referansı |
| round_id | uuid NOT NULL | Tur |
| player_id | uuid NOT NULL | Cevap sahibi |
| option_key | varchar(8) | Timeout için null |
| correct | boolean NOT NULL | Sunucu değerlendirmesi |
| source | varchar(24) NOT NULL CHECK (source IN ('SUBMITTED','TIMEOUT')) | Timeout ayrı tur durumu değildir |
| client_request_id | uuid | İdempotency kimliği |
| answered_at | timestamptz NOT NULL | Sunucunun kabul zamanı |

Tablo kısıtları:

- `UNIQUE (round_id, player_id)`
- `FOREIGN KEY (round_id, session_id) REFERENCES kesif.kesif_round(id, session_id)`
- `FOREIGN KEY (session_id, player_id) REFERENCES kesif.kesif_session_player(session_id, player_id)`
- `CHECK ((source = 'SUBMITTED' AND option_key IS NOT NULL AND client_request_id IS NOT NULL) OR (source = 'TIMEOUT' AND option_key IS NULL AND client_request_id IS NULL AND NOT correct))`

Ek indeksler:

- `CREATE UNIQUE INDEX uq_answer_request ON kesif.kesif_round_answer(player_id, client_request_id) WHERE client_request_id IS NOT NULL;`

## kesif_piece_unlock

Maçta doğru cevapla kazanılan parça. Migration: V4. JPA: puzzle.PieceUnlock.

| Kolon | PostgreSQL tipi, null/default/kısıt | Açıklama |
|---|---|---|
| session_id | uuid NOT NULL | Maç |
| round_id | uuid NOT NULL | Tur |
| earned_by_player_id | uuid NOT NULL | Doğru cevap sahibi |
| piece_index | smallint NOT NULL CHECK (piece_index BETWEEN 1 AND 20) | Ortak parça indeksi |

Tablo kısıtları:

- `UNIQUE (session_id, piece_index)`
- `UNIQUE (round_id, earned_by_player_id)`
- `FOREIGN KEY (round_id, session_id) REFERENCES kesif.kesif_round(id, session_id)`
- `FOREIGN KEY (round_id, earned_by_player_id) REFERENCES kesif.kesif_round_answer(round_id, player_id)`

Ek indeksler:

- PK/UNIQUE indeksleri dışında ek indeks yok.

## kesif_player_collection

Kalıcı kişisel puzzle ilerlemesi. Migration: V5. JPA: collection.PlayerCollection.

| Kolon | PostgreSQL tipi, null/default/kısıt | Açıklama |
|---|---|---|
| player_id | uuid NOT NULL REFERENCES kesif.kesif_player_profile(id) | Oyuncu |
| puzzle_id | uuid NOT NULL REFERENCES kesif.kesif_puzzle(id) | Puzzle |
| unlocked_count | smallint NOT NULL DEFAULT 0 CHECK (unlocked_count BETWEEN 0 AND 20) | Türetilmiş parça sayacı |
| completed_at | timestamptz | İlk tamamlanma |

Tablo kısıtları:

- `UNIQUE (player_id, puzzle_id)`
- `UNIQUE (id, puzzle_id)`
- `CHECK ((unlocked_count = 20) = (completed_at IS NOT NULL))`

Ek indeksler:

- PK/UNIQUE indeksleri dışında ek indeks yok.

## kesif_collection_piece

Tekil kalıcı parça kazanımı. Migration: V5. JPA: collection.CollectionPiece.

| Kolon | PostgreSQL tipi, null/default/kısıt | Açıklama |
|---|---|---|
| collection_id | uuid NOT NULL | Koleksiyon |
| puzzle_id | uuid NOT NULL | Kaynak puzzle uyum kontrolü |
| piece_index | smallint NOT NULL CHECK (piece_index BETWEEN 1 AND 20) | Kişisel parça indeksi |
| source_session_id | uuid NOT NULL | Kaynak maç |

Tablo kısıtları:

- `UNIQUE (collection_id, piece_index)`
- `FOREIGN KEY (collection_id, puzzle_id) REFERENCES kesif.kesif_player_collection(id, puzzle_id)`
- `FOREIGN KEY (source_session_id, puzzle_id) REFERENCES kesif.kesif_session(id, puzzle_id)`

Ek indeksler:

- PK/UNIQUE indeksleri dışında ek indeks yok.

## kesif_xp_ledger

Tekilleştirilen XP hareketi. Migration: V5. JPA: reward.XpLedgerEntry.

| Kolon | PostgreSQL tipi, null/default/kısıt | Açıklama |
|---|---|---|
| player_id | uuid NOT NULL REFERENCES kesif.kesif_player_profile(id) | Öğrenci |
| session_id | uuid NOT NULL | Kaynak maç |
| event_type | varchar(40) NOT NULL CHECK (event_type IN ('SESSION_COMPLETED','CORRECT_ANSWER','COLLECTION_COMPLETED')) | Ödül türü |
| amount | integer NOT NULL CHECK (amount > 0) | Onaylı kurala göre miktar |
| dedupe_key | varchar(200) NOT NULL UNIQUE | Koleksiyon tamamlama için maçtan bağımsız anahtar |

Tablo kısıtları:

- `FOREIGN KEY (session_id, player_id) REFERENCES kesif.kesif_session_player(session_id, player_id)`

Ek indeksler:

- `CREATE INDEX ix_xp_player_created ON kesif.kesif_xp_ledger(player_id, created_at);`

## kesif_outbox_event

Transaction ile kalıcı olay kaydı. Migration: V5. JPA: outbox.OutboxEvent.

| Kolon | PostgreSQL tipi, null/default/kısıt | Açıklama |
|---|---|---|
| aggregate_type | varchar(40) NOT NULL | ROOM veya SESSION |
| aggregate_id | uuid NOT NULL | İlgili aggregate |
| event_type | varchar(80) NOT NULL | Olay adı |
| sequence_number | bigint NOT NULL CHECK (sequence_number > 0) | Aggregate olay sırası |
| payload | jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object') | Olay gövdesi; token/kod içermez |
| published_at | timestamptz | Başarılı yayın zamanı |
| attempts | integer NOT NULL DEFAULT 0 CHECK (attempts >= 0) | Deneme sayısı |
| available_at | timestamptz NOT NULL DEFAULT now() | Bir sonraki yayın zamanı |

Tablo kısıtları:

- `UNIQUE (aggregate_type, aggregate_id, sequence_number)`

Ek indeksler:

- `CREATE INDEX ix_outbox_pending ON kesif.kesif_outbox_event(available_at, created_at) WHERE published_at IS NULL;`

## Transaction ve migration uygulaması

Eski migration değiştirilmez. Yeni migration'lar: V2 katalog/profil, V3 oda/davet/maç, V4 tur/cevap/parça, V5 koleksiyon/XP/outbox, V6 ek bütünlük kısıtları, V7 oda retry kimliği ve olay sırası. Şema rollback'i otomatik DROP değildir: yedek + ileri düzeltme migration'ı kullanılır; ortam geri dönüşü release öncesi ayrıca denenir. Canlı veri taşıma gerekmeyen ilk kurulum hedeflenir.

Lobi rezervasyon işlemleri profil FOR NO KEY UPDATE → tek oda FOR UPDATE sırasını kullanır; önceden cache'lenmiş oda/davet kilit altında refresh edilir. Oyun işlemlerinin alt kilit sırası ileride session → round → collections (player UUID sırası) olarak sabitlenmelidir. Dış servis HTTP çağrıları uzun DB kilidi içinde tutulmamalı; gerçek adapter sağlandığında doğrulama bağlamı ayrıca tasarlanmalıdır. Lobi davranışları uygulanmıştır; oyun/ödül modelleri hâlâ servis uygulaması bekler.

