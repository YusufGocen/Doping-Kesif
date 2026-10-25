# İlk backend adımı — doğrulama kaydı

Tarih: 21 Ekim 2026.

## Oluşturulanlar

- Java 21 / Spring Boot backend, resmi Maven Wrapper ve sabit bağımlılık sürümleri.
- PostgreSQL Compose, local ortam örneği ve Windows başlatma betiği.
- Flyway başlangıç migration'ı ve JPA validate yapılandırması.
- Local Swagger/OpenAPI, health, varsayılan kapalı iş API erişimi.
- Kullanıcının özgün dokümanları ve iki tasarım görselinin proje içi kopyaları.

## Doğrulama

Taşınabilir Zulu JDK 21 ve Apache Maven 3.9.11 ile kaynaklar/testler derlendi. Sistem PATH'ine kurulum yapılmadı. Maven dağıtımı resmi SHA512 ile kontrol edildi; Wrapper dağıtımı SHA256 ile sabitlendi.

Maven `verify` sonucu: BUILD SUCCESS; çalıştırılabilir Spring Boot JAR paketi oluşturuldu. Test sonucu: toplam 8; geçen 7; hata 0; atlanan 1.

| Kontrol | Sonuç |
|---|---|
| Anonim iş API erişimi | 401 |
| Kimliği olan kullanıcı için henüz açılmamış iş API'si | 403 |
| Güvensiz anonim POST | Reddedildi |
| Local doküman erişimi | İzinli |
| Üretim profili doküman erişimi | Reddedildi |
| Health erişimi | İzinli |
| Gerçek Spring context, Swagger/OpenAPI ve health (DB hariç smoke) | Geçti |
| Gerçek PostgreSQL, Flyway ve DB bağlantısı | Docker bulunmadığı için atlandı; doğrulanmadı |
| PowerShell başlatma betiği | Parser ile sözdizimi doğrulandı; Docker ile uçtan uca çalıştırılmadı |

Mockito test agent'ı JVM başında yüklenir; çalışma sırasında attach gerektirmez. Test süreçleri için 180 saniye sınırı vardır.

## Henüz yapılmayanlar

JWT token üretme/doğrulama, domain tabloları ve modelleri, davet/oda/lobi, oyun motoru, WebSocket endpoint'leri, ödüller ve frontend. Swagger bearer tanımı JWT uygulamasının tamamlandığı anlamına gelmez.

## Sıradaki adım

Oda dahil tam veri sözlüğünü birleştir; katalog ve oyuncu referansı tablolarını yeni Flyway migration'larıyla oluştur. Gerçek PostgreSQL doğrulaması için Docker Desktop veya yerel PostgreSQL gerekir.
