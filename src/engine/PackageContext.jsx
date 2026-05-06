import { createContext, useContext } from "react";

export const PackageContext = createContext(null);

export function usePackage() {
  const pkg = useContext(PackageContext);
  if (!pkg) {
    throw new Error("usePackage() must be called inside a <PackageContext.Provider>.");
  }
  return pkg;
}
