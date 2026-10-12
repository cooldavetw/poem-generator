import { useEffect, useState } from "react";
import { Chat } from "./chat";
import { PoemCard } from "./poem-card";
import { getBackendStatus, type BackendStatus } from "./lib/backend";
import { addPoem, updatePoem, type Poem, type SavedPoem } from "./lib/poem";
import { requestIllustration } from "./lib/illustration";

export default function PoemApp() {
  const [status, setStatus] = useState<BackendStatus>("checking");
  const [poems, setPoems] = useState<SavedPoem[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => { void getBackendStatus().then(setStatus); }, []);

  function show(poem: Poem, id: string) {
    setPoems((previous) => addPoem(previous, poem, id, { painting: true }));
    setActiveIndex(0);
    void requestIllustration(poem).then((illustration) => {
      setPoems((previous) => updatePoem(previous, id, { illustration, painting: false }));
    });
  }

  const poem = poems[activeIndex];
  return (
    <>
      {status === "ready" && <Chat poems={poems} onPoem={show} />}
      <main className="studio" lang="zh-Hant">
        <header className="intro">
          <p className="eyebrow">WORDS BECOME WALLS</p>
          <h1>街角詩境<span>Street Poetry Studio</span></h1>
          <p>用新詩留住一個瞬間，讓街頭塗鴉為它添上色彩。</p>
        </header>
        {(status === "unconfigured" || status === "unavailable") && (
          <aside className="setup" role="status">
            <strong>詩境等待連線。</strong>
            {status === "unconfigured" ? (
              <p>請在後端環境設定 <code>OPENAI_API_KEY</code>（本機使用根目錄的 <code>.env.local</code>），重新啟動 FastAPI，再重新整理頁面。</p>
            ) : (
              <p>暫時無法連上創作服務。請啟動 FastAPI 後重新整理頁面。</p>
            )}
          </aside>
        )}
        <section className="poem-gallery" aria-label="詩作收藏" data-testid="poem-carousel">
          <div aria-live="polite">
            {poem ? <PoemCard poem={poem} /> : (
              <div className="empty-studio" data-testid="empty-studio">
                <p className="poem-label">你的第一面詩牆</p>
                <h2>從一個意象開始</h2>
                <p>寫下一個主題、一段心情，或一個街角的故事。</p>
                <p>完成第一首新詩後，這裡將出現專屬的街頭塗鴉。</p>
              </div>
            )}
          </div>
          {poems.length > 1 && (
            <nav className="carousel-controls" aria-label="瀏覽詩作">
              <button aria-label="上一首詩" disabled={activeIndex === 0} onClick={() => setActiveIndex(activeIndex - 1)}>← 上一首</button>
              <span>{activeIndex + 1} / {poems.length}</span>
              <button aria-label="下一首詩" disabled={activeIndex === poems.length - 1} onClick={() => setActiveIndex(activeIndex + 1)}>下一首 →</button>
            </nav>
          )}
        </section>
        <footer>繁體中文新詩 · 街頭塗鴉 · 每個瞬間都有自己的顏色</footer>
      </main>
    </>
  );
}
