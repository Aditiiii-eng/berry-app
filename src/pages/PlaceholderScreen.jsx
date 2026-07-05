import React from "react";

export function PlaceholderScreen({ title }) {
  return (
    <div className="grid h-full place-items-center bg-white px-8 text-center">
      <div>
        <h2 className="text-2xl font-black text-slate-900">{title}</h2>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          New features are being prepared for this section.
        </p>
      </div>
    </div>
  );
}
