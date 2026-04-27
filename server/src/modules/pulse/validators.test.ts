import { pulseSurveySchema, pulseResponseSchema, recognitionSchema } from './validators';

describe('pulse validators', () => {
  describe('pulseSurveySchema', () => {
    const validPayload = {
      title: 'Monthly Pulse Check',
      questions: ['How satisfied are you with your work?', 'Rate your team collaboration.'],
    };

    it('accepts a valid pulse survey payload', () => {
      const result = pulseSurveySchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it('defaults active to true', () => {
      const parsed = pulseSurveySchema.parse(validPayload);
      expect(parsed.active).toBe(true);
    });

    it('accepts active: false', () => {
      const parsed = pulseSurveySchema.parse({ ...validPayload, active: false });
      expect(parsed.active).toBe(false);
    });

    it('rejects a title shorter than 3 characters', () => {
      const result = pulseSurveySchema.safeParse({ ...validPayload, title: 'Hi' });
      expect(result.success).toBe(false);
    });

    it('rejects an empty questions array', () => {
      const result = pulseSurveySchema.safeParse({ ...validPayload, questions: [] });
      expect(result.success).toBe(false);
    });

    it('rejects a question shorter than 3 characters', () => {
      const result = pulseSurveySchema.safeParse({ ...validPayload, questions: ['OK'] });
      expect(result.success).toBe(false);
    });

    it('accepts a single-question survey', () => {
      const result = pulseSurveySchema.safeParse({ ...validPayload, questions: ['How are you doing today?'] });
      expect(result.success).toBe(true);
    });
  });

  describe('pulseResponseSchema', () => {
    const validResponse = {
      surveyId: 'survey-001',
      answers: [
        { question: 'How satisfied are you?', rating: 4 },
        { question: 'Rate team collaboration.', rating: 5, comment: 'Great teamwork!' },
      ],
    };

    it('accepts a valid pulse response', () => {
      const result = pulseResponseSchema.safeParse(validResponse);
      expect(result.success).toBe(true);
    });

    it('rejects an empty answers array', () => {
      const result = pulseResponseSchema.safeParse({ ...validResponse, answers: [] });
      expect(result.success).toBe(false);
    });

    it('rejects a rating below 1', () => {
      const result = pulseResponseSchema.safeParse({
        ...validResponse,
        answers: [{ question: 'How satisfied are you?', rating: 0 }],
      });
      expect(result.success).toBe(false);
    });

    it('rejects a rating above 5', () => {
      const result = pulseResponseSchema.safeParse({
        ...validResponse,
        answers: [{ question: 'How satisfied are you?', rating: 6 }],
      });
      expect(result.success).toBe(false);
    });

    it('accepts an answer without a comment (comment is optional)', () => {
      const result = pulseResponseSchema.safeParse({
        surveyId: 'survey-001',
        answers: [{ question: 'How satisfied are you?', rating: 3 }],
      });
      expect(result.success).toBe(true);
    });

    it('rejects a question shorter than 3 characters in an answer', () => {
      const result = pulseResponseSchema.safeParse({
        surveyId: 'survey-001',
        answers: [{ question: 'Hi', rating: 3 }],
      });
      expect(result.success).toBe(false);
    });

    it('rejects a missing surveyId', () => {
      const { surveyId: _, ...rest } = validResponse;
      const result = pulseResponseSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });
  });

  describe('recognitionSchema', () => {
    const validRecognition = {
      fromEmployeeId: 'emp-001',
      toEmployeeId: 'emp-002',
      message: 'Great work on the project delivery!',
      badge: 'star',
    };

    it('accepts a valid recognition payload', () => {
      const result = recognitionSchema.safeParse(validRecognition);
      expect(result.success).toBe(true);
    });

    it('rejects a message shorter than 5 characters', () => {
      const result = recognitionSchema.safeParse({ ...validRecognition, message: 'Good' });
      expect(result.success).toBe(false);
    });

    it('rejects a badge shorter than 2 characters', () => {
      const result = recognitionSchema.safeParse({ ...validRecognition, badge: 'x' });
      expect(result.success).toBe(false);
    });

    it('rejects a missing fromEmployeeId', () => {
      const { fromEmployeeId: _, ...rest } = validRecognition;
      const result = recognitionSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });

    it('rejects a missing toEmployeeId', () => {
      const { toEmployeeId: _, ...rest } = validRecognition;
      const result = recognitionSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });
  });
});
