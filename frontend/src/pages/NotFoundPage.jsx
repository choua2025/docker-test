import { Link } from "react-router-dom";

import { t } from "../i18n/lo.js";

export default function NotFoundPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <p className="text-5xl font-bold text-brand-700">404</p>
      <h1 className="mt-4 text-xl font-semibold text-paper-900">{t.notFound.title}</h1>
      <p className="mt-2 text-paper-500">{t.notFound.description}</p>
      <Link
        to="/"
        className="mt-6 inline-block rounded-lg bg-brand-700 px-4 py-2.5 font-medium text-white hover:bg-brand-800"
      >
        {t.notFound.back}
      </Link>
    </div>
  );
}
