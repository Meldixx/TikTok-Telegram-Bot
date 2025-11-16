import { Telegraf } from 'telegraf';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const token = process.env.BOT_TOKEN;

if (!token) {
  console.error('BOT_TOKEN is missing. Set it in your environment or .env file.');
  process.exit(1);
}

const bot = new Telegraf(token);

const tiktokUrlPattern = /(https?:\/\/)?(www\.|vm\.)?tiktok\.com\/[\w\/-]+/i;

async function fetchHighestQualityVideo(videoUrl) {
  const apiUrl = 'https://www.tikwm.com/api/';

  const response = await axios.get(apiUrl, {
    params: { url: videoUrl },
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; TelegramBot/1.0)',
    },
    timeout: 15000,
  });

  const { data } = response;

  if (!data || data.code !== 0 || !data.data) {
    throw new Error('Не удалось получить данные видео.');
  }

  const apiData = data.data;
  const videoLink = apiData.hdplay || apiData.play;

  if (!videoLink) {
    throw new Error('Ссылка на видео не найдена.');
  }

  return {
    url: videoLink.startsWith('http') ? videoLink : `https:${videoLink}`,
    description: apiData.title || 'Видео из TikTok',
    cover: apiData.cover,
  };
}

bot.start((ctx) => {
  ctx.reply(
    'Привет! Отправь мне ссылку на видео в TikTok, и я пришлю его в максимальном качестве.\n' +
      'Просто вставь ссылку в чат.'
  );
});

bot.hears(tiktokUrlPattern, async (ctx) => {
  const link = ctx.message.text.trim();
  await ctx.replyWithChatAction('upload_video');

  try {
    const video = await fetchHighestQualityVideo(link);
    await ctx.replyWithVideo({ url: video.url }, {
      caption: video.description,
      thumbnail: video.cover ? { url: video.cover } : undefined,
    });
  } catch (error) {
    console.error('Failed to fetch TikTok video:', error.message);
    await ctx.reply('Не удалось скачать видео. Проверь ссылку и попробуй снова.');
  }
});

bot.on('text', (ctx) => {
  ctx.reply('Отправь ссылку на видео TikTok, чтобы я скачал его для тебя.');
});

bot.catch((error, ctx) => {
  console.error('Bot error for update', ctx.update.update_id, error);
});

bot.launch().then(() => {
  console.log('Bot is running. Press Ctrl+C to stop.');
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
