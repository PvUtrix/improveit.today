import { Telegraf, Markup, Context } from 'telegraf';
import { message } from 'telegraf/filters';
import dotenv from 'dotenv';
import axios from 'axios';
import { logger } from './utils/logger';
import { PROBLEM_CATEGORIES, CATEGORY_ICONS } from '@improveit/common';

dotenv.config();

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN!);
const API_BASE_URL = process.env.API_GATEWAY_URL || 'http://localhost:8000/api';

// Store user session state
const userSessions = new Map<number, any>();

// Helper to get API client with auth
function getApiClient(token?: string) {
  return axios.create({
    baseURL: API_BASE_URL,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

// Main menu keyboard
function getMainMenuKeyboard() {
  return Markup.keyboard([
    ['📝 Report Problem', '🗺️ Browse Map'],
    ['📊 My Reports', '⬆️ My Votes'],
    ['👤 Profile', '❓ Help'],
  ])
    .resize()
    .oneTime(false);
}

// Category selection keyboard
function getCategoryKeyboard() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('🚗 Roads', 'cat_roads'),
      Markup.button.callback('💡 Lighting', 'cat_lighting'),
    ],
    [
      Markup.button.callback('🗑️ Waste', 'cat_waste'),
      Markup.button.callback('🏗️ Infrastructure', 'cat_infrastructure'),
    ],
    [
      Markup.button.callback('🌳 Environment', 'cat_environment'),
      Markup.button.callback('🚧 Safety', 'cat_safety'),
    ],
    [Markup.button.callback('📋 Other', 'cat_other')],
  ]);
}

// Start command
bot.command('start', async (ctx) => {
  const userId = ctx.from.id;

  await ctx.reply(
    `👋 Welcome to ImproveIt.Today!

Help improve your community by reporting problems:
🚗 Potholes, broken infrastructure
💡 Missing streetlights
🗑️ Trash accumulation
🏗️ Unsafe structures
...and much more!

What would you like to do?`,
    getMainMenuKeyboard()
  );

  logger.info(`User started bot: ${userId}`);
});

// Help command
bot.command('help', async (ctx) => {
  await ctx.reply(
    `🤖 *ImproveIt.Today Bot Help*

*Commands:*
/start - Start the bot
/report - Report a new problem
/nearby - Show problems near you
/my\\_reports - Your submitted problems
/search - Search problems
/profile - Your profile
/help - This message

*How to Report a Problem:*
1. Send /report or tap "Report Problem"
2. Share your location
3. Send a photo (optional)
4. Describe the problem
5. Select a category

*Need more help?* Visit our website or contact support.`,
    { parse_mode: 'Markdown', ...getMainMenuKeyboard() }
  );
});

// Report command
bot.command('report', async (ctx) => {
  const userId = ctx.from.id;

  userSessions.set(userId, {
    state: 'awaiting_location',
    data: {},
  });

  await ctx.reply(
    `📍 Please share the location of the problem.

You can:
• Share your current location 📲
• Send any location from the map 🗺️

Tap the button below to share your location:`,
    Markup.keyboard([
      [Markup.button.locationRequest('📍 Share My Location')],
      ['❌ Cancel'],
    ])
      .resize()
      .oneTime()
  );
});

// Handle location
bot.on(message('location'), async (ctx) => {
  const userId = ctx.from.id;
  const session = userSessions.get(userId);

  if (!session || session.state !== 'awaiting_location') {
    return ctx.reply('Please use /report first to start reporting a problem.');
  }

  const { latitude, longitude } = ctx.message.location;

  session.data.latitude = latitude;
  session.data.longitude = longitude;
  session.state = 'awaiting_photo';

  userSessions.set(userId, session);

  await ctx.reply(
    `✅ Location received!

📸 Now, please send a photo of the problem.

This helps authorities understand the issue better.

You can also skip this step.`,
    Markup.keyboard([['⏭️ Skip Photo'], ['❌ Cancel']])
      .resize()
      .oneTime()
  );
});

// Handle photo
bot.on(message('photo'), async (ctx) => {
  const userId = ctx.from.id;
  const session = userSessions.get(userId);

  if (!session || session.state !== 'awaiting_photo') {
    return;
  }

  // Get the highest resolution photo
  const photo = ctx.message.photo[ctx.message.photo.length - 1];
  const fileLink = await ctx.telegram.getFileLink(photo.file_id);

  session.data.photoUrl = fileLink.href;
  session.state = 'awaiting_description';

  userSessions.set(userId, session);

  await ctx.reply(
    `✅ Photo received!

📝 Please describe the problem in a few sentences:

Example: "Large pothole on Main Street, dangerous for cars and bikes"`,
    Markup.keyboard([['❌ Cancel']])
      .resize()
      .oneTime()
  );
});

