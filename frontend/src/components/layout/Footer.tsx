export function Footer() {
  return (
    <footer
      className="px-6 py-4"
      style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}
    >
      <div className="flex items-center justify-between text-xs text-slate-500">
        <p>&copy; {new Date().getFullYear()} Ministère de l'Éducation Nationale — Plateforme GED</p>
        <p className="text-slate-600">v1.0.0</p>
      </div>
    </footer>
  );
}
