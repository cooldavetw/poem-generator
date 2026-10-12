import { createContext, useContext, useMemo, useRef, useState, type ComponentProps } from "react";
import { HttpAgent } from "@ag-ui/client";
import { CopilotKitProvider, CopilotSidebar, ToolCallStatus, useConfigureSuggestions, useFrontendTool, type ReactToolCallRenderer } from "@copilotkit/react-core/v2";
import { createPoemHandler, POEM_TOOL, POEM_TOOL_DESCRIPTION } from "./lib/agent";
import { backendUrl } from "./lib/backend";
import { poemSchema, type Poem, type SavedPoem } from "./lib/poem";
import { PoemCard } from "./poem-card";

const suggestions = [
  { title: "城市夜色", message: "請寫一首關於城市夜色的繁體中文新詩。" },
  { title: "雨後街角", message: "請寫一首關於雨後街角的繁體中文新詩。" },
  { title: "想念一個人", message: "請寫一首關於想念一個人的繁體中文新詩。" },
];

const PoemCollection = createContext<SavedPoem[]>([]);

type ChatProps = {
  poems: SavedPoem[];
  onPoem: (poem: Poem, toolCallId: string) => void;
};

export function Chat({ poems, onPoem }: ChatProps) {
  const [agents] = useState(() => ({ default: new HttpAgent({ url: backendUrl("agent") }) }));
  return (
    <CopilotKitProvider agents__unsafe_dev_only={agents} enableInspector={false} showIntelligenceIndicator={false}>
      <PoemCopilot poems={poems} onPoem={onPoem} />
    </CopilotKitProvider>
  );
}

function PoemCopilot({ poems, onPoem }: ChatProps) {
  const [open, setOpen] = useState(true);
  const [error, setError] = useState<string>();
  const latest = useRef(onPoem);
  latest.current = onPoem;
  const handler = useMemo(() => createPoemHandler((poem, id) => latest.current(poem, id)), []);

  useConfigureSuggestions({ suggestions, available: "before-first-message" }, []);
  useFrontendTool({
    name: POEM_TOOL,
    description: POEM_TOOL_DESCRIPTION,
    parameters: poemSchema,
    // Displaying a poem completes the action; a second model run is unnecessary.
    followUp: false,
    handler: async (args, { toolCall }) => {
      setError(undefined);
      return handler(args, toolCall.id);
    },
    render: PoemToolPreview,
  }, []);

  return (
    <PoemCollection.Provider value={poems}>
      <div className="poem-copilot" data-open={open}>
        <CopilotSidebar
          open={open}
          onOpenChange={setOpen}
          width="min(420px, 100vw)"
          labels={{
            modalHeaderTitle: "一起寫一首詩",
            chatToggleOpenLabel: "Open chat",
            chatToggleCloseLabel: "Close chat",
            chatInputPlaceholder: "寫下主題、心情或一個意象…",
            welcomeMessageText: "今天，想把哪個瞬間寫成詩？",
            chatDisclaimerText: "繁體中文新詩 · 讓文字變成街頭色彩",
          }}
          input={{ textArea: { "aria-label": "Message" } }}
          onError={(event) => { if ("error" in event) setError(event.error.message); }}
        />
        {error && <p className="copilot-error" role="alert">{error}</p>}
      </div>
    </PoemCollection.Provider>
  );
}

function PoemToolPreview({ args, toolCallId, status, result }: ComponentProps<ReactToolCallRenderer<Poem>["render"]>) {
  const poems = useContext(PoemCollection);
  const saved = poems.find((poem) => poem.id === toolCallId);
  const parsed = poemSchema.safeParse(args);
  const poem = saved ?? (parsed.success ? parsed.data : undefined);
  return (
    <div className="tool-preview">
      {poem ? <PoemCard poem={poem} showArtwork={false} /> : <p>正在構思你的新詩…</p>}
      {status === ToolCallStatus.Complete && result?.includes("not displayed") && <p role="alert">{result}</p>}
    </div>
  );
}
