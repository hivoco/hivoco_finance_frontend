import { createContext, useContext } from "react"

// Where floating lists (the Base UI combobox behind LookupField) render.
// FormDialog provides its content element: Radix modal dialogs disable pointer
// events outside the dialog, so a list portaled to <body> can't be clicked.
// `undefined` (no provider) = document.body; `null` = wait until the dialog mounts.
export const PortalContainerContext = createContext<HTMLElement | null | undefined>(undefined)

export function usePortalContainer() {
  return useContext(PortalContainerContext)
}
