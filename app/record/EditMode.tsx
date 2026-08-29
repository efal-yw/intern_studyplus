"use client"
import { createContext, useContext, useState, type ReactNode } from "react";

type EditModeContextValue = {
  isEditing: boolean;
  toggleEditing: () => void;
};

const EditModeContext = createContext<EditModeContextValue | null>(null);

export function EditModeProvider({ children }: { children: ReactNode }) {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <EditModeContext.Provider value={{ isEditing, toggleEditing: () => setIsEditing((prev) => !prev) }}>
      {children}
    </EditModeContext.Provider>
  );
}

function useEditMode() {
  const context = useContext(EditModeContext);
  if (!context) {
    throw new Error("useEditMode must be used within EditModeProvider");
  }
  return context;
}

export function EditToggleButton() {
  const { isEditing, toggleEditing } = useEditMode();
  return (
    <button type="button" onClick={toggleEditing}>
      {isEditing ? "完了" : "編集"}
    </button>
  );
}

export function EditModeVisible({ children }: { children: ReactNode }) {
  const { isEditing } = useEditMode();
  if (!isEditing) {
    return null;
  }
  return <>{children}</>;
}
