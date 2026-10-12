import type { SavedPoem } from "./lib/poem";

export function PoemCard({ poem, showArtwork = true }: { poem: Partial<SavedPoem>; showArtwork?: boolean }) {
  return (
    <article className="poem-card" data-testid="poem-card" lang="zh-Hant">
      <div className="poem-lines">
        {poem.title && <h2>{poem.title}</h2>}
        {poem.lines?.map((line, index) => <p key={index} data-testid="poem-line">{line}</p>)}
      </div>
      {showArtwork && (
        <div className="artwork-frame">
          {poem.illustration ? (
            <img className="artwork" data-testid="poem-illustration" src={poem.illustration}
              alt={`以〈${poem.title ?? "新詩"}〉為靈感的街頭塗鴉`} width={1536} height={1024} />
          ) : (
            <p className="artwork-status" role="status">
              {poem.painting ? "正在把詩的意象畫成街頭塗鴉…" : "這次未能完成塗鴉，詩作已保留。"}
            </p>
          )}
        </div>
      )}
    </article>
  );
}
