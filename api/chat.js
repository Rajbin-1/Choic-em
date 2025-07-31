// Edge-compatible API route
export const config = {
  runtime: 'experimental-edge'
};

export default async function handler(req) {
  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { messages, model } = await req.json();
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'Missing API key' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const openRouterResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": req.headers.get('referer') || "",
        "X-Title": "TAPE - Vercel Edge"
      },
      body: JSON.stringify({
        model: model || "openai/gpt-3.5-turbo",
        messages,
        max_tokens: 1000
      })
    });

    clearTimeout(timeoutId);

    if (!openRouterResponse.ok) {
      throw new Error(`OpenRouter error: ${openRouterResponse.statusText}`);
    }

    const data = await openRouterResponse.json();
    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
