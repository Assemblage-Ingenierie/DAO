const SPECIAL_TYPES = [
  "personnel_table",
  "materiel_table",
  "proposition_list",
  "articles_table",
  "enjeux_list",
  "bullet_list",
];

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

export function isFilled(value) {
  if (value === undefined || value === null) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "string") return value.trim().length > 0;
  return Boolean(value);
}

export function getFieldStatus(field, value, actorAssignment, fieldComment, formData) {
  if (field.type === "readonly") return "readonly";
  if (SPECIAL_TYPES.includes(field.type)) return "filled";

  // lockedIf: champ pré-rempli automatiquement par une condition externe
  if (field.lockedIf && formData) {
    const [k, v] = (field.lockedIf.condition || "").split("=");
    if (formData[k] === v) return "filled";
  }
  // naToggle: utilisateur a marqué "Non applicable" → décidé = rempli
  if (field.naToggle && formData?.[`${field.id}_na`] === true) return "filled";

  let valueIsValid;
  if (field.type === "date") valueIsValid = DATE_RE.test(value || "");
  else if (field.type === "time") valueIsValid = TIME_RE.test(value || "");
  else valueIsValid = isFilled(value);

  if (valueIsValid) return "filled";

  const hasActor = Array.isArray(actorAssignment) && actorAssignment.length > 0;
  const hasComment = typeof fieldComment === "string" && fieldComment.trim().length > 0;
  if (hasActor || hasComment) return "delegated";

  return "unfilled";
}
