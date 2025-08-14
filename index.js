require('dotenv').config();

const HASURA_URL = process.env.HASURA_URL;
const HASURA_SECRET = process.env.HASURA_SECRET;
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;

const express = require('express');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const saveMessage = require('./saveMessage');

const app = express();
app.use(express.json());

console.log('HASURA_URL:', HASURA_URL);
console.log('HASURA_SECRET:', HASURA_SECRET);
console.log('N8N_WEBHOOK_URL:', N8N_WEBHOOK_URL);

app.post('/', async (req, res) => {
  try {
    // Extract values from Hasura Action or direct payload
    const chatId = req.body.input?.chat_id || req.body.chat_id;
    const userMessage = req.body.input?.user_message || req.body.user_message;
    const userId = req.body.input?.user_id || req.body.user_id;

    // Only validate userId if present (for user messages)
    if (userId && (typeof userId !== 'string' || userId.length !== 36)) {
      console.error('ERROR: userId is missing or invalid:', userId);
      return res.status(400).json({ error: "Missing or invalid userId" });
    }

    // Save the user message if userId is present (from frontend direct message, NOT Hasura Action)
    if (userId) {
      await saveMessage(chatId, userMessage, false, userId);
    }

    // Get bot reply from n8n
    const n8nWebhook = N8N_WEBHOOK_URL;
    const n8nResponse = await axios.post(n8nWebhook, { user_message: userMessage });

    // Use the correct bot reply field
    const botReply = n8nResponse.data.reply || n8nResponse.data.message || n8nResponse.data.content || "Sorry, no reply from bot.";

    const botUserId = "f9edc556-2f3a-4d72-9a5b-4f63a9e4c123"; // or your bot's UUID

    // Save bot reply
    const insertedBotMessage = await saveMessage(chatId, botReply, true, botUserId);

    // Safely get message ID
    const messageId =
      insertedBotMessage?.data?.data?.insert_messages_one?.id ||
      insertedBotMessage?.id ||
      uuidv4();

    // RESPOND WITH TOP-LEVEL "message" KEY FOR HASURA!
    res.json({
      message: {
        id: messageId,
        content: botReply,
        created_at: new Date().toISOString(),
        is_bot: true
      }
    });
  } catch (err) {
    console.error("Error in / route:", err);
    res.status(500).json({
      error: "Internal Server Error",
      details: err.message
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Bot server running on port ${PORT}`);
});