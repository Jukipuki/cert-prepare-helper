'use client';

import { useReducer, type Dispatch } from 'react';
import { createInitialSession, sessionReducer, type SessionAction } from '@/domain/session';
import type { Mode, QuestionSet, Session } from '@/domain/types';

/**
 * Binds the reducer to a concrete question set and mode, which the caller already knows by the
 * time it mounts (the mode is chosen on "/" before navigating here). The CHOOSE_MODE transition
 * runs synchronously in the lazy initializer, so the session starts `inProgress` on first render —
 * no transient "choosing" render and no dispatch-in-effect.
 */
export function useSession(mode: Mode, set: QuestionSet): [Session, Dispatch<SessionAction>] {
  return useReducer(sessionReducer, { mode, set }, (init) =>
    sessionReducer(createInitialSession(), {
      type: 'CHOOSE_MODE',
      mode: init.mode,
      set: init.set,
      now: Date.now(),
    }),
  );
}
