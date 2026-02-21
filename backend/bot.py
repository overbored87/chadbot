"""
Chadbot — Telegram Dating Coach Bot
Deps: pip install python-telegram-bot anthropic supabase python-dotenv
"""

import os
import base64
import logging
from io import BytesIO

import anthropic
from dotenv import load_dotenv
from supabase import create_client, Client
from telegram import Update
from telegram.ext import (
    Application,
    CommandHandler,
    MessageHandler,
    filters,
    ContextTypes,
)

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ── Clients ──────────────────────────────────────────────────────────────────

supabase: Client = create_client(
    os.environ["SUPABASE_URL"],
    os.environ["SUPABASE_KEY"],
)
claude = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

TELEGRAM_TOKEN = os.environ["TELEGRAM_BOT_TOKEN"]
ALLOWED_USER_ID = int(os.environ.get("ALLOWED_TELEGRAM_USER_ID", "0"))  # 0 = open


# ── Supabase helpers ─────────────────────────────────────────────────────────

def get_system_prompt() -> str:
    res = supabase.table("config").select("system_prompt").eq("id", "main").single().execute()
    return res.data["system_prompt"] if res.data else "You are Chadbot, a witty dating coach."


def get_active_examples() -> list[dict]:
    res = supabase.table("examples").select("*").eq("is_active", True).execute()
    return res.data or []


def build_examples_block(examples: list[dict]) -> str:
    if not examples:
        return ""

    lines = ["\n\n--- REFERENCE EXAMPLES FROM KNOWLEDGE BASE ---"]
    for ex in examples:
        lines.append(f"\n[{ex['type'].upper()}] {ex['title']}")
        if ex.get("annotation"):
            lines.append(f"Note: {ex['annotation']}")
        if ex.get("tags"):
            lines.append(f"Tags: {', '.join(ex['tags'])}")
    lines.append("--- END EXAMPLES ---\n")
    return "\n".join(lines)


# ── Image handling ────────────────────────────────────────────────────────────

async def download_image_as_base64(photo, context: ContextTypes.DEFAULT_TYPE) -> str:
    file = await context.bot.get_file(photo.file_id)
    buf = BytesIO()
    await file.download_to_memory(buf)
    buf.seek(0)
    return base64.standard_b64encode(buf.read()).decode("utf-8")


# ── Core analysis ─────────────────────────────────────────────────────────────

async def analyse_with_claude(
    image_b64: str,
    system_prompt: str,
    examples: list[dict],
    caption: str = "",
) -> str:
    examples_block = build_examples_block(examples)
    full_system = system_prompt + examples_block

    user_content = []

    # Attach any reference example images that have base64
    for ex in examples:
        if ex.get("screenshot_base64"):
            user_content.append({
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": "image/jpeg",
                    "data": ex["screenshot_base64"],
                },
            })
            user_content.append({
                "type": "text",
                "text": f"[Reference example: {ex['title']}. {ex.get('annotation', '')}]",
            })

    # The actual screenshot from the user
    user_content.append({
        "type": "image",
        "source": {
            "type": "base64",
            "media_type": "image/jpeg",
            "data": image_b64,
        },
    })
    user_content.append({
        "type": "text",
        "text": caption or "Analyse this screenshot and give me your best response suggestions.",
    })

    response = claude.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=1024,
        system=full_system,
        messages=[{"role": "user", "content": user_content}],
    )

    return response.content[0].text


# ── Telegram handlers ─────────────────────────────────────────────────────────

def is_allowed(update: Update) -> bool:
    if ALLOWED_USER_ID == 0:
        return True
    return update.effective_user.id == ALLOWED_USER_ID


async def cmd_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not is_allowed(update):
        return
    await update.message.reply_text(
        "👋 *Chadbot online.*\n\n"
        "Send me a screenshot of:\n"
        "• A conversation → I'll suggest reply options\n"
        "• A dating profile → I'll suggest openers\n\n"
        "You can also send multiple screenshots at once. Let's get you some wins. 🎯",
        parse_mode="Markdown",
    )


async def cmd_help(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not is_allowed(update):
        return
    await update.message.reply_text(
        "*Chadbot Commands*\n\n"
        "/start — Welcome message\n"
        "/help — This message\n"
        "/prompt — Show current system prompt\n\n"
        "Just send screenshots — no commands needed. "
        "Edit your prompt & knowledge base at your admin UI.",
        parse_mode="Markdown",
    )


async def cmd_prompt(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not is_allowed(update):
        return
    prompt = get_system_prompt()
    short = prompt[:600] + ("..." if len(prompt) > 600 else "")
    await update.message.reply_text(f"*Current system prompt:*\n\n{short}", parse_mode="Markdown")


async def handle_photo(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not is_allowed(update):
        return

    await update.message.reply_chat_action("typing")

    # Grab highest-res photo
    photo = update.message.photo[-1]
    caption = update.message.caption or ""

    try:
        image_b64 = await download_image_as_base64(photo, context)
        system_prompt = get_system_prompt()
        examples = get_active_examples()
        reply = await analyse_with_claude(image_b64, system_prompt, examples, caption)
        bubbles = [b.strip() for b in reply.split("---") if b.strip()]
        for bubble in bubbles:
            await update.message.reply_text(bubble)
    except Exception as e:
        logger.error(f"Error processing photo: {e}")
        await update.message.reply_text("⚠️ Something went wrong analysing that. Try again?")


async def handle_text(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not is_allowed(update):
        return
    await update.message.reply_text(
        "Send me a *screenshot* — paste an image of the conversation or profile. "
        "I can't read text pastes as well as I can read actual screenshots. 📸",
        parse_mode="Markdown",
    )


# ── Main ──────────────────────────────────────────────────────────────────────

async def main():
    app = Application.builder().token(TELEGRAM_TOKEN).build()

    app.add_handler(CommandHandler("start", cmd_start))
    app.add_handler(CommandHandler("help", cmd_help))
    app.add_handler(CommandHandler("prompt", cmd_prompt))
    app.add_handler(MessageHandler(filters.PHOTO, handle_photo))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_text))

    logger.info("Chadbot is running...")
    async with app:
        await app.start()
        await app.updater.start_polling(allowed_updates=Update.ALL_TYPES)
        await asyncio.Event().wait()  # run forever


if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
