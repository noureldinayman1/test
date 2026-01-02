import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactWebChat, { createDirectLine } from "botframework-webchat";
import { FluentThemeProvider } from "botframework-webchat-fluent-theme";

const TOKEN_ENDPOINT_URL =
  "https://Defaultb62a9626ac0e43b7aee7c0d0a11492.90.environment.api.powerplatform.com" +
  "/powervirtualagents/botsbyschema/crfad_facialPalsyCoPilot/directline/token?api-version=2022-03-01-preview";

const AGENT_TITLE = "ctcHealth Assistant";
const AGENT_AVATAR = "https://i.imgur.com/v0pQRJe.jpeg";
const USER_AVATAR = "https://i.imgur.com/Vd2rwWx.jpeg";

type Status = "idle" | "connecting" | "online" | "offline" | "error";

async function getDirectLine(tokenEndpointURL: string, locale: string) {
  const apiVersion = new URL(tokenEndpointURL).searchParams.get("api-version");

  const [directLineURL, token] = await Promise.all([
    fetch(new URL(`/powervirtualagents/regionalchannelsettings?api-version=${apiVersion}`, tokenEndpointURL))
      .then((r) => {
        if (!r.ok) throw new Error(`Regional settings failed (HTTP ${r.status})`);
        return r.json();
      })
      .then(({ channelUrlsById: { directline } }) => directline as string),
    fetch(tokenEndpointURL)
      .then((r) => {
        if (!r.ok) throw new Error(`Token request failed (HTTP ${r.status})`);
        return r.json();
      })
      .then(({ token }) => token as string)
  ]);

  const directLine = createDirectLine({
    domain: new URL("v3/directline", directLineURL),
    token
  });

  // Send the same event you used in your HTML version once connected
  const sub = directLine.connectionStatus$.subscribe({
    next(value) {
      if (value === 2) {
        directLine
          .postActivity({
            type: "event",
            name: "startConversation",
            locale,
            localTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone
          })
          .subscribe();
        sub.unsubscribe();
      }
    }
  });

  return directLine;
}

export default function App() {
  const locale = document.documentElement.lang || "en";

  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string>("");
  const [directLine, setDirectLine] = useState<any>(null);

  const mountedRef = useRef(false);

  const styleOptions = useMemo(
    () => ({
      hideUploadButton: true,
      botAvatarImage: AGENT_AVATAR,
      userAvatarImage: USER_AVATAR,
      botAvatarInitials: "",
      userAvatarInitials: "",
      avatarSize: 28,
      showAvatarInGroup: false,
      bubbleMaxWidth: 560
    }),
    []
  );

  const start = useCallback(async () => {
    setError("");
    setStatus("connecting");

    try {
      // End any previous session
      try {
        directLine?.end?.();
      } catch {
        // ignore
      }

      const dl = await getDirectLine(TOKEN_ENDPOINT_URL, locale);
      setDirectLine(dl);
      setStatus("online");
    } catch (e: any) {
      setStatus("error");
      setError(e?.message || String(e));
    }
  }, [directLine, locale]);

  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;
    start();
  }, [start]);

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "#f3f2f1" }}>
      <div
        style={{
          height: 56,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 12px 0 14px",
          background: "#fff",
          borderBottom: "1px solid #e1dfdd"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 999,
              overflow: "hidden",
              border: "1px solid #e1dfdd",
              background: "#faf9f8"
            }}
          >
            <img src={AGENT_AVATAR} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {AGENT_TITLE}
            </div>
            <div style={{ fontSize: 12, color: "#605e5c", display: "inline-flex", gap: 8, alignItems: "center" }}>
              <span style={{ width: 8, height: 8, borderRadius: 999, background: status === "online" ? "#107c10" : "#c8c6c4" }} />
              <span>
                {status === "connecting" ? "Connecting…" : status === "online" ? "Online" : status === "error" ? "Error" : "Ready"}
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={start}
            style={{
              height: 34,
              padding: "0 12px",
              borderRadius: 8,
              border: "1px solid #c8c6c4",
              background: "#fff",
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            New chat
          </button>
          <button
            onClick={start}
            style={{
              height: 34,
              padding: "0 12px",
              borderRadius: 8,
              border: "1px solid transparent",
              background: "#0078d4",
              color: "#fff",
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            Reconnect
          </button>
        </div>
      </div>

      <div style={{ position: "relative", flex: 1, minHeight: 0 }}>
        {error ? (
          <div style={{ padding: 16, color: "#323130" }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Unable to connect</div>
            <div style={{ color: "#605e5c", marginBottom: 10 }}>{error}</div>
          </div>
        ) : null}

        <div style={{ position: "absolute", inset: 0 }}>
          {directLine ? (
            <FluentThemeProvider>
              <ReactWebChat directLine={directLine} locale={locale} styleOptions={styleOptions} />
            </FluentThemeProvider>
          ) : null}
        </div>
      </div>
    </div>
  );
}
