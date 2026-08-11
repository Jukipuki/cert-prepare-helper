import { z } from 'zod';

export const optionKeySchema = z.enum(['A', 'B', 'C', 'D', 'E']);

export const questionSchema = z
  .object({
    questionNumber: z.string().regex(/^[0-9]+\.[0-9]+$/, 'questionNumber must look like "1.1"'),
    domainNumber: z.number().int().min(1).max(8),
    domainName: z.string().min(1),
    domainWeight: z.number().gt(0).max(100),
    format: z.enum(['multiple_choice', 'multiple_response']),
    selectCount: z.number().int().min(1),
    questionText: z.string().trim().min(1),
    options: z
      .partialRecord(optionKeySchema, z.string().min(1))
      .refine((o) => Object.keys(o).length >= 2, {
        message: 'options must have at least two entries',
      }),
    correctAnswers: z.array(optionKeySchema).min(1),
    rationale: z.string().trim().min(1),
  })
  .strict()
  .superRefine((question, ctx) => {
    const uniqueAnswers = new Set(question.correctAnswers);
    if (uniqueAnswers.size !== question.correctAnswers.length) {
      ctx.addIssue({
        code: 'custom',
        message: `${question.questionNumber}: correctAnswers must be unique`,
        path: ['correctAnswers'],
      });
    }

    for (const key of question.correctAnswers) {
      if (!(key in question.options)) {
        ctx.addIssue({
          code: 'custom',
          message: `${question.questionNumber}: correctAnswers entry "${key}" is not present in options`,
          path: ['correctAnswers'],
        });
      }
    }

    if (question.selectCount !== question.correctAnswers.length) {
      ctx.addIssue({
        code: 'custom',
        message: `${question.questionNumber}: selectCount (${question.selectCount}) must equal correctAnswers.length (${question.correctAnswers.length})`,
        path: ['selectCount'],
      });
    }

    if (question.format === 'multiple_choice' && question.selectCount !== 1) {
      ctx.addIssue({
        code: 'custom',
        message: `${question.questionNumber}: multiple_choice questions must have selectCount === 1`,
        path: ['selectCount'],
      });
    }

    if (question.format === 'multiple_response' && question.selectCount < 2) {
      ctx.addIssue({
        code: 'custom',
        message: `${question.questionNumber}: multiple_response questions must have selectCount >= 2`,
        path: ['selectCount'],
      });
    }
  });

export const generatedBannerSchema = z.object({
  source: z.literal('sql/002_seed_ccdv_f_questions.sql'),
  command: z.literal('npm run generate:questions'),
  warning: z.literal(
    'GENERATED FILE — DO NOT EDIT. Edit the source seed migration and regenerate.',
  ),
});

export const questionSetFileSchema = z
  .object({
    _generated: generatedBannerSchema,
    examCode: z.string().min(1),
    questions: z.array(questionSchema).min(1),
  })
  .strict()
  .superRefine((file, ctx) => {
    const seen = new Set<string>();
    for (const question of file.questions) {
      if (seen.has(question.questionNumber)) {
        ctx.addIssue({
          code: 'custom',
          message: `Duplicate questionNumber: ${question.questionNumber}`,
          path: ['questions'],
        });
      }
      seen.add(question.questionNumber);
    }
  });

export type QuestionSetFile = z.infer<typeof questionSetFileSchema>;
