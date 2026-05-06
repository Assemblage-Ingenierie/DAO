import { usePackage } from "../PackageContext.jsx";

export default function ActorTag({ actor, onRemove }) {
  const { labels, tpl } = usePackage();
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "2px 8px",
        borderRadius: 12,
        fontSize: 11,
        fontWeight: 700,
        background: actor.bgColor,
        color: actor.color,
        border: `1px solid ${actor.borderColor}`,
        whiteSpace: "nowrap",
      }}
    >
      {actor.label}
      {onRemove && (
        <button
          onClick={onRemove}
          style={{
            background: "none",
            border: "none",
            padding: 0,
            marginLeft: 2,
            cursor: "pointer",
            color: actor.color,
            lineHeight: 1,
            fontSize: 13,
            opacity: 0.7,
          }}
          title={tpl(labels.actorTag.removeTooltip, { label: actor.label })}
        >
          ×
        </button>
      )}
    </span>
  );
}
