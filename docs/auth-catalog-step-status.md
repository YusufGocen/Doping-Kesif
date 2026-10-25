# JWT ve katalog adımı — doğrulama

21 Ekim 2026. Maven verify: **BUILD SUCCESS**. Gerçek PostgreSQL 16.14 ile **34 test geçti; 0 hata, 0 başarısız, 0 atlanan**. Önceki 18 test kapsamı korunarak yeni güvenlik/API testleri eklendi.

## Tamamlananlar

- Local RS256 token üretimi ve imza/issuer/audience/exp/nbf/sub doğrulaması.
- Prod ve karışık prod/local profillerinde local key, test token controller ve seed'in yüklenmemesi.
- Eksik veya güvensiz dış JWT konfigürasyonunda kapalı kalma.
- Rol denetimi, izinli frontend origin'leri, stateless güvenlik ve ProblemDetail hata yanıtları.
- /me ve eşzamanlı ilk girişte tekil profil oluşturma.
- Aktif/yayınlanmış içerik ve 10 soru sınırına göre katalog uygunluğu; güvenli DTO'lar.
- Butik gateway arayüzü, local grup fixture'ı ve grup dışı erişimin reddi.
- Yalnız local, tekrar başlatmada çoğalmayan seed; prod migration'ı eklenmedi.
- Gerçek endpoint'lerden OpenAPI snapshot'ı üretildi.

## Test kanıtı

13 AuthCatalogIntegrationTest; 2 ProductionIdentityBoundaryTest; 3 ProductionSecurityTest; 4 SecurityConfigurationTest; 10 DatabaseSchemaIntegrationTest; 1 InfrastructureIntegrationTest; 1 WebInfrastructureSmokeTest.

İmzası bozulmuş, hatalı issuer/audience içeren, süresi dolmuş, gelecekte aktifleşen, exp/audience eksik veya sub geçersiz token'lar reddedildi. STUDENT rolü olmayan imzalı token'lar 403 aldı. Ek JSON alanlarıyla rol yükseltme ve grup ID'siyle başka grubun arkadaşlarını görme girişimleri reddedildi.

Testlerdeki parola çalışma alanında proje dışında kaldı. Token içeren MockMvc çıktısı kapalıydı. Geçici PostgreSQL test sonunda kapatıldı; sistem servisi kurulmadı. Derlenmiş JAR yenilendi.

## Sınırlar ve sonraki iş

Gerçek kurum SSO/JWKS ve Butik servisleri henüz bağlanmadı; kurum claim/sözleşmeleri bilinmiyor. Local dışı Butik istekleri 503 verir. Puzzle görsel referansları yer tutucudur; medya dağıtımı henüz yoktur.

Davet/oda/lobi servisleri, oyun motoru, WebSocket publisher, XP hesaplama ve frontend henüz uygulanmadı. Sonraki adım davet ve kodlu odanın ortak lobi akışıdır. Oda kodu için aynı Butik grubu varsayımı korunur; açık ürün kararları kesinleştirilmiş sayılmaz.
