import React from "react";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import clsx from "clsx";

// ─── Spinner ─────────────────────────────────────────────────────────────────
export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={clsx("animate-spin", className ?? "w-5 h-5")} />;
}

// ─── Error alert ─────────────────────────────────────────────────────────────
export function ErrorAlert({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
      <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
      <p className="text-sm text-red-700">{message}</p>
    </div>
  );
}

// ─── Success alert ────────────────────────────────────────────────────────────
export function SuccessAlert({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
      <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
      <p className="text-sm text-green-700">{message}</p>
    </div>
  );
}

// ─── Page header ─────────────────────────────────────────────────────────────
export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between mb-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

// ─── Color badge ─────────────────────────────────────────────────────────────
export function ColorBadge({ color, name }: { color: string; name: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
      style={{
        backgroundColor: `${color}22`,
        color: color,
        border: `1px solid ${color}44`,
      }}
    >
      <span
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: color }}
      />
      {name}
    </span>
  );
}

// ─── Empty state ─────────────────────────────────────────────────────────────
export function EmptyState({
  message,
  icon: Icon,
}: {
  message: string;
  icon?: React.ElementType;
}) {
  return (
    <div className="text-center py-16">
      {Icon && <Icon className="w-12 h-12 text-gray-300 mx-auto mb-4" />}
      <p className="text-gray-500 text-sm">{message}</p>
    </div>
  );
}

// ─── Badge ───────────────────────────────────────────────────────────────────
export function Badge({
  children,
  variant = "default",
}: {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "error";
}) {
  const variants = {
    default: "bg-gray-100 text-gray-700",
    success: "bg-green-100 text-green-700",
    warning: "bg-yellow-100 text-yellow-700",
    error: "bg-red-100 text-red-700",
  };
  return (
    <span
      className={clsx(
        "px-2 py-0.5 rounded-full text-xs font-medium",
        variants[variant],
      )}
    >
      {children}
    </span>
  );
}

// ─── Confirm dialog ───────────────────────────────────────────────────────────
export function ConfirmDialog({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  isLoading,
}: {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-600 mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="btn-secondary"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="btn-danger"
            disabled={isLoading}
          >
            {isLoading ? <Spinner className="w-4 h-4" /> : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