// Handle text messages
bot.on(message('text'), async (ctx) => {
  const userId = ctx.from.id;
  const session = userSessions.get(userId);
  const text = ctx.message.text;

  // Handle menu buttons
  if (text === '📝 Report Problem') {
    return ctx.telegram.sendMessage(userId, '/report');
  }

  if (text === '🗺️ Browse Map') {
    return ctx.reply('Opening map... (Web app link here)');
  }

  if (text === '📊 My Reports') {
    // Fetch user's problems
    return ctx.reply('Fetching your reports...');
  }

  if (text === '⬆️ My Votes') {
    return ctx.reply('Fetching problems you voted for...');
  }

  if (text === '👤 Profile') {
    return ctx.reply('Your profile...');
  }

  if (text === '❓ Help') {
    return ctx.telegram.sendMessage(userId, '/help');
  }

  if (text === '❌ Cancel') {
    userSessions.delete(userId);
    return ctx.reply(
      'Operation cancelled.',
      getMainMenuKeyboard()
    );
  }

  if (text === '⏭️ Skip Photo') {
    if (session && session.state === 'awaiting_photo') {
      session.state = 'awaiting_description';
      userSessions.set(userId, session);

      return ctx.reply(
        `📝 Please describe the problem in a few sentences:`,
        Markup.keyboard([['❌ Cancel']])
          .resize()
          .oneTime()
      );
    }
  }

  // Handle problem description
  if (session && session.state === 'awaiting_description') {
    session.data.description = text;
    session.state = 'awaiting_category';

    userSessions.set(userId, session);

    return ctx.reply(
      `✅ Description received!

🏷️ What category best describes this problem?`,
      getCategoryKeyboard()
    );
  }
});

// Handle category selection
bot.action(/^cat_(.+)$/, async (ctx) => {
  const userId = ctx.from!.id;
  const session = userSessions.get(userId);

  if (!session || session.state !== 'awaiting_category') {
    return ctx.answerCbQuery('Please start a new report with /report');
  }

  const category = ctx.match[1];
  session.data.category = category;

  // Submit the problem
  try {
    // TODO: Get user token from auth
    const api = getApiClient();

    const problemData = {
      userId: userId.toString(),
      title: `${CATEGORY_ICONS[category as keyof typeof CATEGORY_ICONS]} ${category} issue`,
      description: session.data.description,
      latitude: session.data.latitude,
      longitude: session.data.longitude,
      category,
      mediaUrls: session.data.photoUrl ? [session.data.photoUrl] : [],
    };

    const response = await api.post('/problems', problemData);

    const problem = response.data.data;

    await ctx.editMessageText(
      `✅ *Problem submitted successfully!*

📊 Problem #${problem.id.substr(0, 8)}
📍 Location: ${problem.latitude.toFixed(6)}, ${problem.longitude.toFixed(6)}
🏷️ Category: ${category}
⬆️ Votes: 1 (you)

Your problem is now visible on the map. Share it with neighbors to get more votes!

💡 Tip: The more votes, the higher the priority!`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [
            Markup.button.url('View on Map', `https://improveit.today/problem/${problem.id}`),
            Markup.button.callback('📤 Share', `share_${problem.id}`),
          ],
        ]),
      }
    );

    userSessions.delete(userId);

    logger.info(`Problem created: ${problem.id} by user ${userId}`);
  } catch (error: any) {
    logger.error('Failed to create problem:', error);

    await ctx.editMessageText(
      '❌ Failed to submit problem. Please try again later.',
      getMainMenuKeyboard()
    );

    userSessions.delete(userId);
  }

  await ctx.answerCbQuery();
});

// Nearby command
bot.command('nearby', async (ctx) => {
  await ctx.reply(
    `📍 To show problems near you, please share your location:`,
    Markup.keyboard([[Markup.button.locationRequest('📍 Share My Location')]])
      .resize()
      .oneTime()
  );
});

// Error handling
bot.catch((err, ctx) => {
  logger.error(`Error for ${ctx.updateType}`, err);
  ctx.reply('An error occurred. Please try again.');
});

// Start bot
bot.launch();

logger.info('Telegram bot started successfully!');

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
