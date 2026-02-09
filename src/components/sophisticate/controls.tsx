"use client";

import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";

import { ui } from "./ui";

export type ButtonVariant = "ghost" | "primary" | "danger" | "chip" | "chipActive";
export type ButtonSize = "sm" | "md" | "lg";

const sizeClass: Record<ButtonSize, string> = {
  sm: "px-2.5 py-1.5 text-sm",
  md: "px-3.5 py-2 text-sm",
  lg: "px-6 py-4.5 text-xl",
};

const variantClass: Record<ButtonVariant, string> = {
  ghost: ui.buttonGhost,
  primary: ui.buttonPrimary,
  danger: ui.buttonDanger,
  chip: ui.chip,
  chipActive: ui.chipActive,
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function getButtonClass(variant: ButtonVariant = "ghost", size: ButtonSize = "md", className = "") {
  return `${sizeClass[size]} ${variantClass[variant]} ${className}`.trim();
}

export function Button({ variant = "ghost", size = "md", className = "", ...props }: ButtonProps) {
  return <button {...props} className={getButtonClass(variant, size, className)} />;
}

type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input({ className = "", ...props }: InputProps) {
  return <input {...props} className={`soph-input ${ui.controlBase} ${className}`.trim()} />;
}

type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

export function Select({ className = "", ...props }: SelectProps) {
  return <select {...props} className={`${ui.controlBase} ${className}`.trim()} />;
}

export function FieldLabel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`${ui.label} ${className}`.trim()}>{children}</div>;
}
