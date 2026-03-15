export async function POST(req: Request) {
  const { inputs, result, topSuggestions } = await req.json();

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "ANTHROPIC_API_KEY not configured" },
      { status: 500 }
    );
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: `You are a tournament economics advisor for SuperNova Badminton Club, a community badminton organisation in Melbourne, Australia. You receive tournament configuration and computed outputs. Provide exactly 5 concise insights.

Categories:
1. 💰 MARGIN — How to improve profitability (reference only the provided numbers)
2. ⚠️ RISK — What could go wrong at this configuration
3. ⏱ SCHEDULE — Duration feasibility for a single-day event (8hrs is typical max)
4. 🏸 PLAYER VALUE — Cost-per-game competitiveness ($8-12/game is good, $15+ is high)
5. 💡 OPPORTUNITY — One specific practical improvement

Rules:
- Each insight: 1-2 sentences maximum
- Include specific dollar amounts or percentages
- If profit is negative, lead with that
- Be direct — this is a founder-operator, not a board
- Only reference numbers from the provided data`,
      messages: [
        {
          role: "user",
          content: JSON.stringify({ inputs, result, topSuggestions }),
        },
      ],
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    return Response.json(
      { error: data.error?.message || "API request failed" },
      { status: response.status }
    );
  }

  return Response.json({ insights: data.content[0].text });
}
