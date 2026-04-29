"use client";

import React from "react";

// Auth guard is handled by AtlaAuthProvider in the layout.
// Kept as pass-through so existing call-sites compile without changes.
type Props = { children: React.ReactNode };

export const SecureProvider = ({ children }: Props) => <>{children}</>;
