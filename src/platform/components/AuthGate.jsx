// ── Plateforme — AuthGate (Phase 4) ────────────────────────────────────
//
// Gate de session : enveloppe l'app entière, n'affiche les routes qu'une
// fois le profil hydraté. 4 états visuels :
//   - "loading"          : spinner pendant le fetch initial
//   - "unauthenticated"  : écran Sign in with Google + message restriction
//   - "error"            : erreur de chargement, bouton retry
//   - "ready"            : enfants rendus
//
// La connexion Google ne marche que si l'URL courante est dans la liste
// Redirect URLs de Supabase (cf. dashboard Authentication > URL Config).
// En local sans Vercel, le bouton sign-in s'affiche mais redirect échoue.
// C'est attendu — la cutover passera par un déploiement Vercel Preview.

import { usePlatformData } from "../store/usePlatformData.js";

const ASSEMBLAGE_RED = "#E30513";
const ASSEMBLAGE_DARK = "#30323E";

export default function AuthGate({ children }) {
  const [, mutate, status, session] = usePlatformData();

  if (status === "loading") {
    return <FullScreen text="Chargement…" />;
  }

  if (status === "error") {
    return (
      <FullScreen>
        <p style={{ marginBottom: 16 }}>Erreur de chargement des données.</p>
        <button
          onClick={() => window.location.reload()}
          style={btnPrimaryStyle()}
        >
          Recharger
        </button>
      </FullScreen>
    );
  }

  if (status === "unauthenticated") {
    return <SignInScreen onSignIn={mutate.signInWithGoogle} />;
  }

  return (
    <>
      {children}
      <SignOutCorner session={session} onSignOut={mutate.signOut} />
    </>
  );
}

// ── Sous-composants ────────────────────────────────────────────────────

function FullScreen({ text, children }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#F2F2F2",
        fontFamily: "Open Sans, sans-serif",
        color: ASSEMBLAGE_DARK,
      }}
    >
      {text ? <p>{text}</p> : children}
    </div>
  );
}

function SignInScreen({ onSignIn }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#F2F2F2",
        fontFamily: "Open Sans, sans-serif",
        color: ASSEMBLAGE_DARK,
      }}
    >
      <div
        style={{
          background: "#fff",
          padding: "40px 48px",
          borderRadius: 8,
          borderTop: "4px solid " + ASSEMBLAGE_RED,
          boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
          maxWidth: 420,
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: 32,
            fontWeight: 800,
            color: ASSEMBLAGE_RED,
            marginBottom: 4,
            letterSpacing: -0.5,
          }}
        >
          .A
        </div>
        <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
          Plateforme Assemblage — DAO
        </h1>
        <p style={{ fontSize: 13, color: "#4D4D4D", marginBottom: 24, lineHeight: 1.5 }}>
          Outil interne réservé à l'équipe Assemblage Ingénierie. Connectez-vous
          avec votre compte Google <strong>@assemblage.net</strong>.
        </p>

        <button onClick={onSignIn} style={btnPrimaryStyle()}>
          <GoogleIcon />
          Se connecter avec Google
        </button>

        <p style={{ fontSize: 11, color: "#999", marginTop: 16, lineHeight: 1.4 }}>
          Les comptes hors <code>@assemblage.net</code> sont rejetés.
        </p>
      </div>
    </div>
  );
}

function SignOutCorner({ session, onSignOut }) {
  if (!session) return null;
  const email = session.user?.email || "";
  return (
    <div
      style={{
        position: "fixed",
        bottom: 12,
        right: 12,
        display: "flex",
        alignItems: "center",
        gap: 8,
        background: "rgba(48,50,62,0.92)",
        color: "#fff",
        padding: "6px 12px",
        borderRadius: 16,
        fontSize: 11,
        fontFamily: "Open Sans, sans-serif",
        boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
        zIndex: 9999,
      }}
    >
      <span style={{ opacity: 0.8 }}>{email}</span>
      <button
        onClick={onSignOut}
        style={{
          background: "transparent",
          border: "1px solid rgba(255,255,255,0.3)",
          color: "#fff",
          padding: "2px 8px",
          borderRadius: 10,
          fontSize: 10,
          cursor: "pointer",
        }}
        title="Déconnexion"
      >
        Sign out
      </button>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      width="18"
      height="18"
      style={{ marginRight: 8, verticalAlign: "middle" }}
    >
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303C33.972 32.91 29.418 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.94 11.94 0 0 1 24 36c-5.391 0-9.971-3.062-11.749-7.401l-6.522 5.025C9.014 39.556 15.989 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  );
}

function btnPrimaryStyle() {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#fff",
    color: "#3c4043",
    border: "1px solid #DFE4E8",
    padding: "10px 24px",
    borderRadius: 4,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "Open Sans, sans-serif",
    boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
  };
}
