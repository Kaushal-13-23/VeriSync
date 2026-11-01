import { Test, TestingModule } from '@nestjs/testing';
import { CandidatePortalService } from './candidate-portal.service';
import { PrismaService } from '../common/prisma.service';
import { AssessmentStatus, AccountStatus, NavigationMode } from '@verisync/shared';
import { Decimal } from '@prisma/client/runtime/library';

describe('CandidatePortalService & TC09 Answer Key Protection (FR-UI-001, TC09, BR-009)', () => {
  let service: CandidatePortalService;

  const mockCandidateUser = {
    id: 'usr_cand_tc09',
    username: 'candidate.tc09',
    accountStatus: AccountStatus.ACTIVE,
  };

  const mockCandidateProfile = {
    id: 'cp_cand_tc09',
    candidateIdentifier: 'CAN-2026-TC09',
    userId: mockCandidateUser.id,
    fullName: 'Test Candidate',
    email: 'cand.tc09@example.com',
    institution: 'University',
    qualification: 'B.Tech',
    graduationYear: 2026,
    recruitmentReference: 'REF-TC09',
    user: mockCandidateUser,
  };

  const now = new Date();
  const startAt = new Date(now.getTime() - 3600000); // 1 hr ago
  const endAt = new Date(now.getTime() + 7200000); // 2 hrs in future

  const mockAssessment = {
    id: 'asmt_tc09_1',
    title: 'Secure Assessment Round 1',
    description: 'Testing candidate portal assigned list',
    instructions: 'Complete sequential questions',
    roleCategory: 'Software Engineer',
    overallDuration: 60,
    totalMarks: new Decimal(100),
    startAt,
    endAt,
    status: AssessmentStatus.ACTIVE,
    attemptLimit: 1,
    navigationMode: NavigationMode.SEQUENTIAL,
    publishedSnapshot: {
      publishedAt: startAt.toISOString(),
      configurationVersion: 1,
      questions: [
        {
          questionId: 'q_secret_1',
          questionText: 'Which data structure has O(1) amortized insertion?',
          options: [
            { id: 'opt_1', optionText: 'Dynamic Array', isCorrect: true },
            { id: 'opt_2', optionText: 'Singly Linked List', isCorrect: false },
          ],
          testCases: [
            { inputData: 'sample', expectedOutput: 'sample_output', visibility: 'SAMPLE' },
            {
              inputData: 'secret_hidden_input',
              expectedOutput: 'secret_hidden_output',
              visibility: 'HIDDEN',
            },
          ],
        },
      ],
    },
  };

  const mockAssignment = {
    id: 'asg_tc09_1',
    assessmentId: mockAssessment.id,
    candidateId: mockCandidateProfile.id,
    assignmentStatus: 'ASSIGNED',
    assessment: mockAssessment,
    sessions: [], // 0 attempts used
  };

  beforeEach(async () => {
    const prismaMock: any = {
      candidateProfile: {
        findUnique: jest.fn().mockImplementation(({ where }: any) => {
          if (where.userId === mockCandidateUser.id) {
            return Promise.resolve({ ...mockCandidateProfile });
          }
          return Promise.resolve(null);
        }),
      },
      assessmentAssignment: {
        findMany: jest.fn().mockImplementation(() => {
          return Promise.resolve([{ ...mockAssignment }]);
        }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CandidatePortalService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<CandidatePortalService>(CandidatePortalService);
  });

  it('returns assigned assessment with eligibility and status (FR-UI-001, UC-08)', async () => {
    const assessments = await service.getAssignedAssessments(mockCandidateUser.id);

    expect(assessments.length).toBe(1);
    const asmt = assessments[0];
    expect(asmt.assessmentId).toBe(mockAssessment.id);
    expect(asmt.title).toBe(mockAssessment.title);
    expect(asmt.isEligible).toBe(true);
    expect(asmt.attemptLimit).toBe(1);
    expect(asmt.attemptsUsed).toBe(0);
    expect(asmt.attemptsRemaining).toBe(1);
    expect(asmt.navigationMode).toBe(NavigationMode.SEQUENTIAL);
    expect(asmt.serverTime).toBeDefined();
  });

  /**
   * Non-Negotiable Verification: TC-09 Answer-key exposure test (SRS Section 13.2 TC-09, Rule 2, BR-009)
   * "TC-09 Answer-key exposure: Inspect every candidate API response for a published MCQ.
   * No correct-answer field anywhere."
   */
  it('TC09: strictly guarantees zero answer keys, correct answer indicators, or hidden test cases in candidate response', async () => {
    const assessments = await service.getAssignedAssessments(mockCandidateUser.id);

    // Deep serialize response to inspect every nested key and value
    const serializedJson = JSON.stringify(assessments);

    // Verify forbidden attributes NEVER appear in the candidate API payload
    expect(serializedJson).not.toContain('isCorrect');
    expect(serializedJson).not.toContain('is_correct');
    expect(serializedJson).not.toContain('correctAnswer');
    expect(serializedJson).not.toContain('correct_answer');
    expect(serializedJson).not.toContain('answerKey');
    expect(serializedJson).not.toContain('answer_key');
    expect(serializedJson).not.toContain('secret_hidden');
    expect(serializedJson).not.toContain('confidential');
    expect(serializedJson).not.toContain('expectedOutput');
    expect(serializedJson).not.toContain('expected_output');

    // Verify object structure matches CandidateAssignedAssessmentDto
    const asmt = assessments[0];
    expect(asmt).not.toHaveProperty('publishedSnapshot');
    expect(asmt).not.toHaveProperty('questions');
  });

  it('marks assessment ineligible when availability window is closed or attempt limit reached', async () => {
    // 1. Exhaust attempts
    mockAssignment.sessions = [{ id: 'sess_1', sessionStatus: 'SUBMITTED' }] as any;
    const assessments = await service.getAssignedAssessments(mockCandidateUser.id);
    expect(assessments[0].isEligible).toBe(false);
    expect(assessments[0].eligibilityReason).toContain('limit exhausted');
  });
});
