
import dotenv from 'dotenv';
dotenv.config();

async function test() {
  const url = `${process.env.OLLAMA_HOST}/api/chat`;
  console.log('Testing URL:', url);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OLLAMA_API_KEY}`
      },
      body: JSON.stringify({
        model: process.env.OLLAMA_MODEL,
        messages: [{ role: 'user', content: 'hi' }],
        stream: false
      })
    });
    console.log('Status:', res.status);
    const text = await res.text();
    console.log('Response:', text);
  } catch (err) {
    console.error('Fetch Error:', err);
  }
}

test();
