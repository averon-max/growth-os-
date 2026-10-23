# Growth OS — Writer System Handoff

## Проект
Next.js 16.3.1 (Turbopack) + TypeScript + Prisma + PostgreSQL
Branch: fix/writer-single-log-template-observability-final-20261021

## Writer Pipeline (src/lib/writer/)
- logger.ts — JSONL логи в writer-logs/YYYY-MM-DD-slug.jsonl
- templates.ts — 6 шаблонов: informational, comparison, listicle, how-to, review, landing
- keyword-picker.ts — DataForSEO keywords_data/google_ads/keywords_for_keywords/live, скоринг volume/difficulty²
- serp-analyzer.ts — DataForSEO serp/google/organic/live/advanced
- article-writer.ts — OpenAI gpt-5.6-luna, max_completion_tokens (не max_tokens), без temperature
- orchestrator.ts — запускает pipeline

## API/UI
- POST /api/writer — { seedKeyword, category, websiteId } → генерирует + сохраняет ContentBrief + ContentArticle
- src/components/dashboard/writer-form.tsx — клиентская форма
- src/app/dashboard/content/page.tsx — ContentExplorer (список) + WriterForm (создание)

## DataForSEO
- РАБОТАЕТ: keywords_data/google_ads/*, serp/google/organic/*
- НЕ РАБОТАЕТ (401, нужна отдельная подписка): dataforseo_labs/* — ВСЕ Labs endpoints

## Старая система
content-explorer.tsx (2533 строки) + content-create-button.tsx (1275 строк) — НЕ удалены, content-explorer нужен для показа бриф.
POST /api/content/briefs падает из-за Labs 401.
production-master-live-source-adapter.ts — добавлены .catch(()=>[]) на Labs-вызовы, но serp-intelligence.ts:721 бросает SerpIntelligenceError — нужен ещё try/catch вокруг buildSerpIntelligence (~строка 649).

## БД схема
ContentBrief: websiteId, topic, searchIntent, primaryKeyword, secondaryKeywords[], outline(Json), status, generatedBy
ContentArticle: briefId, title, metaDescription, h1, bodyMarkdown, status, generatedBy

## Env (.env.local)
DATAFORSEO_LOGIN, DATAFORSEO_PASSWORD, OPENAI_API_KEY, DATABASE_URL

## Тест
http://localhost:3000/dashboard/content → ввести keyword → Write Article
