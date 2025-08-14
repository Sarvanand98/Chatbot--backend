require('dotenv').config();
const axios = require('axios');

const HASURA_URL = process.env.HASURA_URL;
const HASURA_SECRET = process.env.HASURA_SECRET;

async function saveMessage(chatId, content, isBot, userId) {
  // LINE-BY-LINE LOGGING: Check userId formatting and value
  console.log('userId:', userId);
  console.log('userId length:', userId.length);
  console.log('userId hex:', Buffer.from(userId).toString('hex'));

  // Check chatId too!
  console.log('chatId:', chatId);
  console.log('chatId length:', chatId.length);
  console.log('chatId hex:', Buffer.from(chatId).toString('hex'));

  // Build mutation
  const mutation = `
    mutation {
      insert_messages_one(object: {
        chat_id: "${chatId}",
        user_id: "${userId}",
        content: "${content}",
        is_bot: ${isBot},
        created_at: "${new Date().toISOString()}"
      }) {
        id
      }
    }
  `;
  // Log the actual mutation string to spot formatting issues
  console.log('GraphQL mutation:', mutation);

  // Send to Hasura
  const response = await axios.post(
    HASURA_URL,
    { query: mutation },
    {
      headers: {
        'x-hasura-admin-secret': HASURA_SECRET,
        'Content-Type': 'application/json'
      }
    }
  );
  return response.data;
}

module.exports = saveMessage;