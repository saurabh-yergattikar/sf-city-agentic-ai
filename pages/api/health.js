// /api/health - quick check that everything is configured

export default async function handler(req, res) {
  const checks = {
    anthropic_key: !!process.env.ANTHROPIC_API_KEY,
    key_prefix: process.env.ANTHROPIC_API_KEY ? process.env.ANTHROPIC_API_KEY.substring(0, 10) + "..." : "NOT SET",
    sf_data_token: !!process.env.SF_DATA_APP_TOKEN,
    node_version: process.version,
  };

  // Test SF Data API
  try {
    const sfRes = await fetch("https://data.sfgov.org/resource/i98e-djp9.json?$limit=1");
    checks.sf_data_api = sfRes.ok ? "OK" : `Error: ${sfRes.status}`;
  } catch (e) {
    checks.sf_data_api = `Error: ${e.message}`;
  }

  // Test Anthropic API
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const { default: Anthropic } = await import("@anthropic-ai/sdk");
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const msg = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 10,
        messages: [{ role: "user", content: "Say OK" }],
      });
      checks.anthropic_api = msg.content?.[0]?.text ? "OK" : "Unexpected response";
    } catch (e) {
      checks.anthropic_api = `Error: ${e.message}`;
    }
  } else {
    checks.anthropic_api = "SKIPPED - no key";
  }

  res.status(200).json(checks);
}
