# ImproveIt.Today - Telegram Bot

The Telegram bot interface allows users to:
- Report problems with location and photos
- Browse nearby problems
- Vote on existing issues
- Track their submissions
- View their profile and reputation

## Setup

1. Create a new Telegram bot via [@BotFather](https://t.me/BotFather)
2. Copy the bot token
3. Add to `.env`:
   ```
   TELEGRAM_BOT_TOKEN=your-bot-token
   API_GATEWAY_URL=http://localhost:8000/api
   ```

## Development

```bash
npm run dev
```

## Commands

- `/start` - Welcome message and main menu
- `/report` - Report a new problem
- `/nearby` - Show problems near you
- `/my_reports` - Your submitted problems
- `/search [keyword]` - Search problems
- `/profile` - Your profile
- `/help` - Help information

## User Flow: Reporting a Problem

1. User sends `/report`
2. Bot requests location
3. User shares location
4. Bot requests photo (optional)
5. User uploads photo or skips
6. Bot requests description
7. User types description
8. Bot shows category selection
9. User selects category
10. Problem is created and confirmation shown
