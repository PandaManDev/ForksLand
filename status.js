// Vercel serverless function. Reads real Java server status via mcstatus.io.
// Configure JAVA_SERVER_HOST in Vercel Project Settings > Environment Variables.
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }
  const host = process.env.JAVA_SERVER_HOST;
  const rawPort = process.env.JAVA_SERVER_PORT || "25565";
  const port = Number(rawPort);
  if (!host || !/^[a-zA-Z0-9.-]+$/.test(host) || !Number.isInteger(port) || port < 1 || port > 65535) {
    return res.status(200).json({
      configured: false,
      message: "Set a valid JAVA_SERVER_HOST and optional JAVA_SERVER_PORT in Vercel environment variables."
    });
  }
  try {
    const endpoint = `https://api.mcstatus.io/v2/status/java/${encodeURIComponent(host)}:${port}`;
    const response = await fetch(endpoint, { headers: { "Accept": "application/json" }, signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error(`Status provider returned HTTP ${response.status}`);
    const data = await response.json();
    if (typeof data.online !== "boolean") throw new Error("Status provider response was incomplete");
    const playersOnline = Number.isFinite(data.players?.online) ? data.players.online : null;
    const playersMax = Number.isFinite(data.players?.max) ? data.players.max : null;
    return res.status(200).json({
      configured: true,
      online: data.online,
      playersOnline: data.online ? playersOnline : 0,
      playersMax,
      checkedAt: new Date().toISOString()
    });
  } catch (error) {
    return res.status(502).json({ error: "Could not retrieve live server status from the status provider." });
  }
}
