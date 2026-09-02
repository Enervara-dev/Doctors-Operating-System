"use client";

import { useEffect, useRef } from "react";
import { useConsultationStore } from "@/stores/consultation.store";

/**
 * Lets a step publish how to persist its own pending edits, so the always-visible
 * "Save draft" control and "Save & continue" can flush them without the shell
 * knowing anything about the step's form.
 */
export function useStepSaver(save: () => Promise<boolean>): void {
  const registerStepSaver = useConsultationStore((state) => state.registerStepSaver);
  const saveRef = useRef(save);

  useEffect(() => {
    saveRef.current = save;
  }, [save]);

  useEffect(() => {
    registerStepSaver(() => saveRef.current());
    return () => registerStepSaver(null);
  }, [registerStepSaver]);
}
