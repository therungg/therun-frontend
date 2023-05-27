export interface ScriptState {
    loading: boolean;
    error: Error | null;
}
declare const useScript: (src: string) => ScriptState;
export default useScript;
//# sourceMappingURL=useScript.d.ts.map