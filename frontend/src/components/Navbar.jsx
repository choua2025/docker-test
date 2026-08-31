/**
 * The top bar shown on every logged-in screen.
 *
 * Links are filtered by role, so a student never sees a teacher-only link.
 * On phones the links collapse behind a menu button.
 */
import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext.jsx";
import { t } from "../i18n/lo.js";
import { Logo } from "./ui.jsx";

// `roles: null` means "everyone who is logged in".
const LINKS = [
  { to: "/", label: t.nav.home, roles: null, end: true },
  { to: "/subjects", label: t.nav.subjects, roles: null },
  { to: "/lessons", label: t.nav.lessons, roles: null },
  { to: "/scores", label: t.nav.scores, roles: ["student"] },
  { to: "/users", label: t.nav.users, roles: ["admin"] },
];

/** The coloured initial standing in for a profile photo. */
function Avatar({ name }) {
  return (
    <span
      className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-100 font-serif text-sm font-semibold text-brand-800"
      aria-hidden="true"
    >
      {[...(name ?? "?").trim()][0]}
    </span>
  );
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  if (!user) return null;

  const links = LINKS.filter((link) => !link.roles || link.roles.includes(user.role));

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  // The active link gets a saffron underline rather than a filled pill: it
  // marks position without turning the bar into a row of buttons.
  const linkClass = ({ isActive }) =>
    `relative rounded-lg px-3 py-2 text-sm font-medium transition ${
      isActive
        ? "text-brand-800 after:absolute after:inset-x-3 after:-bottom-px after:h-0.5 after:rounded-full after:bg-saffron-500"
        : "text-paper-500 hover:bg-paper-100 hover:text-paper-900"
    }`;

  return (
    <header className="sticky top-0 z-20 border-b border-paper-200 bg-paper-50/85 backdrop-blur-md">
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link to="/" className="shrink-0">
          <Logo />
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.end} className={linkClass}>
              {link.label}
            </NavLink>
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <span className="flex items-center gap-2.5">
            <Avatar name={user.name} />
            <span className="text-sm leading-tight">
              <span className="block font-medium text-paper-900">{user.name}</span>
              <span className="block text-xs text-paper-500">{t.roles[user.role]}</span>
            </span>
          </span>
          <button
            onClick={handleLogout}
            className="rounded-lg px-3 py-2 text-sm font-medium text-paper-500 transition hover:bg-paper-100 hover:text-paper-900"
          >
            {t.nav.logout}
          </button>
        </div>

        <button
          className="rounded-lg border border-paper-200 bg-white px-3 py-2 text-sm md:hidden"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls="mobile-menu"
        >
          {t.nav.menu}
        </button>
      </nav>

      {open && (
        <div id="mobile-menu" className="border-t border-paper-200 bg-white px-4 py-4 md:hidden">
          <div className="mb-4 flex items-center gap-2.5">
            <Avatar name={user.name} />
            <span className="text-sm leading-tight">
              <span className="block font-medium text-paper-900">{user.name}</span>
              <span className="block text-xs text-paper-500">{t.roles[user.role]}</span>
            </span>
          </div>
          <div className="flex flex-col gap-1">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={linkClass}
                onClick={() => setOpen(false)}
              >
                {link.label}
              </NavLink>
            ))}
            <button
              onClick={handleLogout}
              className="mt-3 rounded-lg border border-paper-200 px-3 py-2.5 text-start text-sm font-medium text-paper-700"
            >
              {t.nav.logout}
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
