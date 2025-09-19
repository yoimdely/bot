
import 'dotenv/config';
import express from 'express';
import compression from 'compression';
import path from 'path';
import { fileURLToPath } from 'url';
import { Telegraf, Markup } from 'telegraf';
import { createStarsInvoiceLink } from './payments.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const {
  BOT_TOKEN,
  WEBHOOK_URL, // optional (for webhook mode later)
  WEBAPP_URL // optional; if not set, we will serve local /webapp
} = process.env;

if (!BOT_TOKEN) throw new Error('BOT_TOKEN is required in .env');

const app = express();
app.use(express.json());
app.use(compression());

// Serve static Mini App from /webapp folder (so one deploy can host both bot + webapp)
const staticPath = path.resolve(__dirname, '../webapp');
app.use('/', express.static(staticPath, { index: 'index.html', extensions: ['html'] }));

// Endpoint to get Stars invoice link (Mini App fetches this to avoid CORS and to keep token secret)
app.get('/stars-link', async (req, res) => {
  try {
    const linkData = await createStarsInvoiceLink({
      title: 'Premium 30 дней',
      description: 'Расширенная аналитика, персональные советы, экспорт CSV',
      amountStars: 500,
      payload: 'sub_30d'
    });
    res.json(linkData);
  } catch (e) {
    console.error('stars-link error:', e);
    res.status(500).json({ error: 'createInvoiceLink failed' });
  }
});

// ---------- Telegram Bot ----------
const bot = new Telegraf(BOT_TOKEN);

// /start with Menu button to open Mini App
bot.start(async (ctx) => {
  const url = WEBAPP_URL || (process.env.SELF_URL || (ctx.telegram?._telegram?.options?.apiRoot)) || '';
  await ctx.reply(
    'Добро пожаловать в Sex Health! Открой Mini App, чтобы вести статистику и получить советы.',
    Markup.keyboard([
      [Markup.button.webApp('📲 Открыть Mini App', (WEBAPP_URL || `${ctx.me ? '' : ''}`) || (reqProtocolHostFromCtx(ctx) + '/'))],
      ['⭐ Оформить Premium']
    ]).resize()
  );
});

function reqProtocolHostFromCtx(ctx){
  // fallback: guess bot URL from webhook update (not ideal). For Railway/Render use ENV SELF_URL
  return process.env.SELF_URL || 'https://example.com';
}

bot.hears('⭐ Оформить Premium', async (ctx) => {
  try {
    const { link } = await createStarsInvoiceLink({
      title: 'Premium 30 дней',
      description: 'Расширенная аналитика, персональные советы, экспорт CSV',
      amountStars: 500,
      payload: `sub_30_${ctx.from.id}_${Date.now()}`
    });
    await ctx.reply('Оформление подписки:', {
      reply_markup: { inline_keyboard: [[{ text: 'Оплатить ⭐', url: link }]] }
    });
  } catch (e) {
    console.error(e);
    await ctx.reply('Не удалось создать платёж. Попробуй позже.');
  }
});

// Receive web_app_data (Mini App may send events to the bot chat)
bot.on('web_app_data', async (ctx) => {
  try {
    const data = JSON.parse(ctx.message.web_app_data.data);
    await ctx.reply('✅ Данные получены: ' + (data.type || 'event'));
  } catch {
    await ctx.reply('⚠️ Ошибка обработки данных');
  }
});

// Mandatory for Telegram payments (if later connecting RUB provider)
bot.on('pre_checkout_query', async (ctx) => {
  await ctx.answerPreCheckoutQuery(true);
});

bot.on('successful_payment', async (ctx) => {
  await ctx.reply('🎉 Оплата успешна! Premium активирован.');
});

// Health
app.get('/health', (_, res) => res.json({ ok: true }));

const port = process.env.PORT || 3000;
app.listen(port, async () => {
  console.log('HTTP server on', port);
  await bot.launch(); // polling; webhook can be configured later
  console.log('Bot started (polling)');
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
