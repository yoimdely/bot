
import 'dotenv/config';
import express from 'express';
import compression from 'compression';
import path from 'path';
import { fileURLToPath } from 'url';
import { Telegraf, Markup } from 'telegraf';
import cron from 'node-cron';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { BOT_TOKEN, DOMAIN } = process.env;
if (!BOT_TOKEN) throw new Error('BOT_TOKEN is required');

const app = express();
app.use(express.json());
app.use(compression());

const staticPath = path.resolve(__dirname, '../webapp');
app.use('/', express.static(staticPath, { index: 'index.html', extensions: ['html'] }));

const bot = new Telegraf(BOT_TOKEN);
const subscribers = new Set();
const facts = [
  "Регулярный сон улучшает гормональный баланс и либидо.",
  "Стресс напрямую влияет на сексуальное здоровье — найди способы расслабляться.",
  "Физическая активность повышает уровень тестостерона и настроение.",
  "Поддерживай водный баланс: это влияет и на самочувствие, и на либидо.",
  "Барьерная защита уменьшает риск ИППП и повышает спокойствие."
];

bot.start(async (ctx) => {
  const site = DOMAIN ? `https://${DOMAIN}` : 'https://example.com';
  await ctx.reply(
    'Добро пожаловать в Sex Health! Открой Mini App и начни вести статистику.\n/remind_on — включить напоминания\n/remind_off — выключить',
    Markup.keyboard([[Markup.button.webApp('📲 Открыть Mini App', site)]]).resize()
  );
});

bot.command('remind_on', async (ctx)=>{ subscribers.add(ctx.chat.id); await ctx.reply('🔔 Ежедневные напоминания включены (10:00).'); });
bot.command('remind_off', async (ctx)=>{ subscribers.delete(ctx.chat.id); await ctx.reply('🔕 Напоминания отключены.'); });

cron.schedule('0 10 * * *', async ()=>{
  const fact = facts[Math.floor(Math.random()*facts.length)];
  for (const chatId of subscribers) { try { await bot.telegram.sendMessage(chatId, 'Напоминание: обнови статистику 💚\nФакт дня: '+fact); } catch {} }
});

app.get('/health', (_,res)=>res.json({ok:true}));

const port = process.env.PORT || 3000;
app.listen(port, async ()=>{ console.log('HTTP on', port); await bot.launch(); console.log('Bot polling'); });
