import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePackage } from "../PackageContext.jsx";
import { useProjectList } from "../projects/useProject.js";
import {
  createProject,
  deleteProject,
  duplicateProject,
  renameProject,
} from "../projects/projectStore.js";
import NewProjectModal from "./NewProjectModal.jsx";

// Home page: lists the user's projects with quick actions. The "Ouvrir"
// click lands on /projects/:id where <Editor/> takes over. Newly created
// projects are auto-opened.
//
// `defaultsFromPack` is supplied by App.jsx so this component itself stays
// pack-shape-agnostic — it doesn't know which fields a project's `data`
// is supposed to carry, just that the caller can produce a valid initial
// data blob for the active pack.
export default function ProjectList({ defaultsFromPack }) {
  const { labels, schemaVersion, language } = usePackage();
  const navigate = useNavigate();
  const projects = useProjectList();
  const [modalOpen, setModalOpen] = useState(false);

  const sorted = [...projects].sort((a, b) =>
    (b.updatedAt || "").localeCompare(a.updatedAt || ""),
  );

  const handleCreate = ({ name }) => {
    // Seed formData.nom_projet with the card label so the user lands on
    // the editor with their project name already filled in (the most
    // visible "Nom du Projet" field in the form). They can still edit
    // either the card label or the form field independently afterwards.
    const initial = defaultsFromPack();
    initial.formData = { ...(initial.formData || {}), nom_projet: name };
    const proj = createProject(
      { name, schemaVersion, language },
      initial,
    );
    setModalOpen(false);
    navigate(`/projects/${proj.id}`);
  };

  const handleOpen = (id) => navigate(`/projects/${id}`);

  const handleDuplicate = (project) => {
    const copy = duplicateProject(
      project.id,
      `${project.name}${labels.projectList.duplicateSuffix}`,
    );
    if (copy) navigate(`/projects/${copy.id}`);
  };

  const handleDelete = (project) => {
    const msg = labels.projectList.confirmDelete.replace("{name}", project.name);
    if (window.confirm(msg)) deleteProject(project.id);
  };

  const handleRename = (project) => {
    const next = window.prompt(labels.projectList.confirmRename, project.name);
    if (next && next.trim() && next.trim() !== project.name) {
      renameProject(project.id, next.trim());
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#F2F2F2",
        fontFamily: "Open Sans, sans-serif",
        padding: "32px 24px",
      }}
    >
      <div style={{ maxWidth: 920, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", marginBottom: 28, gap: 16 }}>
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#30323E" }}>
              {labels.projectList.title}
            </h1>
            <div style={{ fontSize: 12, color: "#777", marginTop: 4 }}>
              {labels.projectList.subtitle
                .replace("{n}", projects.length)
                .replace("{plural}", projects.length > 1 ? "s" : "")}
            </div>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            style={{
              padding: "10px 18px",
              background: "#E30513",
              color: "#fff",
              border: "none",
              borderRadius: 5,
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
              fontFamily: "Open Sans, sans-serif",
            }}
          >
            {labels.projectList.newProjectButton}
          </button>
        </div>

        {/* Empty state */}
        {projects.length === 0 ? (
          <div
            style={{
              padding: "48px 24px",
              background: "#fff",
              border: "1px dashed #DFE4E8",
              borderRadius: 8,
              textAlign: "center",
              color: "#777",
              fontSize: 14,
            }}
          >
            {labels.projectList.empty}
          </div>
        ) : (
          // Project cards
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {sorted.map((p) => (
              <ProjectCard
                key={p.id}
                project={p}
                labels={labels.projectList}
                onOpen={() => handleOpen(p.id)}
                onDuplicate={() => handleDuplicate(p)}
                onDelete={() => handleDelete(p)}
                onRename={() => handleRename(p)}
              />
            ))}
          </div>
        )}
      </div>

      {modalOpen && (
        <NewProjectModal
          onCancel={() => setModalOpen(false)}
          onCreate={handleCreate}
        />
      )}
    </div>
  );
}

function ProjectCard({ project, labels, onOpen, onDuplicate, onDelete, onRename }) {
  const updatedAt = project.updatedAt
    ? new Date(project.updatedAt).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";
  const meta = labels.languageLabel
    .replace("{language}", (project.language || "").toUpperCase())
    .replace("{schemaVersion}", project.schemaVersion || "");
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #DFE4E8",
        borderRadius: 8,
        padding: "14px 18px",
        display: "flex",
        alignItems: "center",
        gap: 14,
      }}
    >
      <div
        onClick={onOpen}
        style={{ flex: 1, cursor: "pointer", minWidth: 0 }}
        title={project.name || labels.untitled}
      >
        <div
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: "#30323E",
            // Allow up to 2 lines, then ellipsis. -webkit-line-clamp is
            // supported on every modern browser; the standard property
            // `lineClamp` ships unprefixed in 2024+ but webkit version is
            // still the safe one.
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            wordBreak: "break-word",
            lineHeight: 1.3,
          }}
        >
          {project.name || labels.untitled}
        </div>
        <div style={{ fontSize: 11, color: "#777", marginTop: 4 }}>
          {meta} · {labels.lastModified.replace("{date}", updatedAt)}
        </div>
      </div>

      <button
        onClick={onOpen}
        style={{
          padding: "6px 14px",
          background: "#1565C0",
          color: "#fff",
          border: "none",
          borderRadius: 4,
          fontSize: 12,
          fontWeight: 700,
          cursor: "pointer",
          fontFamily: "Open Sans, sans-serif",
        }}
      >
        {labels.openButton}
      </button>
      <SecondaryButton onClick={onRename} label={labels.renameButton} />
      <SecondaryButton onClick={onDuplicate} label={labels.duplicateButton} />
      <SecondaryButton
        onClick={onDelete}
        label={labels.deleteButton}
        danger
      />
    </div>
  );
}

function SecondaryButton({ onClick, label, danger = false }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "6px 12px",
        background: "transparent",
        color: danger ? "#E30513" : "#4D4D4D",
        border: `1px solid ${danger ? "#E30513" : "#DFE4E8"}`,
        borderRadius: 4,
        fontSize: 12,
        cursor: "pointer",
        fontFamily: "Open Sans, sans-serif",
      }}
    >
      {label}
    </button>
  );
}
