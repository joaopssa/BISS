"use client";

import * as React from "react";

type Props = {
  text: string;
};

export default function EmptyState({ text }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center text-gray-500">
      <p className="text-sm">{text}</p>
    </div>
  );
}
