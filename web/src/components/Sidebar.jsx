import { sx, TURQ } from "../styles";
import { PRESETS } from "../presets";

export default function Sidebar({ mode, onSelect, onResetText }) {
  return (
    <aside style={sx.sidebar}>
      {Object.entries(PRESETS).map(([key, p]) => {
        const active = mode === key;
        return (
          <button
            type="button"
            key={key}
            aria-current={active ? "page" : undefined}
            onClick={() => { onSelect(key); onResetText(p.example || ""); }}
            style={{
              ...sx.sideItem,
              ...(active ? sx.sideItemActive : {}),
              display: "flex",
              alignItems: "center",
              gap: 10,
              position: "relative",
            }}
          >
            {active && (
              <span
                aria-hidden
                style={{
                  position: "absolute",
                  left: -10,
                  top: 8,
                  bottom: 8,
                  width: 4,
                  borderRadius: 6,
                  background: TURQ,
                  boxShadow: "0 4px 10px rgba(20,184,166,.4)",
                }}
              />
            )}
            <span style={{ fontSize: 18 }}>{p.emoji}</span>
            <span>{p.label}</span>
          </button>
        );
      })}
    </aside>
  );
}
