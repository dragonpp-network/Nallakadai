import { createContext, useContext } from "react";

export type BranchOption = { id: string; name: string };

export type BranchScope = {
  /** "" means all branches. */
  branchId: string;
  setBranchId: (id: string) => void;
  branches: BranchOption[];
  isSuper: boolean;
};

export const BranchScopeContext = createContext<BranchScope>({
  branchId: "",
  setBranchId: () => {},
  branches: [],
  isSuper: false,
});

export function useBranchScope() {
  return useContext(BranchScopeContext);
}
