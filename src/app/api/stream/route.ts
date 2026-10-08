import { jsonError, requireUser } from "@/lib/api";
import { getMarketSnapshots } from "@/lib/market-data";
import { prisma } from "@/lib/prisma";
import { settleExpiredTrades } from "@/lib/trade-service";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    const encoder = new TextEncoder();
    let closed = false;
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const close = () => {
          if (closed) return;
          closed = true;
          try { controller.close(); } catch { /* Stream already closed by client. */ }
        };
        request.signal.addEventListener("abort", close, { once: true });
        const send = (event: string, data: unknown) => {
          if (!closed) controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        };
        void (async () => {
          while (!closed) {
            try {
              await settleExpiredTrades();
              const [markets, account, trades] = await Promise.all([
                getMarketSnapshots(),
                prisma.account.findUnique({ where: { userId: user.id }, select: { balance: true, realBalance: true } }),
                prisma.trade.findMany({
                  where: { userId: user.id },
                  orderBy: { createdAt: "desc" },
                  take: 20,
                }),
              ]);
              send("snapshot", {
                markets,
                account: account
                  ? { balance: account.balance.toFixed(2), realBalance: account.realBalance.toFixed(2) }
                  : null,
                trades,
                serverTime: new Date().toISOString(),
              });
            } catch (error) {
              console.error("Realtime stream update failed", error);
              send("service-error", { code: "UPDATE_UNAVAILABLE", message: "A live update could not be loaded." });
              if (process.env.MARKET_DATA_URL) {
                await new Promise((resolve) => setTimeout(resolve, 3000));
                break;
              }
            }
            await new Promise((resolve) => setTimeout(resolve, 3000));
          }
          close();
        })();
      },
      cancel() { closed = true; },
    });
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
