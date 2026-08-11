import { grade, isComplete } from '@/domain/grading';
import type { Mode, OptionKey, Question, QuestionSet, Response, Session } from '@/domain/types';

export const EXAM_DURATION_MS = 120 * 60_000;

/** Presentation order. Identity today; the single place a shuffle would later be introduced. */
export function buildOrder(set: QuestionSet): string[] {
  return set.questions.map((q) => q.questionNumber);
}

export function createInitialSession(): Session {
  return {
    mode: 'zen',
    order: [],
    currentIndex: 0,
    furthestIndex: 0,
    responses: new Map(),
    status: 'choosing',
    deadline: null,
    submittedAt: null,
  };
}

export type SessionAction =
  | { type: 'CHOOSE_MODE'; mode: Mode; set: QuestionSet; now: number }
  | { type: 'SELECT'; question: Question; selected: OptionKey[] }
  | { type: 'GRADE_ZEN'; question: Question; now: number }
  | { type: 'STEP_BACK' }
  | { type: 'STEP_FORWARD' }
  | { type: 'JUMP_TO'; index: number }
  | { type: 'SUBMIT_EXAM'; set: QuestionSet; now: number }
  | { type: 'EXPIRE_EXAM'; set: QuestionSet; now: number }
  | { type: 'RESET' };

function withResponse(
  session: Session,
  questionNumber: string,
  updater: (response: Response) => Response,
): Session {
  const existing: Response = session.responses.get(questionNumber) ?? {
    questionNumber,
    selected: [],
    isComplete: false,
    isCorrect: null,
    gradedAt: null,
  };
  const responses = new Map(session.responses);
  responses.set(questionNumber, updater(existing));
  return { ...session, responses };
}

function gradeAllForSubmission(session: Session, set: QuestionSet, now: number): Session {
  const responses = new Map(session.responses);
  for (const question of set.questions) {
    const existing = responses.get(question.questionNumber) ?? {
      questionNumber: question.questionNumber,
      selected: [],
      isComplete: false,
      isCorrect: null,
      gradedAt: null,
    };
    responses.set(question.questionNumber, {
      ...existing,
      isComplete: isComplete(question, existing.selected),
      isCorrect: existing.selected.length > 0 ? grade(question, existing.selected) : false,
      gradedAt: now,
    });
  }
  return { ...session, responses };
}

export function sessionReducer(state: Session, action: SessionAction): Session {
  switch (action.type) {
    case 'CHOOSE_MODE': {
      if (state.status !== 'choosing') return state;
      return {
        mode: action.mode,
        order: buildOrder(action.set),
        currentIndex: 0,
        furthestIndex: 0,
        responses: new Map(),
        status: 'inProgress',
        deadline: action.mode === 'exam' ? action.now + EXAM_DURATION_MS : null,
        submittedAt: null,
      };
    }

    case 'SELECT': {
      if (state.status !== 'inProgress') return state;
      if (state.mode === 'zen') {
        const existing = state.responses.get(action.question.questionNumber);
        if (existing && existing.gradedAt !== null) return state; // locked once graded
      }
      return withResponse(state, action.question.questionNumber, (r) => ({
        ...r,
        selected: action.selected,
        isComplete: isComplete(action.question, action.selected),
      }));
    }

    case 'GRADE_ZEN': {
      if (state.status !== 'inProgress' || state.mode !== 'zen') return state;
      const questionNumber = action.question.questionNumber;
      const existing = state.responses.get(questionNumber);
      if (!existing || existing.gradedAt !== null) return state; // double-grade rejected
      if (!isComplete(action.question, existing.selected)) return state; // wrong select count

      const graded = withResponse(state, questionNumber, (r) => ({
        ...r,
        isCorrect: grade(action.question, r.selected),
        gradedAt: action.now,
      }));

      const indexInOrder = state.order.indexOf(questionNumber);
      const isLastQuestion = indexInOrder === state.order.length - 1;
      const isFrontier = state.currentIndex === state.furthestIndex;

      return {
        ...graded,
        furthestIndex: isFrontier
          ? Math.min(state.furthestIndex + 1, state.order.length - 1)
          : state.furthestIndex,
        status: isLastQuestion ? 'submitted' : graded.status,
        submittedAt: isLastQuestion ? action.now : graded.submittedAt,
      };
    }

    case 'STEP_BACK': {
      if (state.status !== 'inProgress') return state;
      return { ...state, currentIndex: Math.max(state.currentIndex - 1, 0) };
    }

    case 'STEP_FORWARD': {
      if (state.status !== 'inProgress') return state;
      return { ...state, currentIndex: Math.min(state.currentIndex + 1, state.furthestIndex) };
    }

    case 'JUMP_TO': {
      if (state.status !== 'inProgress' || state.mode !== 'exam') return state;
      if (action.index < 0 || action.index >= state.order.length) return state;
      return {
        ...state,
        currentIndex: action.index,
        furthestIndex: Math.max(state.furthestIndex, action.index),
      };
    }

    case 'SUBMIT_EXAM': {
      if (state.status !== 'inProgress' || state.mode !== 'exam') return state;
      const graded = gradeAllForSubmission(state, action.set, action.now);
      return { ...graded, status: 'submitted', submittedAt: action.now };
    }

    case 'EXPIRE_EXAM': {
      if (state.status !== 'inProgress' || state.mode !== 'exam') return state;
      const graded = gradeAllForSubmission(state, action.set, action.now);
      return { ...graded, status: 'expired', submittedAt: action.now };
    }

    case 'RESET': {
      return createInitialSession();
    }

    default:
      return state;
  }
}
