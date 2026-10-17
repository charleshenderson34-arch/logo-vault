const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, OPTIONS",
  "access-control-allow-headers": "content-type",
};

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", ...CORS },
  });

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { headers: CORS });
    if (request.method !== "GET") return json({ error: "method not allowed" }, 405);

    const { pathname } = new URL(request.url);

    if (pathname === "/" || pathname === "/health") {
      return json({ ok: true, service: "bluelight-api" });
    }

    if (pathname === "/v1/time") {
      return json({ utc: new Date().toISOString() });
    }

    // Read-only: the on-chain attestation record (hash and count only)
    if (pathname === "/v1/attestation") {
      const addr = env.ATTEST_ADDRESS;
      const res = await fetch("https://fullnode.mainnet.aptoslabs.com/v1/view", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          function: `${addr}::portfolio_attestation::get`,
          type_arguments: [],
          arguments: [addr],
        }),
      });
      if (!res.ok) return json({ error: "no attestation on chain yet" }, 404);
      const [root, count, updated, version] = await res.json();
      return json({
        address: addr,
        merkle_root: root,
        asset_count: Number(count),
        updated_at: new Date(Number(updated) * 1000).toISOString(),
        version: Number(version),
        self_attested: true,
      });
    }

    return json({ error: "not found" }, 404);
  },
};
