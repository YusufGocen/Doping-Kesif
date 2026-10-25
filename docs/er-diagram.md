# Uygulanan ER modeli

18 domain tablosu. Tam kolon sözlüğü: [database-schema.md](database-schema.md). Referans ZIP'teki eski diyagram güncel şema değildir.

```mermaid
erDiagram
    kesif_player_profile ||--o{ kesif_room : owns
    kesif_room ||--|{ kesif_room_player : reserves
    kesif_player_profile ||--o{ kesif_room_player : joins
    kesif_room ||--o{ kesif_invitation : invites
    kesif_room ||--o| kesif_session : starts
    kesif_subject ||--o{ kesif_topic : contains
    kesif_topic ||--o{ kesif_question : categorizes
    kesif_question ||--o{ kesif_question_option : offers
    kesif_subject ||--o{ kesif_room : configures
    kesif_puzzle ||--o{ kesif_room : selects
    kesif_puzzle ||--o{ kesif_session : snapshots
    kesif_session ||--|{ kesif_session_player : includes
    kesif_player_profile ||--o{ kesif_session_player : plays
    kesif_session ||--|{ kesif_round : contains
    kesif_round ||--o{ kesif_round_answer : receives
    kesif_session_player ||--o{ kesif_round_answer : answers
    kesif_round_answer ||--o| kesif_piece_unlock : earns
    kesif_player_profile ||--o{ kesif_player_collection : owns
    kesif_puzzle ||--o{ kesif_player_collection : collects
    kesif_player_collection ||--o{ kesif_collection_piece : contains
    kesif_session ||--o{ kesif_collection_piece : grants
    kesif_session_player ||--o{ kesif_xp_ledger : earns
```

Outbox aggregate_type/aggregate_id alanları farklı aggregate türlerine referans verdiği için polymorphic referanstır; tek bir fiziksel FK yoktur. Olayı yazan servis transaction içinde doğru aggregate'ı doğrulamalıdır.

Room/Session başına **en fazla iki** oyuncu DB slot ve UNIQUE kısıtlarıyla korunur. **Tam iki hazır oyuncu**, **tam 10 soru**, doğru cevabın parça üretmesi ve geçerli durum geçişleri oyun servisinin transaction invariant'larıdır; bunlar henüz uygulanmadı. Tur numarasının 1–10 olması tek başına 10 satır bulunduğunu garanti etmez.

Oda sahibinin odada üye olması commit'e ertelenen FK ile korunur. Oda ile owner üyelik satırı tek transaction'da oluşturulmalıdır. Davet doğrudan odaya bağlıdır; maç için zorunlu davet veya karşılıklı session/invitation FK yoktur. Davet ve kodla gelen öğrenciler aynı oda/maç akışına bağlanır.

Entity'ler ilişkileri UUID referansları olarak tutar; ORM cascade ve otomatik entity graph yüklemesi yoktur. İlişkisel tutarlılık PostgreSQL FK'leriyle, erişim ve iş kuralları servislerle sağlanır. Entity'ler API yanıtı olarak serialize edilmeyecektir.
