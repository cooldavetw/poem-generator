import { createContext, useContext, useMemo, useRef, useState, type ComponentProps } from "react";
import { HttpAgent } from "@ag-ui/client";
import { CopilotKitProvider, CopilotSidebar, ToolCallStatus, useConfigureSuggestions, useFrontendTool, type ReactToolCallRenderer } from "@copilotkit/react-core/v2";
import { createHaikuHandler, HAIKU_TOOL, HAIKU_TOOL_DESCRIPTION } from "./lib/agent";
import { backendUrl } from "./lib/backend";
import { haikuSchema, type Haiku, type SavedHaiku } from "./lib/haiku";
import { HaikuCard } from "./haiku-card";

const suggestions = [
  { title: "Nature", message: "Write me a haiku about nature." },
  { title: "Ocean", message: "Create a haiku about the ocean." },
  { title: "Spring", message: "Generate a haiku about spring." },
];

const HaikuCollection = createContext<SavedHaiku[]>([]);

type ChatProps = {
  haikus: SavedHaiku[];
  onHaiku: (haiku: Haiku, toolCallId: string) => void;
};

export function Chat({ haikus, onHaiku }: ChatProps) {
  const [agents] = useState(() => ({ default: new HttpAgent({ url: backendUrl("agent") }) }));
  return (
    <CopilotKitProvider agents__unsafe_dev_only={agents} enableInspector={false} showIntelligenceIndicator={false}>
      <HaikuCopilot haikus={haikus} onHaiku={onHaiku} />
    </CopilotKitProvider>
  );
}

function HaikuCopilot({ haikus, onHaiku }: ChatProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  const latest = useRef(onHaiku);
  latest.current = onHaiku;
  const handler = useMemo(() => createHaikuHandler((haiku, id) => latest.current(haiku, id)), []);

  useConfigureSuggestions({ suggestions, available: "before-first-message" }, []);
  useFrontendTool({
    name: HAIKU_TOOL,
    description: HAIKU_TOOL_DESCRIPTION,
    parameters: haikuSchema,
    // Displaying a poem completes the action; a second model run is unnecessary.
    followUp: false,
    handler: async (args, { toolCall }) => {
      setError(undefined);
      return handler(args, toolCall.id);
    },
    render: HaikuToolPreview,
  }, []);

  return (
    <HaikuCollection.Provider value={haikus}>
      <div className="haiku-copilot" data-open={open}>
        <CopilotSidebar
          open={open}
          onOpenChange={setOpen}
          width="min(420px, 100vw)"
          labels={{
            modalHeaderTitle: "Your haiku companion",
            chatToggleOpenLabel: "Open chat",
            chatToggleCloseLabel: "Close chat",
            chatInputPlaceholder: "Choose a subject for your haiku…",
            welcomeMessageText: "What moment would you like to capture in a haiku?",
            chatDisclaimerText: "Japanese verse · English translations",
          }}
          input={{ textArea: { "aria-label": "Message" } }}
          onError={(event) => { if ("error" in event) setError(event.error.message); }}
        />
        {error && <p className="copilot-error" role="alert">{error}</p>}
      </div>
    </HaikuCollection.Provider>
  );
}

function HaikuToolPreview({ args, toolCallId, status, result }: ComponentProps<ReactToolCallRenderer<Haiku>["render"]>) {
  const haikus = useContext(HaikuCollection);
  const saved = haikus.find((haiku) => haiku.id === toolCallId);
  const parsed = haikuSchema.safeParse(args);
  const haiku = saved ?? (parsed.success ? parsed.data : undefined);
  return (
    <div className="tool-preview">
      {haiku ? <HaikuCard haiku={haiku} /> : <p>Composing your haiku…</p>}
      {status === ToolCallStatus.Complete && result?.includes("not displayed") && <p role="alert">{result}</p>}
    </div>
  );
}
