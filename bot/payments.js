
import fetch from 'node-fetch';
import 'dotenv/config';

export async function createStarsInvoiceLink({ title, description, amountStars, payload }) {
  const token = process.env.BOT_TOKEN;
  const url = `https://api.telegram.org/bot${token}/createInvoiceLink`;
  const body = {
    title,
    description,
    payload,
    currency: 'XTR',
    prices: [{ label: title, amount: amountStars }]
  };
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await r.json();
  if (!data.ok) throw new Error('createInvoiceLink failed: ' + JSON.stringify(data));
  return { link: data.result };
}
