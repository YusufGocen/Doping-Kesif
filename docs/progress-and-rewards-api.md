# Kalıcı koleksiyon, XP ve oyun geçmişi

Base path: `/api/v1/kesif`. Tüm endpoint'ler STUDENT Bearer JWT ister. Kullanıcı kimliği token sub'dan çözülür; request ile başka öğrenci seçilmez.

| GET adresi | Sonuç |
|---|---|
| /collections?filter=ALL&page=0&size=20 | Aktif puzzle'lar ve öğrencinin sahip olduğu arşiv puzzle'ları; parça sayısı ve tamamlanma zamanı. |
| /collections?filter=IN_PROGRESS | 1–19 parça açılmış kişisel koleksiyonlar. Sıfır parçalı olanlar dahil değildir. |
| /collections?filter=COMPLETED | 20/20 koleksiyonlar. |
| /collections/{puzzleId} | Puzzle metadata, kişisel parça sayısı ve açılmış parça indeksleri. |
| /progress | Kişisel totalXp, tamamlanan oyun sayısı ve toplam doğru cevap. |
| /history?page=0&size=20 | Yalnız kendi tamamlanan oyunları; kişisel doğru, kazanılan XP, o oyunda eklenen yeni koleksiyon parçası ve ortak açılan parça sayısı. |
| /sessions/{id}/result | Yalnız iki katılımcıya final sonucu; her oyuncunun doğru, yeni koleksiyon parçası ve o oyundan XP miktarı. |

Sayfalı yanıt `{items,page,size,total}` biçimindedir. page 0–10000, size 1–100; geçersiz enum/sayı/UUID 400. Geçmiş sıralaması endedAt DESC, id DESC; koleksiyon sırası başlık/id. Devam eden oyunun result isteği 409 GAME_NOT_COMPLETED; başkasının veya olmayan oturum 404 RESULT_NOT_FOUND. Girişsiz 401, yetersiz rol 403. GET çağrıları ödül üretmez; ilk erişimde profil yoksa trusted sub için oluşturulabilir. Çok sorgulu okuma işlemleri repeatable-read transaction kullanır.

## Yerel demo politikası — ürün onayı değildir

| Ayar | Local örnek |
|---|---|
| KESIF_REWARDS_ENABLED | true |
| KESIF_COMPLETION_XP | 10 |
| KESIF_CORRECT_ANSWER_XP | 2 |
| KESIF_COLLECTION_COMPLETION_XP | 50 |
| KESIF_COLLECTION_MAPPING | SHARED_UNION |

SHARED_UNION: bir oyunda ortak açılan parça indeksleri iki oyuncunun kişisel koleksiyonuna da eklenir. Aynı puzzle'ın sonraki oyunları mevcut parçalarla birleşir; aynı indeks tekrar eklenmez. Her yeni oyun içindeki ortak puzzle yine sıfırdan başlar. Bu iki ilerleme birbirinden ayrıdır.

XP formülü: tamamlama XP + kendi doğru sayısı × doğru başına XP + bu işlemde koleksiyon ilk kez 20/20 olduysa tamamlama bonusu. Örnek: 10 doğruyla tam 20 parça açılan ilk oyunda her oyuncu 10 + 10×2 + 50 = 80 XP alır. Aynı tamamlanmış koleksiyonla sonraki oyunda 10 doğru 30 XP getirir; 50 bonus tekrar verilmez. Sıfır doğruyla tamamlanmış oyun demo politikasında 10 XP getirir. Miktarlar 0–10000 aralığında olabilir; 0 değerleri için ledger satırı yazılmaz.

Local dışındaki varsayılan ödüller kapalıdır. Açmak için KESIF_REWARDS_ENABLED=true ile üç XP miktarı ve eşleme açıkça verilmelidir. Local dosyası `local & !prod` ile sınırlandırılır; local/prod karışık profilinde demo varsayımları devreye girmez. Doğru miktarlar, koleksiyon eşlemesi, sıfır doğruda ödül ve olası tekrar/farming sınırları kurum ürün kararı olarak kesinleştirilmelidir.

Politika oyun başında session.rules_snapshot.rewards içine sürümüyle kaydedilir. Başlamış oyunun ödülü sonradan değiştirilmiş environment değerlerinden hesaplanmaz. Ödüller kapalı başlayan veya bu özellikten önce açılmış oyunda rewards snapshot'ı bulunmaz; bunlara yeni politika uydurulmaz. result/history rewardsFinalized=false, XP=0 dönebilir. Eski oyunlara ödül taşıma ayrıca açık politika ve migration/operasyon planı gerektirir.

## Atomiklik ve tekrar koruması

- Onuncu REVEAL tamamlanırken oyun sonu, rezervasyonların bırakılması, koleksiyon, XP, finalization işareti ve outbox tek transaction'dadır. Ödül yazımı hata verirse oyun sonu dahil işlem geri alınır; tekrar denenebilir.
- Kilit sırası oda → kişisel koleksiyonlar. Koleksiyonlar oyuncu UUID sırasıyla kilitlenir; iki oturum aynı koleksiyonları işlese de sıra değişmez. Eksik koleksiyon satırı unique(player,puzzle) üzerinden güvenli upsert ile oluşturulur.
- CollectionPiece UNIQUE(collection,piece) ile birleştirilir; ilk kazandıran source_session_id korunur. unlocked_count gerçek parça sayısıyla güncellenir, 20 olunca completed_at bir kez konur.
- XP, append-only kesif_xp_ledger tablosunda tutulur. Doğru cevap XP'si oyuncu/oturum başına toplam satırdır; her cevaba ayrı satır değildir. session+player+type ve collection-completed için kalıcı dedupe anahtarları kullanılır. DB UPDATE/DELETE koruması korunur.
- session.rewards_finalized_at işlemin tamamlandığını gösterir; ikinci çağrı hiçbir değişiklik yapmaz. SessionPlayer.collection_added_count o oyunun kattığı yeni parça sayısını saklar; sonradan koleksiyon büyümesi geçmiş sonucu değiştirmez.
- REWARDS_FINALIZED olayı session event_sequence ile aynı transaction'da outbox'a eklenir. Publisher henüz yoktur. GAME_COMPLETED tek başına ödül kanıtı sayılmaz; rewardsFinalized/result alanı kontrol edilir.
- Dahili RewardFinalizer.finalizeSession yalnız sunucu servisidir; öğrenciye POST ödül/XP artırma endpoint'i açılmaz. Gerçek Doping puan sistemine aktarım yapılmaz.

V9 iki kolon ve geçmiş indekslerini ekler; yeni domain tablosu eklenmedi, toplam 18 tablo. Uygulanmış migration'lar değiştirilmedi.

## Swagger ile kontrol

1. Local Yusuf/Ayşe token'larıyla oyun başlatıp 10 soruyu tamamlayın; ready/start akışı [game-api.md](game-api.md) içinde.
2. İki token ile aynı `/sessions/{id}/result` sonucunu okuyun.
3. `/collections/{puzzleId}` ve `/progress` kişisel ilerlemeyi göstersin.
4. `/history` içinde oyun, earnedXp ve collectionAddedCount görünsün.
5. Aynı sonuç GET'lerini tekrarlayın; bakiye/parça sayısı artmasın.

Güvenli WebSocket akışı, outbox publisher ve bağlantı sonrası snapshot/event sırasıyla toparlanma [canlı protokolde](realtime-protocol.md) uygulanmıştır. Sıradaki aşama frontend ve istemcinin otomatik reconnect/buffer davranışıdır. Rozetler, gerçek ödül sistemi ve terk/pause/ceza bu kapsamda değildir.
