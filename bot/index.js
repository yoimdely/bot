
import 'dotenv/config';
import express from 'express';
import compression from 'compression';
import path from 'path';
import { fileURLToPath } from 'url';
import { Telegraf, Markup } from 'telegraf';
import cron from 'node-cron';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { BOT_TOKEN } = process.env;
if (!BOT_TOKEN) throw new Error('BOT_TOKEN is required in .env');

const app = express();
app.use(express.json());
app.use(compression());

const staticPath = path.resolve(__dirname, '../webapp');
app.use('/', express.static(staticPath, { index: 'index.html', extensions: ['html'] }));

// ---- Telegram Bot ----
const bot = new Telegraf(BOT_TOKEN);

// simple in-memory subscribers list for reminders (demo only)
const subscribers = new Set();

bot.start(async (ctx) => {
  await ctx.reply(
    'Добро пожаловать в Sex Health! Открой Mini App, чтобы вести статистику.\n' +
    'Команды:\n/remind_on — включить ежедневные напоминания\n/remind_off — отключить',
    Markup.keyboard([[Markup.button.webApp('📲 Открыть Mini App', 'https://' + (process.env.DOMAIN || 'example.com'))]]).resize()
  );
});

bot.command('remind_on', async (ctx) => {
  subscribers.add(ctx.chat.id);
  await ctx.reply('🔔 Напоминания включены. Буду писать каждый день в 10:00 по серверному времени.');
});

bot.command('remind_off', async (ctx) => {
  subscribers.delete(ctx.chat.id);
  await ctx.reply('🔕 Напоминания отключены.');
});

// Daily reminder at 10:00 server time
cron.schedule('0 10 * * *', async () => {
  for (const chatId of subscribers) {
    try {
      await bot.telegram.sendMessage(chatId, 'Напоминание: обнови статистику в Sex Health 💚');
    } catch (e) {
      console.error('Failed to send reminder', chatId, e.message);
    }
  }
});

app.get('/health', (_, res) => res.json({ ok: true }));

const port = process.env.PORT || 3000;
app.listen(port, async () => {
  console.log('HTTP on', port);
  await bot.launch(); // polling mode for demo
  console.log('Bot started (polling)');
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
