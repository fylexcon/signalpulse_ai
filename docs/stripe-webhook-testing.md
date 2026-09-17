# Stripe Webhook Yerel Test Rehberi

Bu rehber, Stripe CLI kullanarak yerel ortamda webhook'ları test etmenin adım adım talimatını içerir.

## Ön Gereksinimler

1. **Stripe CLI** yüklü olmalı:
   - Windows: `scoop install stripe` veya [stripe.com/docs/stripe-cli](https://stripe.com/docs/stripe-cli) adresinden indirin
   - macOS: `brew install stripe/stripe-cli/stripe`
   
2. **Stripe hesabına giriş yapın:**
   ```bash
   stripe login
   ```

3. **Docker konteynerlerinin çalışıyor olması gerekir:**
   ```bash
   docker-compose up -d
   ```

---

## Adım 1: Webhook Dinleyicisini Başlat

Terminal açın ve şu komutu çalıştırın:

```bash
stripe listen --forward-to localhost:8000/api/v1/webhooks/stripe
```

Bu komut size bir `whsec_...` anahtarı verecek. Bu anahtarı `.env` dosyasındaki `STRIPE_WEBHOOK_SECRET` alanına kopyalayın:

```env
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxx
```

Backend konteynerını yeniden başlatın:

```bash
docker-compose restart backend
```

---

## Adım 2: Checkout Session Simülasyonu

Yeni bir terminal açıp şu komutu çalıştırın:

```bash
stripe trigger checkout.session.completed
```

### Beklenen Davranış:
- `stripe listen` terminalinde `checkout.session.completed` olayının başarıyla iletildiğini görmelisiniz (`200 OK`)
- Backend loglarında (`docker compose logs backend`) webhook'un işlendiğini doğrulayın
- Veritabanında `subscriptions` tablosunda yeni bir kayıt oluşmuş olmalı

---

## Adım 3: Subscription Updated Simülasyonu

```bash
stripe trigger customer.subscription.updated
```

### Beklenen Davranış:
- `organizations.plan_type` alanı `starter` veya `pro`'ya güncellenmiş olmalı (price ID mapping'e göre)
- `subscriptions.status` alanı `active` olmalı

---

## Adım 4: Subscription İptal Simülasyonu

```bash
stripe trigger customer.subscription.deleted
```

### Beklenen Davranış:
- `organizations.plan_type` alanı `free`'ye dönmüş olmalı
- `subscriptions.status` alanı `canceled` olmalı
- Plan limitleri (API key, feedback sayısı) free seviyesine düşmüş olmalı

---

## Adım 5: İdempotency Doğrulama

Aynı event'i iki kez tetikleyin:

```bash
stripe trigger checkout.session.completed
stripe trigger checkout.session.completed
```

İkinci istekte backend `{"status": "already_processed"}` dönmeli ve veritabanında duplicate kayıt oluşmamalı.

---

## Veritabanı Doğrulama SQL'leri

PostgreSQL konteynerine bağlanıp kontrol edebilirsiniz:

```bash
docker exec -it b2b-saas-db-1 psql -U saas -d saas_db
```

```sql
-- Organizasyonun plan_type'ını kontrol et
SELECT id, name, plan_type FROM organizations;

-- Subscription durumunu kontrol et
SELECT org_id, status, stripe_subscription_id, cancel_at_period_end FROM subscriptions;

-- İşlenmiş webhook olaylarını kontrol et
SELECT event_id, event_type, created_at FROM processed_events ORDER BY created_at DESC;

-- Plan limitleri etkisini kontrol et (API key sayısı vs limit)
SELECT o.name, o.plan_type,
  (SELECT count(*) FROM api_keys WHERE org_id = o.id) as api_key_count,
  (SELECT count(*) FROM feedback_items WHERE org_id = o.id) as feedback_count
FROM organizations o;
```

---

## Sorun Giderme

| Sorun | Çözüm |
|-------|-------|
| `400 Invalid signature` | `.env`'deki `STRIPE_WEBHOOK_SECRET`'i `stripe listen` çıktısındaki ile güncelleyin |
| `400 Invalid payload` | Backend'in raw body okuduğundan emin olun (`await request.body()`) |
| Webhook gelmiyor | `stripe listen` komutunun çalıştığından ve doğru porta yönlendirildiğinden emin olun |
| Plan güncellenmiyor | `STRIPE_STARTER_PRICE_ID` / `STRIPE_PRO_PRICE_ID` env var'larının Stripe Dashboard'daki gerçek price ID'lerle eşleştiğini doğrulayın |
