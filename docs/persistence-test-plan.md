# Persistence test planı

Bu adımın kapsamı veritabanı ve ORM'dir. Kimlik, Butik üyeliği, durum geçişleri, gerçek süre yönetimi ve ödül hesaplama servisleri kapsam dışındadır; bunların testleri sonraki adımlarda yazılacaktır.

| Kabul ölçütü | Test |
|---|---|
| Migration'lar uygulanır; Hibernate bütün entity kolonlarını validate eder | InfrastructureIntegrationTest |
| Local gerçek Swagger ve health PostgreSQL bağlıyken yanıt verir | InfrastructureIntegrationTest |
| UUID, auditing, enum, JSON alanları ve repository sorguları çalışır | jpaPersistsAndQueriesCatalogWithJsonAndEnums |
| Üçüncü slot ve yanlış sınıfa ait konu reddedilir | enforcesRoomCapacityMembershipAndGrade |
| Aynı kodla iki aktif oda; aynı oyuncuya iki aktif oda rezervasyonu olmaz | enforcesRoomCodeAndActiveReservationUniqueness |
| Oda sahibi üyelik transaction'ı olmadan commit edilemez; tur 11 olamaz | requiresOwnerMembershipAtTransactionBoundaryAndRejectsEleventhRound |
| Katılımcı olmayan yanıt veremez; oyuncu/tur tekilliği ve timeout şekli korunur | enforcesAnswerUniquenessMembershipAndTimeoutShape |
| Eksik/tekrarlı parça sırası reddedilir; soru snapshot'ı değişmez | enforcesPuzzlePermutationAndImmutableQuestionSnapshot |
| Bir cevap en fazla bir parça üretir; parça 21 olamaz | enforcesSinglePiecePerAnswerAndTwentyPieceLimit |
| Koleksiyon/XP/outbox tekilliği; XP update/delete yasağı | enforcesCollectionXpAndOutboxDeduplication |
| Maç ile kaynak odanın puzzle'ı aynıdır | sessionPuzzleMustMatchItsSourceRoom |
| Eşzamanlı aynı oyuncu/tur insert'leri tek kayıt üretir | concurrentDuplicateAnswersProduceExactlyOneRow |

Son test iki ayrı JDBC bağlantısını aynı anda çalıştırır; sonuç bir başarı ve bir unique ihlalidir. Oyun motorunun iki farklı doğru cevabı tek turda doğru değerlendirmesi henüz test edilmiş değildir.

## Tekrar çalıştırma

JDK 21 ve Docker ile `backend` klasöründe `mvnw.cmd verify`. Docker yoksa README'deki KESIF_TEST_JDBC_URL / KESIF_TEST_DB_USER / KESIF_TEST_DB_PASSWORD ile ayrı `_test` PostgreSQL'i kullanın. Veritabanı erişimi açıkça sağlanmışsa bağlantı hatası testleri atlatmaz, build'i başarısız yapar.

Testlerin çoğu transaction rollback ile temizlenir. Eşzamanlılık testi commit gerektirdiği için yalnız kendi UUID'lerine ait kayıtları ters FK sırasında temizler; global TRUNCATE veya DROP kullanılmaz. XP ledger test kayıtları da rollback ile kaldırılır.

Migration'lar DB'de kalır; tekrar çalıştırmada Flyway checksum ve up-to-date kontrolü yapılır. Uygulanan migration değiştirilmez; ek kural yeni migration ile gelir.
