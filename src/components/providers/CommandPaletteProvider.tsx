'use client';

import { createContext, useContext, useState, useCallback } from 'react';
import { CommandPalette } from '@/components/ui/CommandPalette';

interface CommandPaletteContextType {
  open: boolean;
  setOpen: (open: boolean) => void;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
}

const CommandPaletteContext = createContext<CommandPaletteContextType>({
  open: false,
  setOpen: () => {},
  openCommandPalette: () => {},
  closeCommandPalette: () => {},
});

export const useCommandPalette = () => useContext(CommandPaletteContext);

export function CommandPaletteProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  const openCommandPalette = useCallback(() => setOpen(true), []);
  const closeCommandPalette = useCallback(() => setOpen(false), []);

  return (
    <CommandPaletteContext.Provider value={{ open, setOpen, openCommandPalette, closeCommandPalette }}>
      {children}
      <CommandPalette open={open} onOpenChange={setOpen} />
    </CommandPaletteContext.Provider>
  );
}
