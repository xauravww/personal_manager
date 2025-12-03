import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';
import {
  CreateLearningSubjectRequest,
  UpdateLearningSubjectRequest,
  CreateLearningModuleRequest,
  SubmitAssignmentRequest,
  GenerateCourseRequest
} from '../types';
import aiService from '../services/aiService';
import youtubeService from '../services/youtubeService';
import { analyzeModuleConnections } from '../services/connectionAnalyzer';

const router = Router();
const prisma = new PrismaClient();

// Apply authentication to all learning routes
router.use(authenticateToken);

// Learning Subjects CRUD
router.get('/subjects', async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const subjects = await prisma.learningSubject.findMany({
      where: { user_id: userId, is_active: true },
      include: {
        modules: {
          include: {
            progress: {
              where: { user_id: userId }
            },
            assignments: {
              include: {
                submissions: {
                  where: { user_id: userId },
                  orderBy: { submitted_at: 'desc' },
                  take: 1
                }
              }
            }
          }
        },
        progress: {
          where: { user_id: userId }
        }
      },
      orderBy: { updated_at: 'desc' }
    });

    res.json(subjects);
  } catch (error) {
    console.error('Error fetching learning subjects:', error);
    res.status(500).json({ error: 'Failed to fetch learning subjects' });
  }
});

router.post('/subjects', async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { name, description, goals }: CreateLearningSubjectRequest = req.body;

    // Generate embedding for semantic search
    let embedding: string | null = null;
    try {
      const textToEmbed = `${name} ${description || ''} ${goals ? JSON.stringify(goals) : ''}`;
      const embeddingResponse = await aiService.createEmbeddings(textToEmbed);
      embedding = JSON.stringify(embeddingResponse.data[0].embedding);
      console.log(`✅ Generated embedding for learning subject: ${name}`);
    } catch (embeddingError) {
      console.warn('Failed to generate embedding for learning subject:', embeddingError);
      // Continue without embedding
    }

    const subject = await prisma.learningSubject.create({
      data: {
        user_id: userId,
        name,
        description,
        goals: goals ? JSON.stringify(goals) : null,
        embedding
      }
    });

    res.status(201).json(subject);
  } catch (error) {
    console.error('Error creating learning subject:', error);
    res.status(500).json({ error: 'Failed to create learning subject' });
  }
});

router.put('/subjects/:id', async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;
    const { name, description, goals }: UpdateLearningSubjectRequest = req.body;

    // Regenerate embedding if content changed
    let embedding: string | undefined = undefined;
    if (name || description || goals) {
      try {
        const textToEmbed = `${name || ''} ${description || ''} ${goals ? JSON.stringify(goals) : ''}`;
        if (textToEmbed.trim()) {
          const embeddingResponse = await aiService.createEmbeddings(textToEmbed);
          embedding = JSON.stringify(embeddingResponse.data[0].embedding);
          console.log(`✅ Regenerated embedding for learning subject: ${id}`);
        }
      } catch (embeddingError) {
        console.warn('Failed to regenerate embedding for learning subject:', embeddingError);
      }
    }

    const subject = await prisma.learningSubject.update({
      where: {
        id,
        user_id: userId
      },
      data: {
        name,
        description,
        goals: goals ? JSON.stringify(goals) : undefined,
        ...(embedding && { embedding })
      }
    });

    res.json(subject);
  } catch (error) {
    console.error('Error updating learning subject:', error);
    res.status(500).json({ error: 'Failed to update learning subject' });
  }
});

router.delete('/subjects/:id', async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;

    await prisma.learningSubject.update({
      where: {
        id,
        user_id: userId
      },
      data: {
        is_active: false
      }
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting learning subject:', error);
    res.status(500).json({ error: 'Failed to delete learning subject' });
  }
});

// Learning Modules CRUD
router.get('/subjects/:subjectId/modules', async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { subjectId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const [modules, totalCount] = await Promise.all([
      prisma.learningModule.findMany({
        where: {
          subject_id: subjectId,
          subject: {
            user_id: userId
          }
        },
        include: {
          progress: {
            where: { user_id: userId }
          },
          assignments: {
            include: {
              submissions: {
                where: { user_id: userId },
                orderBy: { submitted_at: 'desc' },
                take: 1 // Get the latest submission
              }
            }
          }
        },
        orderBy: { order_index: 'asc' },
        skip,
        take: limitNum
      }),
      prisma.learningModule.count({
        where: {
          subject_id: subjectId,
          subject: {
            user_id: userId
          }
        }
      })
    ]);

    res.json({
      modules,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        pages: Math.ceil(totalCount / limitNum)
      }
    });
  } catch (error) {
    console.error('Error fetching learning modules:', error);
    res.status(500).json({ error: 'Failed to fetch learning modules' });
  }
});

router.post('/modules', async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { subject_id, title, description, content, order_index, prerequisites, estimated_time, difficulty, is_optional }: CreateLearningModuleRequest = req.body;

    // Verify subject belongs to user
    const subject = await prisma.learningSubject.findFirst({
      where: {
        id: subject_id,
        user_id: userId
      }
    });

    if (!subject) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    // Generate embedding for semantic search
    let embedding: string | null = null;
    try {
      const textToEmbed = `${title} ${description || ''} ${content || ''}`;
      const embeddingResponse = await aiService.createEmbeddings(textToEmbed);
      embedding = JSON.stringify(embeddingResponse.data[0].embedding);
      console.log(`✅ Generated embedding for learning module: ${title}`);
    } catch (embeddingError) {
      console.warn('Failed to generate embedding for learning module:', embeddingError);
      // Continue without embedding
    }

    const module = await prisma.learningModule.create({
      data: {
        subject_id,
        title,
        description,
        content,
        order_index: order_index || 0,
        prerequisites: prerequisites ? JSON.stringify(prerequisites) : null,
        estimated_time,
        difficulty,
        is_optional: is_optional || false,
        embedding
      }
    });

    res.status(201).json(module);
  } catch (error) {
    console.error('Error creating learning module:', error);
    res.status(500).json({ error: 'Failed to create learning module' });
  }
});

// Progress tracking
router.post('/progress', async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { module_id, status, score, time_spent, notes } = req.body;

    // Verify module belongs to user's subject
    const module = await prisma.learningModule.findFirst({
      where: {
        id: module_id,
        subject: {
          user_id: userId
        }
      }
    });

    if (!module) {
      return res.status(404).json({ error: 'Module not found' });
    }

    const progress = await prisma.learningProgress.upsert({
      where: {
        user_id_module_id: {
          user_id: userId,
          module_id
        }
      },
      update: {
        status,
        score,
        time_spent: {
          increment: time_spent || 0
        },
        completed_at: status === 'completed' ? new Date() : undefined,
        notes
      },
      create: {
        user_id: userId,
        subject_id: module.subject_id,
        module_id,
        status,
        score,
        time_spent: time_spent || 0,
        started_at: new Date(),
        completed_at: status === 'completed' ? new Date() : undefined,
        notes
      }
    });

    // Trigger automatic connection analysis if module was completed
    if (status === 'completed') {
      // Run in background, don't block response
      analyzeModuleConnections(userId, module_id).then(count => {
        if (count > 0) {
          console.log(`✅ Created ${count} automatic connections for module ${module_id}`);
        }
      }).catch(error => {
        console.error('Error analyzing connections:', error);
      });
    }

    res.json(progress);
  } catch (error) {
    console.error('Error updating progress:', error);
    res.status(500).json({ error: 'Failed to update progress' });
  }
});

// Create assignment
router.post('/assignments', async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { module_id, title, description, type, content, max_score, time_limit, due_date, is_required } = req.body;

    // Verify module belongs to user's subject
    const module = await prisma.learningModule.findFirst({
      where: {
        id: module_id,
        subject: {
          user_id: userId
        }
      }
    });

    if (!module) {
      return res.status(404).json({ error: 'Module not found' });
    }

    const assignment = await prisma.assignment.create({
      data: {
        module_id,
        title,
        description,
        type: type || 'exercise',
        content,
        max_score: max_score || 100,
        time_limit,
        due_date: due_date ? new Date(due_date) : undefined,
        is_required: is_required !== undefined ? is_required : true
      }
    });

    res.status(201).json(assignment);
  } catch (error) {
    console.error('Error creating assignment:', error);
    res.status(500).json({ error: 'Failed to create assignment' });
  }
});

// Get assignment details (including quiz questions)
router.get('/assignments/:id', async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;

    // Get assignment with module and subject info
    const assignment = await prisma.assignment.findFirst({
      where: {
        id,
        module: {
          subject: {
            user_id: userId
          }
        }
      },
      include: {
        module: {
          include: {
            subject: true
          }
        },
        submissions: {
          where: { user_id: userId },
          orderBy: { submitted_at: 'desc' },
          take: 1
        }
      }
    });

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    let content = assignment.content;
    let questions = null;

    // Generate quiz questions if this is a quiz assignment
    if (assignment.type === 'quiz') {
      // Count previous attempts
      const previousAttempts = await prisma.assignmentSubmission.count({
        where: {
          assignment_id: id,
          user_id: userId
        }
      });

      // Generate fresh questions
      const quizData = await aiService.generateQuizQuestions(
        {
          title: assignment.title,
          description: assignment.description || '',
          moduleContent: assignment.module.content || '',
          subjectName: assignment.module.subject.name
        },
        assignment.module.subject.current_level || 'intermediate',
        previousAttempts
      );

      questions = quizData.questions;
      content = JSON.stringify({
        questions: quizData.questions,
        difficulty: quizData.difficulty,
        generatedAt: new Date().toISOString()
      });
    }

    res.json({
      assignment: {
        id: assignment.id,
        title: assignment.title,
        description: assignment.description,
        type: assignment.type,
        content,
        questions, // For quizzes, the parsed questions
        max_score: assignment.max_score,
        time_limit: assignment.time_limit,
        due_date: assignment.due_date,
        is_required: assignment.is_required,
        module: {
          id: assignment.module.id,
          title: assignment.module.title
        },
        subject: {
          id: assignment.module.subject.id,
          name: assignment.module.subject.name
        }
      },
      previousSubmission: assignment.submissions[0] || null
    });
  } catch (error) {
    console.error('Error fetching assignment:', error);
    res.status(500).json({ error: 'Failed to fetch assignment' });
  }
});

// Assignment submission
router.post('/assignments/submit', async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { assignment_id, content }: SubmitAssignmentRequest = req.body;

    // Verify assignment belongs to user's module
    const assignment = await prisma.assignment.findFirst({
      where: {
        id: assignment_id,
        module: {
          subject: {
            user_id: userId
          }
        }
      },
      include: {
        module: {
          include: {
            subject: true
          }
        }
      }
    });

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    let analysis;
    let score: number;
    let feedback: string;
    let weakPoints: any[] = [];

    // Handle quiz submissions differently
    if (assignment.type === 'quiz') {
      // Parse structured quiz submission
      let userAnswers: { [questionId: string]: number } = {};
      let quizQuestions: any[] = [];

      try {
        // Try to parse as JSON first (new format)
        const submissionData = JSON.parse(content);
        userAnswers = submissionData.answers || {};
        quizQuestions = submissionData.questions || [];
      } catch {
        // Fallback to old format parsing
        const questionBlocks = content.split('\n\n');
        for (const block of questionBlocks) {
          if (block.trim() && block.includes('Answer:')) {
            // This is legacy format, handle as before
            // For now, we'll assume new format is used
          }
        }
      }

      // If we have structured questions, use them
      if (quizQuestions.length > 0) {
        let correctAnswers = 0;
        const quizWeakPoints: any[] = [];

        for (const question of quizQuestions) {
          const userAnswer = userAnswers[question.id];
          if (userAnswer !== undefined) {
            if (userAnswer === question.correctAnswer) {
              correctAnswers++;
            } else {
              // Incorrect answer
              quizWeakPoints.push({
                topic: question.topic,
                description: `Incorrect answer on: ${question.question.substring(0, 50)}...`,
                severity: 'medium',
                suggestions: [
                  'Review the related learning material',
                  `Study: ${question.topic}`,
                  'Practice similar questions'
                ]
              });
            }
          }
        }

        const totalQuestions = quizQuestions.length;
        score = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;

        feedback = `Quiz Results: ${correctAnswers}/${totalQuestions} correct answers (${score}%). ` +
          (score >= 80 ? 'Great job! You have a good understanding of this topic.' :
            score >= 60 ? 'Good effort! Consider reviewing the areas you missed.' :
              'You may need to review this material more thoroughly.');

        if (quizWeakPoints.length > 0) {
          feedback += ` Focus on improving: ${quizWeakPoints.map(wp => wp.topic).join(', ')}.`;
        }

        weakPoints = quizWeakPoints;

        analysis = {
          score,
          feedback,
          weakPoints: quizWeakPoints,
          strengths: score >= 80 ? ['Good understanding of quiz topics'] : [],
          improvementAreas: quizWeakPoints.map(wp => wp.suggestions[0])
        };
      } else {
        // Fallback to old parsing logic
        const questionBlocks = content.split('\n\n');
        let correctAnswers = 0;
        let totalQuestions = 0;
        const quizWeakPoints: any[] = [];

        for (const block of questionBlocks) {
          if (block.trim() && block.includes('Answer:')) {
            totalQuestions++;

            const answerLine = block.split('\n').find(line => line.includes('Answer:'));
            if (answerLine && answerLine.includes('(Correct)')) {
              correctAnswers++;
            } else if (answerLine && answerLine.includes('(Incorrect')) {
              const questionLine = block.split('\n').find(line => line.startsWith('Q') && line.includes(':'));
              if (questionLine) {
                const questionText = questionLine.split(':')[1]?.trim().split('?')[0] || 'Quiz question';
                quizWeakPoints.push({
                  topic: questionText.substring(0, 50),
                  description: 'Incorrect answer on quiz question',
                  severity: 'medium',
                  suggestions: ['Review the related learning material', 'Practice similar questions']
                });
              }
            }
          }
        }

        score = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;

        feedback = `Quiz Results: ${correctAnswers}/${totalQuestions} correct answers (${score}%). ` +
          (score >= 80 ? 'Great job! You have a good understanding of this topic.' :
            score >= 60 ? 'Good effort! Consider reviewing the areas you missed.' :
              'You may need to review this material more thoroughly.');

        if (quizWeakPoints.length > 0) {
          feedback += ` Focus on improving: ${quizWeakPoints.map(wp => wp.topic).join(', ')}.`;
        }

        weakPoints = quizWeakPoints;

        analysis = {
          score,
          feedback,
          weakPoints: quizWeakPoints,
          strengths: score >= 80 ? ['Good understanding of quiz topics'] : [],
          improvementAreas: quizWeakPoints.map(wp => wp.suggestions[0])
        };
      }
    } else if (assignment.type === 'code_challenge') {
      // Analyze code submissions with AI
      analysis = await aiService.analyzeAssignmentSubmission(
        {
          title: assignment.title,
          description: assignment.description || '',
          solution: assignment.solution || undefined
        },
        content,
        assignment.module.subject.name
      );
      score = analysis.score;
      feedback = analysis.feedback;
      weakPoints = analysis.weakPoints;
    } else if (assignment.type === 'file_upload') {
      // For file uploads, provide basic feedback
      analysis = {
        score: 100, // Assume uploaded files are complete
        feedback: 'File uploaded successfully. Manual review may be required.',
        weakPoints: [],
        strengths: ['File submitted on time'],
        improvementAreas: []
      };
      score = analysis.score;
      feedback = analysis.feedback;
      weakPoints = analysis.weakPoints;
    } else {
      // Check if this is a structured assignment completion from AssignmentJourney
      try {
        const parsedContent = JSON.parse(content);
        if (parsedContent.assignment_id && parsedContent.steps_progress && typeof parsedContent.final_score === 'number') {
          // This is an AssignmentJourney completion
          score = parsedContent.final_score;
          feedback = `Assignment completed successfully! Final score: ${score.toFixed(1)}%`;
          weakPoints = [];

          // Add feedback based on performance
          if (score >= 90) {
            feedback += ' Excellent work!';
          } else if (score >= 80) {
            feedback += ' Good job!';
          } else if (score >= 70) {
            feedback += ' Satisfactory work.';
          } else {
            feedback += ' Consider reviewing the material and trying again.';
          }

          analysis = {
            score,
            feedback,
            weakPoints,
            strengths: score >= 80 ? ['Completed all assignment steps'] : [],
            improvementAreas: score < 70 ? ['Review assignment requirements'] : []
          };
        } else {
          throw new Error('Not AssignmentJourney format');
        }
      } catch {
        // Analyze text/code submissions with AI
        analysis = await aiService.analyzeAssignmentSubmission(
          {
            title: assignment.title,
            description: assignment.description || '',
            solution: assignment.solution || undefined
          },
          content,
          assignment.module.subject.name
        );
        score = analysis.score;
        feedback = analysis.feedback;
        weakPoints = analysis.weakPoints;
      }
    }

    // Create new submission (allow multiple submissions for retakes)
    const submission = await prisma.assignmentSubmission.create({
      data: {
        assignment_id,
        user_id: userId,
        content,
        score,
        feedback,
        weak_points: JSON.stringify(weakPoints)
      }
    });

    // Create weak points in database
    for (const weakPoint of analysis.weakPoints) {
      await prisma.weakPoint.upsert({
        where: {
          user_id_topic: {
            user_id: userId,
            topic: weakPoint.topic
          }
        },
        update: {
          frequency: {
            increment: 1
          },
          last_identified: new Date()
        },
        create: {
          user_id: userId,
          subject_id: assignment.module.subject_id,
          topic: weakPoint.topic,
          description: weakPoint.description,
          severity: weakPoint.severity as any,
          suggestions: JSON.stringify(weakPoint.suggestions)
        }
      });
    }

    res.json({
      submission,
      analysis: {
        score: analysis.score,
        feedback: analysis.feedback,
        weakPoints: analysis.weakPoints,
        strengths: analysis.strengths,
        improvementAreas: analysis.improvementAreas
      }
    });
  } catch (error) {
    console.error('Error submitting assignment:', error);
    res.status(500).json({ error: 'Failed to submit assignment' });
  }
});

// Get detailed learning analytics
router.get('/progress/analytics', async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { subject_id, days = 30 } = req.query;

    const daysNum = parseInt(days as string, 10);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysNum);

    // Build where clause
    const whereClause: any = {
      user_id: userId,
      created_at: { gte: startDate }
    };
    if (subject_id) {
      whereClause.subject_id = subject_id;
    }

    // Get assignment submissions with details
    const submissions = await prisma.assignmentSubmission.findMany({
      where: whereClause,
      include: {
        assignment: {
          include: {
            module: {
              include: {
                subject: true
              }
            }
          }
        }
      },
      orderBy: { submitted_at: 'desc' }
    });

    // Get progress records
    const progressRecords = await prisma.learningProgress.findMany({
      where: whereClause,
      include: {
        module: {
          include: {
            subject: true
          }
        }
      },
      orderBy: { updated_at: 'desc' }
    });

    // Get weak points
    const weakPoints = await prisma.weakPoint.findMany({
      where: {
        user_id: userId,
        ...(subject_id && { subject_id: subject_id as string })
      },
      orderBy: { last_identified: 'desc' },
      include: {
        subject: true
      }
    });

    // Calculate analytics
    const analytics: {
      timeRange: { days: number; startDate: Date; endDate: Date };
      assignmentPerformance: {
        totalSubmissions: number;
        averageScore: number;
        submissionsBySubject: { [key: string]: number };
        scoreTrend: { date: string; averageScore: number; submissionCount: number }[];
        retakeRate: number;
      };
      progressMetrics: {
        modulesStarted: number;
        modulesCompleted: number;
        totalTimeSpent: number;
        averageTimePerModule: number;
        completionRate: number;
      };
      weakPointsAnalysis: {
        totalWeakPoints: number;
        topWeakPoints: { topic: string; frequency: number; severity: string }[];
        weakPointsBySubject: { [key: string]: number };
      };
      learningPatterns: {
        mostActiveDays: { day: string; count: number }[];
        peakLearningHours: { hour: number; count: number }[];
        subjectDistribution: { [key: string]: number };
      };
    } = {
      timeRange: {
        days: daysNum,
        startDate,
        endDate: new Date()
      },
      assignmentPerformance: {
        totalSubmissions: submissions.length,
        averageScore: submissions.length > 0
          ? submissions.reduce((sum, s) => sum + (s.score || 0), 0) / submissions.length
          : 0,
        submissionsBySubject: {},
        scoreTrend: [],
        retakeRate: 0
      },
      progressMetrics: {
        modulesStarted: new Set(progressRecords.map(p => p.module_id)).size,
        modulesCompleted: progressRecords.filter(p => p.status === 'completed').length,
        totalTimeSpent: progressRecords.reduce((sum, p) => sum + p.time_spent, 0),
        averageTimePerModule: 0,
        completionRate: 0
      },
      weakPointsAnalysis: {
        totalWeakPoints: weakPoints.length,
        topWeakPoints: weakPoints.slice(0, 5).map(wp => ({
          topic: wp.topic,
          frequency: wp.frequency,
          severity: wp.severity
        })),
        weakPointsBySubject: {}
      },
      learningPatterns: {
        mostActiveDays: [],
        peakLearningHours: [],
        subjectDistribution: {}
      }
    };

    // Calculate submissions by subject
    submissions.forEach(sub => {
      const subjectName = sub.assignment.module.subject.name;
      if (!analytics.assignmentPerformance.submissionsBySubject[subjectName]) {
        analytics.assignmentPerformance.submissionsBySubject[subjectName] = 0;
      }
      analytics.assignmentPerformance.submissionsBySubject[subjectName]++;
    });

    // Calculate score trend (daily averages)
    const dailyScores: { [date: string]: number[] } = {};
    submissions.forEach(sub => {
      const date = sub.submitted_at.toISOString().split('T')[0];
      if (!dailyScores[date]) dailyScores[date] = [];
      if (sub.score) dailyScores[date].push(sub.score);
    });

    analytics.assignmentPerformance.scoreTrend = Object.entries(dailyScores)
      .map(([date, scores]) => ({
        date,
        averageScore: scores.reduce((sum, s) => sum + s, 0) / scores.length,
        submissionCount: scores.length
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Calculate retake rate
    const assignmentIds = [...new Set(submissions.map(s => s.assignment_id))];
    let totalRetakes = 0;
    for (const assignmentId of assignmentIds) {
      const assignmentSubs = submissions.filter(s => s.assignment_id === assignmentId);
      if (assignmentSubs.length > 1) {
        totalRetakes += assignmentSubs.length - 1;
      }
    }
    analytics.assignmentPerformance.retakeRate = submissions.length > 0
      ? (totalRetakes / submissions.length) * 100
      : 0;

    // Calculate progress metrics
    const totalModules = progressRecords.length;
    analytics.progressMetrics.averageTimePerModule = totalModules > 0
      ? analytics.progressMetrics.totalTimeSpent / totalModules
      : 0;
    analytics.progressMetrics.completionRate = totalModules > 0
      ? (analytics.progressMetrics.modulesCompleted / totalModules) * 100
      : 0;

    // Calculate weak points by subject
    weakPoints.forEach((wp: any) => {
      const subjectName = wp.subject?.name || 'General';
      if (!analytics.weakPointsAnalysis.weakPointsBySubject[subjectName]) {
        analytics.weakPointsAnalysis.weakPointsBySubject[subjectName] = 0;
      }
      analytics.weakPointsAnalysis.weakPointsBySubject[subjectName]++;
    });

    // Calculate learning patterns
    const hourCounts: { [hour: number]: number } = {};
    const dayCounts: { [day: number]: number } = {};
    const subjectCounts: { [subject: string]: number } = {};

    submissions.forEach(sub => {
      const hour = sub.submitted_at.getHours();
      const day = sub.submitted_at.getDay();
      const subject = sub.assignment.module.subject.name;

      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      dayCounts[day] = (dayCounts[day] || 0) + 1;
      subjectCounts[subject] = (subjectCounts[subject] || 0) + 1;
    });

    analytics.learningPatterns.peakLearningHours = Object.entries(hourCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([hour, count]) => ({ hour: parseInt(hour), count }));

    analytics.learningPatterns.mostActiveDays = Object.entries(dayCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([day, count]) => ({
        day: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][parseInt(day)],
        count
      }));

    analytics.learningPatterns.subjectDistribution = subjectCounts;

    res.json(analytics);
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// Get upcoming assignments and due dates
router.get('/assignments/upcoming', async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { days = 7 } = req.query;

    const daysNum = parseInt(days as string, 10);
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysNum);

    const assignments = await prisma.assignment.findMany({
      where: {
        module: {
          subject: {
            user_id: userId,
            is_active: true
          }
        },
        due_date: {
          lte: futureDate,
          gte: new Date()
        }
      },
      include: {
        module: {
          include: {
            subject: true,
            progress: {
              where: { user_id: userId }
            }
          }
        },
        submissions: {
          where: { user_id: userId },
          orderBy: { submitted_at: 'desc' },
          take: 1
        }
      },
      orderBy: { due_date: 'asc' }
    });

    const upcomingAssignments = assignments.map(assignment => ({
      id: assignment.id,
      title: assignment.title,
      description: assignment.description,
      type: assignment.type,
      due_date: assignment.due_date,
      time_limit: assignment.time_limit,
      max_score: assignment.max_score,
      is_required: assignment.is_required,
      days_until_due: assignment.due_date
        ? Math.ceil((assignment.due_date.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
        : null,
      module: {
        id: assignment.module.id,
        title: assignment.module.title
      },
      subject: {
        id: assignment.module.subject.id,
        name: assignment.module.subject.name
      },
      status: assignment.submissions.length > 0 ? 'submitted' : 'pending',
      latest_submission: assignment.submissions[0] || null
    }));

    res.json({
      upcomingAssignments,
      totalCount: upcomingAssignments.length,
      urgentCount: upcomingAssignments.filter(a => a.days_until_due !== null && a.days_until_due <= 1).length
    });
  } catch (error) {
    console.error('Error fetching upcoming assignments:', error);
    res.status(500).json({ error: 'Failed to fetch upcoming assignments' });
  }
});

// Get learning progress overview
router.get('/progress/overview', async (req, res) => {
  try {
    const userId = (req as any).user.id;

    const subjects = await prisma.learningSubject.findMany({
      where: { user_id: userId, is_active: true },
      include: {
        modules: {
          include: {
            progress: {
              where: { user_id: userId }
            }
          }
        },
        progress: {
          where: { user_id: userId }
        },
        weakPoints: true
      }
    });

    const overview = subjects.map(subject => {
      const totalModules = subject.modules.length;
      const completedModules = subject.progress.filter(p => p.status === 'completed').length;
      const totalTimeSpent = subject.progress.reduce((sum, p) => sum + p.time_spent, 0);

      return {
        subject,
        overall_progress: {
          completed_modules: completedModules,
          total_modules: totalModules,
          percentage: totalModules > 0 ? (completedModules / totalModules) * 100 : 0,
          time_spent: totalTimeSpent,
          weak_points: subject.weakPoints
        }
      };
    });

    res.json(overview);
  } catch (error) {
    console.error('Error fetching progress overview:', error);
    res.status(500).json({ error: 'Failed to fetch progress overview' });
  }
});

// Generate course from AI analysis
router.post('/generate-course', async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { subject_name, user_resources, current_level, goals }: GenerateCourseRequest = req.body;

    // Get user's existing resources for analysis
    let userResources: Array<{ title: string; content?: string; type: string; tags: string[] }> = [];
    if (user_resources && user_resources.length > 0) {
      const resources = await prisma.resource.findMany({
        where: {
          id: { in: user_resources },
          user_id: userId
        },
        select: {
          title: true,
          content: true,
          type: true,
          tags: {
            select: { name: true }
          }
        }
      });

      userResources = resources.map(r => ({
        title: r.title,
        content: r.content || undefined,
        type: r.type,
        tags: r.tags.map((t: any) => t.name)
      }));
    } else {
      // Get all user's resources related to the subject
      const resources = await prisma.resource.findMany({
        where: {
          user_id: userId,
          OR: [
            { title: { contains: subject_name } },
            { content: { contains: subject_name } },
            { tags: { some: { name: { contains: subject_name } } } }
          ]
        },
        select: {
          title: true,
          content: true,
          type: true,
          tags: {
            select: { name: true }
          }
        },
        take: 20 // Limit for analysis
      });

      userResources = resources.map(r => ({
        title: r.title,
        content: r.content || undefined,
        type: r.type,
        tags: r.tags.map((t: any) => t.name)
      }));
    }

    // Analyze user resources to assess current level
    const resourceAnalysis = await aiService.analyzeUserResourcesForCourse(
      subject_name,
      userResources,
      current_level
    );

    // Check if subject already exists
    let subject = await prisma.learningSubject.findFirst({
      where: {
        user_id: userId,
        name: subject_name,
        is_active: true
      }
    });

    if (!subject) {
      // Create new subject
      subject = await prisma.learningSubject.create({
        data: {
          user_id: userId,
          name: subject_name,
          current_level: resourceAnalysis.assessedLevel,
          goals: goals ? JSON.stringify(goals) : null
        }
      });
    } else {
      // Update existing subject with new assessment
      subject = await prisma.learningSubject.update({
        where: { id: subject.id },
        data: {
          current_level: resourceAnalysis.assessedLevel,
          goals: goals ? JSON.stringify(goals) : JSON.parse(subject.goals || '[]')
        }
      });
    }

    // Get existing progress
    const existingProgress = await prisma.learningProgress.findMany({
      where: {
        user_id: userId,
        subject_id: subject.id
      },
      include: {
        module: true
      }
    });

    const existingModules = existingProgress.map(p => ({
      title: p.module.title,
      completed: p.status === 'completed'
    }));

    // Generate personalized course
    const course = await aiService.generatePersonalizedCourse(
      subject_name,
      resourceAnalysis.assessedLevel,
      goals || [],
      resourceAnalysis.knowledgeGaps,
      existingModules
    );

    // Create modules in database
    const createdModules = [];
    for (const moduleData of course.modules) {
      const module = await prisma.learningModule.create({
        data: {
          subject_id: subject.id,
          title: moduleData.title,
          description: moduleData.description,
          content: moduleData.content,
          order_index: moduleData.order,
          prerequisites: JSON.stringify(moduleData.prerequisites),
          estimated_time: moduleData.estimatedHours,
          difficulty: moduleData.difficulty
        }
      });

      // Create assignments for this module
      for (const assignmentData of moduleData.assignments) {
        // Determine assignment type - default to quiz if title contains 'quiz'
        let assignmentType = assignmentData.type || 'exercise';
        if (assignmentData.title.toLowerCase().includes('quiz') && !assignmentData.type) {
          assignmentType = 'quiz';
        }

        await prisma.assignment.create({
          data: {
            module_id: module.id,
            title: assignmentData.title,
            type: assignmentType as any,
            description: assignmentData.description
          }
        });
      }

      createdModules.push(module);
    }

    // Generate and save mindmap
    const mindmap = await aiService.generateMindmap(
      subject_name,
      'concept',
      {
        currentLevel: resourceAnalysis.assessedLevel,
        goals: goals
      }
    );

    await prisma.mindMap.create({
      data: {
        user_id: userId,
        subject_id: subject.id,
        title: mindmap.title,
        content: JSON.stringify(mindmap.structure),
        type: 'concept'
      }
    });

    res.json({
      subject,
      course,
      resourceAnalysis,
      modules: createdModules,
      mindmap,
      message: 'Course generated successfully'
    });
  } catch (error) {
    console.error('Error generating course:', error);
    res.status(500).json({ error: 'Failed to generate course' });
  }
});

// Get knowledge summary for a subject
router.get('/subjects/:subjectId/knowledge-summary', async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { subjectId } = req.params;

    // Verify subject belongs to user
    const subject = await prisma.learningSubject.findFirst({
      where: {
        id: subjectId,
        user_id: userId,
        is_active: true
      }
    });

    if (!subject) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    // Get progress data
    const progressRecords = await prisma.learningProgress.findMany({
      where: {
        user_id: userId,
        subject_id: subjectId
      },
      include: {
        module: true
      }
    });

    const completedModules = progressRecords
      .filter(p => p.status === 'completed')
      .map(p => ({
        title: p.module.title,
        score: p.score || undefined,
        completedAt: p.completed_at!
      }));

    const currentModules = progressRecords
      .filter(p => p.status === 'in_progress')
      .map(p => ({
        title: p.module.title,
        progress: p.score || 0 // Using score as progress percentage
      }));

    const weakPoints = await prisma.weakPoint.findMany({
      where: {
        user_id: userId,
        subject_id: subjectId
      }
    });

    const weakPointsData = weakPoints.map(wp => ({
      topic: wp.topic,
      severity: wp.severity,
      frequency: wp.frequency
    }));

    const totalTimeSpent = progressRecords.reduce((sum, p) => sum + p.time_spent, 0);

    // Get assignment submissions
    const assignmentSubmissions = await prisma.assignmentSubmission.findMany({
      where: {
        user_id: userId,
        assignment: {
          module: {
            subject_id: subjectId
          }
        }
      }
    });

    const assignmentSubmissionsData = assignmentSubmissions.map(sub => ({
      score: sub.score || undefined,
      feedback: sub.feedback || undefined,
      weakPoints: sub.weak_points ? JSON.parse(sub.weak_points) : undefined
    }));

    // Get user's resources related to the subject
    const resources = await prisma.resource.findMany({
      where: {
        user_id: userId,
        OR: [
          { title: { contains: subject.name } },
          { content: { contains: subject.name } },
          { tags: { some: { name: { contains: subject.name } } } }
        ]
      },
      select: {
        title: true,
        type: true,
        tags: {
          select: { name: true }
        }
      },
      take: 20
    });

    const resourcesData = resources.map(r => ({
      title: r.title,
      type: r.type,
      tags: r.tags.map((t: any) => t.name)
    }));

    // Generate knowledge summary
    const knowledgeSummary = await aiService.generateKnowledgeSummary(
      subject.name,
      {
        completedModules,
        currentModules,
        weakPoints: weakPointsData,
        totalTimeSpent,
        assignmentSubmissions: assignmentSubmissionsData
      },
      resourcesData,
      subject.current_level || 'beginner'
    );

    res.json(knowledgeSummary);
  } catch (error) {
    console.error('Error generating knowledge summary:', error);
    res.status(500).json({ error: 'Failed to generate knowledge summary' });
  }
});

// Get mindmaps
router.get('/mindmaps', async (req, res) => {
  try {
    const userId = (req as any).user.id;

    const mindmaps = await prisma.mindMap.findMany({
      where: { user_id: userId },
      include: {
        subject: true
      },
      orderBy: { generated_at: 'desc' }
    });

    res.json(mindmaps);
  } catch (error) {
    console.error('Error fetching mindmaps:', error);
    res.status(500).json({ error: 'Failed to fetch mindmaps' });
  }
});

// Generate mindmap
router.post('/mindmaps/generate', async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { subject_id, type, context } = req.body;

    let subject = null;
    if (subject_id) {
      subject = await prisma.learningSubject.findFirst({
        where: {
          id: subject_id,
          user_id: userId
        }
      });
      if (!subject) {
        return res.status(404).json({ error: 'Subject not found' });
      }
    }

    // Get context data
    let contextData = {};
    if (context && type === 'progress' && subject) {
      const progress = await prisma.learningProgress.findMany({
        where: {
          user_id: userId,
          subject_id: subject.id
        },
        include: {
          module: true
        }
      });

      contextData = {
        completedModules: progress.filter(p => p.status === 'completed').map(p => p.module.title),
        currentLevel: subject.current_level,
        goals: subject.goals ? JSON.parse(subject.goals) : []
      };
    } else if (context && type === 'weak_points' && subject) {
      const weakPoints = await prisma.weakPoint.findMany({
        where: {
          user_id: userId,
          subject_id: subject.id
        }
      });

      contextData = {
        weakPoints: weakPoints.map(wp => wp.topic),
        currentLevel: subject.current_level
      };
    }

    const mindmap = await aiService.generateMindmap(
      subject?.name || 'General Knowledge',
      type as 'concept' | 'progress' | 'weak_points',
      contextData
    );

    // Save mindmap
    const savedMindmap = await prisma.mindMap.create({
      data: {
        user_id: userId,
        subject_id: subject?.id,
        title: mindmap.title,
        content: JSON.stringify(mindmap.structure),
        type: type as any
      }
    });

    res.json({
      mindmap: savedMindmap,
      structure: mindmap.structure,
      description: mindmap.description
    });
  } catch (error) {
    console.error('Error generating mindmap:', error);
    res.status(500).json({ error: 'Failed to generate mindmap' });
  }
});

// Generate adaptive assignment
router.post('/assignments/generate-adaptive', async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { subject_name, knowledge_gaps, preferred_modalities } = req.body;

    // Get user's learning DNA
    let learningDNA = {};
    try {
      const userDNA = await prisma.userLearningDNA.findUnique({
        where: { user_id: userId }
      });
      if (userDNA) {
        learningDNA = JSON.parse(userDNA.learning_dna);
      }
    } catch (error) {
      console.warn('Error loading learning DNA:', error);
    }

    // Generate adaptive assignment
    const result = await aiService.generateAdaptiveAssignmentFromDNA(
      subject_name,
      learningDNA,
      knowledge_gaps || [],
      preferred_modalities || ['text']
    );

    // Create assignment in database
    const subject = await prisma.learningSubject.findFirst({
      where: {
        user_id: userId,
        name: subject_name,
        is_active: true
      }
    });

    if (!subject) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    // Get first module or create one
    let module = await prisma.learningModule.findFirst({
      where: {
        subject_id: subject.id,
        order_index: 0
      }
    });

    if (!module) {
      module = await prisma.learningModule.create({
        data: {
          subject_id: subject.id,
          title: 'Adaptive Learning Module',
          description: 'AI-generated adaptive learning content',
          order_index: 0
        }
      });
    }

    const assignment = await prisma.assignment.create({
      data: {
        module_id: module.id,
        title: result.assignment.title,
        description: result.assignment.description,
        type: result.assignment.type,
        steps: JSON.stringify(result.assignment.steps),
        modalities: JSON.stringify(result.assignment.modalities),
        max_score: 100,
        time_limit: result.assignment.estimated_time
      }
    });

    res.json({
      assignment: {
        ...assignment,
        steps: result.assignment.steps,
        modalities: result.assignment.modalities
      },
      reasoning: result.reasoning
    });
  } catch (error) {
    console.error('Error generating adaptive assignment:', error);
    res.status(500).json({ error: 'Failed to generate adaptive assignment' });
  }
});

// Analyze step performance and update learning DNA
router.post('/assignments/analyze-step', async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { assignment_id, step, user_input, time_spent } = req.body;

    // Get assignment details
    const assignment = await prisma.assignment.findFirst({
      where: {
        id: assignment_id,
        module: {
          subject: {
            user_id: userId
          }
        }
      },
      include: {
        module: {
          include: {
            subject: true
          }
        }
      }
    });

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    // Get current learning DNA
    let currentLearningDNA = {};
    try {
      const userDNA = await prisma.userLearningDNA.findUnique({
        where: { user_id: userId }
      });
      if (userDNA) {
        currentLearningDNA = JSON.parse(userDNA.learning_dna);
      }
    } catch (error) {
      console.warn('Error loading learning DNA:', error);
    }

    // Analyze step performance
    const analysis = await aiService.analyzeStepPerformance(
      step,
      user_input,
      time_spent,
      assignment.module.subject.name,
      currentLearningDNA
    );

    // Update learning DNA in database
    await prisma.userLearningDNA.upsert({
      where: { user_id: userId },
      update: {
        learning_dna: JSON.stringify(analysis.updatedLearningDNA)
      },
      create: {
        user_id: userId,
        learning_dna: JSON.stringify(analysis.updatedLearningDNA)
      }
    });

    res.json(analysis);
  } catch (error) {
    console.error('Error analyzing step performance:', error);
    res.status(500).json({ error: 'Failed to analyze step performance' });
  }
});

// Get user's learning DNA
router.get('/learning-dna', async (req, res) => {
  try {
    const userId = (req as any).user.id;

    const userDNA = await prisma.userLearningDNA.findUnique({
      where: { user_id: userId }
    });

    if (!userDNA) {
      return res.json({
        learning_dna: {},
        message: 'No learning DNA found - will be created as you complete assignments'
      });
    }

    res.json({
      learning_dna: JSON.parse(userDNA.learning_dna),
      last_updated: userDNA.last_updated
    });
  } catch (error) {
    console.error('Error fetching learning DNA:', error);
    res.status(500).json({ error: 'Failed to fetch learning DNA' });
  }
});

// Check Prerequisites
router.post('/prerequisites/check', async (req, res) => {
  try {
    const { topic } = req.body;
    if (!topic) return res.status(400).json({ error: 'Topic is required' });

    const result = await aiService.checkPrerequisites(topic);
    res.json(result);
  } catch (error) {
    console.error('Error checking prerequisites:', error);
    res.status(500).json({ error: 'Failed to check prerequisites' });
  }
});

// Complete Module
router.post('/modules/:id/complete', async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const moduleId = req.params.id;
    const {
      chatHistory,
      quizAttempts,
      identifiedWeaknesses,
      codeSnippets
    } = req.body;

    const module = await prisma.learningModule.findFirst({
      where: {
        id: moduleId,
        subject: {
          user_id: userId
        }
      },
      include: { subject: true }
    });

    if (!module) {
      return res.status(404).json({ error: 'Module not found' });
    }

    await prisma.learningProgress.upsert({
      where: {
        user_id_module_id: {
          user_id: userId,
          module_id: moduleId
        }
      },
      update: {
        status: 'completed',
        completed_at: new Date(),
        score: 100,
        chat_history: chatHistory ? JSON.stringify(chatHistory) : null,
        quiz_attempts: quizAttempts ? JSON.stringify(quizAttempts) : null,
        identified_weaknesses: identifiedWeaknesses ? JSON.stringify(identifiedWeaknesses) : null,
        code_snippets: codeSnippets ? JSON.stringify(codeSnippets) : null
      },
      create: {
        user_id: userId,
        subject_id: module.subject_id,
        module_id: moduleId,
        status: 'completed',
        completed_at: new Date(),
        score: 100,
        chat_history: chatHistory ? JSON.stringify(chatHistory) : null,
        quiz_attempts: quizAttempts ? JSON.stringify(quizAttempts) : null,
        identified_weaknesses: identifiedWeaknesses ? JSON.stringify(identifiedWeaknesses) : null,
        code_snippets: codeSnippets ? JSON.stringify(codeSnippets) : null
      }
    });

    // Trigger automatic connection analysis in background
    analyzeModuleConnections(userId, moduleId).then(count => {
      if (count > 0) {
        console.log(`✅ Created ${count} automatic connections for completed module ${moduleId}`);
      }
    }).catch(error => {
      console.error('Error analyzing connections:', error);
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error completing module:', error);
    res.status(500).json({ error: 'Failed to complete module' });
  }
});

// AI Chat with Module
// AI Chat with Module
router.post('/modules/chat', async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { module_id, message, conversation_history } = req.body;

    // Verify module belongs to user's subject
    const module = await prisma.learningModule.findFirst({
      where: {
        id: module_id,
        subject: {
          user_id: userId
        }
      },
      include: {
        subject: true,
        assignments: true
      }
    });

    if (!module) {
      return res.status(404).json({ error: 'Module not found' });
    }

    // Check if module is already completed
    const existingProgress = await prisma.learningProgress.findFirst({
      where: {
        user_id: userId,
        module_id: module_id
      }
    });

    if (existingProgress?.status === 'completed') {
      return res.json({
        response: "This module is already completed! 🎉 You can review the content or move on to the next module.",
        suggestions: [],
        analysis: { score: 100, strengths: [], weakPoints: [] },
        completed: true,
        mastery_achieved: true
      });
    }

    // Check if module has assignments and if they are all submitted
    const hasAssignments = module.assignments && module.assignments.length > 0;
    let allAssignmentsSubmitted = true;
    let pendingAssignmentsCount = 0;

    if (hasAssignments) {
      const assignmentSubmissions = await prisma.assignmentSubmission.findMany({
        where: {
          user_id: userId,
          assignment: {
            module_id: module_id
          }
        }
      });

      const submittedAssignmentIds = assignmentSubmissions.map(sub => sub.assignment_id);
      const allAssignmentIds = module.assignments.map(assignment => assignment.id);

      pendingAssignmentsCount = allAssignmentIds.length - submittedAssignmentIds.length;
      allAssignmentsSubmitted = pendingAssignmentsCount === 0;
    }

    // Build context for AI with completion suggestion authority
    const assignmentsInfo = hasAssignments
      ? `Assignments: ${module.assignments.length} total, ${pendingAssignmentsCount} pending submissions`
      : 'Assignments: None';

    const context = `
Module: ${module.title}
Description: ${module.description || 'No description'}
Content: ${module.content || 'No content'}
Difficulty: ${module.difficulty || 'Not specified'}
Subject: ${module.subject.name}
Current Status: ${existingProgress?.status || 'not_started'}
${assignmentsInfo}

${hasAssignments && !allAssignmentsSubmitted
        ? `CRITICAL: This module has ${pendingAssignmentsCount} unsubmitted assignment(s). The user MUST complete and submit ALL assignments before they can mark this module as completed. Do not suggest completion until all assignments are submitted.`
        : 'All assignments have been submitted - user can potentially complete this module.'}

IMPORTANT: You can ONLY suggest that the user mark this module as completed when they demonstrate sufficient understanding AND have completed ALL assignments for this module.

Conversation History:
${conversation_history ? conversation_history.map((msg: any) => `${msg.role}: ${msg.content}`).join('\n') : 'No previous conversation'}

User's current message: ${message}
    `.trim();

    // Generate AI response with completion authority
    const aiResponse = await aiService.chatWithModule(
      message,
      context,
      conversation_history || []
    );

    // Check if AI response suggests completion
    let masteryAchieved = false;

    if (aiResponse.mastery_achieved) {
      masteryAchieved = true;
    }

    // Note: We DO NOT auto-complete the module here anymore. 
    // The frontend handles the "Complete Module" action which calls a separate endpoint.
    // This endpoint just signals mastery of the current topic/checkpoint.

    res.json({
      response: aiResponse.response,
      quiz: aiResponse.quiz,
      code: aiResponse.code,
      suggestions: [],
      analysis: { score: masteryAchieved ? 100 : 0, strengths: [], weakPoints: [] },
      completed: false, // Deprecated in favor of mastery_achieved
      mastery_achieved: masteryAchieved
    });

  } catch (error) {
    console.error('Error in chat:', error);
    res.status(500).json({ error: 'Failed to process chat message' });
  }
});

// Streaming version of module chat for typing effect
router.get('/modules/chat/stream', async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { module_id, message, conversation_history, token } = req.query;

    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('X-Accel-Buffering', 'no');

    if (!module_id || !message) {
      res.write(`data: ${JSON.stringify({ type: 'error', message: 'Missing required parameters' })}\n\n`);
      res.end();
      return;
    }

    // Verify module belongs to user's subject
    const module = await prisma.learningModule.findFirst({
      where: {
        id: module_id as string,
        subject: {
          user_id: userId
        }
      },
      include: {
        subject: true,
        assignments: true
      }
    });

    if (!module) {
      res.write(`data: ${JSON.stringify({ type: 'error', message: 'Module not found' })}\n\n`);
      res.end();
      return;
    }

    // Check if module is already completed
    const existingProgress = await prisma.learningProgress.findFirst({
      where: {
        user_id: userId,
        module_id: module_id as string
      }
    });

    if (existingProgress?.status === 'completed') {
      const completeResponse = "This module is already completed! 🎉 You can review the content or move on to the next module.";

      // Send word by word for typing effect
      const words = completeResponse.split(' ');
      for (const word of words) {
        res.write(`data: ${JSON.stringify({ type: 'content', content: word + ' ' })}\n\n`);
        if (res.flush) res.flush();
        await new Promise(resolve => setTimeout(resolve, 30));
      }

      res.write(`data: ${JSON.stringify({
        type: 'complete',
        mastery_achieved: true
      })}\n\n`);
      res.end();
      return;
    }

    // Check assignments
    const hasAssignments = module.assignments && module.assignments.length > 0;
    let pendingAssignmentsCount = 0;

    if (hasAssignments) {
      const assignmentSubmissions = await prisma.assignmentSubmission.findMany({
        where: {
          user_id: userId,
          assignment: {
            module_id: module_id as string
          }
        }
      });

      const submittedAssignmentIds = assignmentSubmissions.map(sub => sub.assignment_id);
      const allAssignmentIds = module.assignments.map(assignment => assignment.id);
      pendingAssignmentsCount = allAssignmentIds.length - submittedAssignmentIds.length;
    }

    // Build context
    const assignmentsInfo = hasAssignments
      ? `Assignments: ${module.assignments.length} total, ${pendingAssignmentsCount} pending submissions`
      : 'Assignments: None';

    const parsedHistory = conversation_history ? JSON.parse(conversation_history as string) : [];

    const context = `
Module: ${module.title}
Description: ${module.description || 'No description'}
Content: ${module.content || 'No content'}
Difficulty: ${module.difficulty || 'Not specified'}
Subject: ${module.subject.name}
Current Status: ${existingProgress?.status || 'not_started'}
${assignmentsInfo}

${hasAssignments && pendingAssignmentsCount > 0
        ? `CRITICAL: This module has ${pendingAssignmentsCount} unsubmitted assignment(s). The user MUST complete and submit ALL assignments before they can mark this module as completed. Do not suggest completion until all assignments are submitted.`
        : 'All assignments have been submitted - user can potentially complete this module.'}

IMPORTANT: You can ONLY suggest that the user mark this module as completed when they demonstrate sufficient understanding AND have completed ALL assignments for this module.

Conversation History:
${parsedHistory ? parsedHistory.map((msg: any) => `${msg.role}: ${msg.content}`).join('\n') : 'No previous conversation'}

User's current message: ${message}
    `.trim();

    // Generate AI response
    const aiResponse = await aiService.chatWithModule(
      message as string,
      context,
      parsedHistory || []
    );

    // Stream the response word by word for typing effect
    const responseText = aiResponse.response || "I'm here to help you learn!";
    const words = responseText.split(' ');

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      res.write(`data: ${JSON.stringify({
        type: 'content',
        content: word + (i < words.length - 1 ? ' ' : '')
      })}\n\n`);
      if (res.flush) res.flush();

      // Delay for typing effect (30ms per word)
      await new Promise(resolve => setTimeout(resolve, 30));
    }

    // Send completion with quiz/code if available
    res.write(`data: ${JSON.stringify({
      type: 'complete',
      quiz: aiResponse.quiz,
      code: aiResponse.code,
      mastery_achieved: aiResponse.mastery_achieved || false
    })}\n\n`);

    if (res.flush) res.flush();
    res.end();

  } catch (error) {
    console.error('Error in streaming chat:', error);
    res.write(`data: ${JSON.stringify({
      type: 'error',
      message: 'Failed to process message'
    })}\n\n`);
    res.end();
  }
});



// Cross-domain learning analysis
router.post('/cross-domain/analyze', async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { current_subject, learning_history } = req.body;

    if (!current_subject) {
      return res.status(400).json({ error: 'Current subject is required' });
    }

    const analysis = await aiService.analyzeCrossDomainSkills(
      userId,
      current_subject,
      learning_history || []
    );

    res.json({
      success: true,
      analysis
    });
  } catch (error) {
    console.error('Error analyzing cross-domain skills:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze cross-domain skills'
    });
  }
});

// Code execution endpoint
router.post('/code/execute', async (req, res) => {
  try {
    const { code, language = 'javascript', timeout = 5000 } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Code is required' });
    }

    // For security, only allow JavaScript for now
    if (language !== 'javascript') {
      return res.status(400).json({ error: 'Only JavaScript execution is currently supported' });
    }

    // Basic security checks
    const dangerousPatterns = [
      /require\s*\(/,
      /import\s+/,
      /process\s*\./,
      /fs\s*\./,
      /child_process/,
      /eval\s*\(/,
      /Function\s*\(/,
      /global\s*\./,
      /__dirname/,
      /__filename/,
      /console\s*\./,
      /setTimeout\s*\(/,
      /setInterval\s*\(/,
      /while\s*\(/,
      /for\s*\([^;]*;[^;]*;[^)]*\)/
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(code)) {
        return res.status(400).json({
          error: 'Code contains potentially unsafe operations',
          output: '',
          executionTime: 0
        });
      }
    }

    // Execute code in a sandboxed environment
    const startTime = Date.now();

    try {
      // Use Function constructor for isolated execution (safer than eval)
      const executeCode = new Function('code', `
        const console = {
          log: (...args) => output.push(args.join(' ')),
          error: (...args) => output.push('Error: ' + args.join(' ')),
          warn: (...args) => output.push('Warning: ' + args.join(' '))
        };
        let output = [];
        try {
          const result = (${code});
          if (result !== undefined) {
            output.push(String(result));
          }
        } catch (error) {
          output.push('Error: ' + error.message);
        }
        return output.join('\\n');
      `);

      const result = executeCode(code);
      const executionTime = Date.now() - startTime;

      // Check execution time
      if (executionTime > timeout) {
        return res.status(400).json({
          error: 'Code execution timed out',
          output: '',
          executionTime
        });
      }

      res.json({
        success: true,
        output: result,
        executionTime,
        language
      });
    } catch (error) {
      const executionTime = Date.now() - startTime;
      res.status(400).json({
        success: false,
        error: 'Code execution failed: ' + (error as Error).message,
        output: '',
        executionTime
      });
    }
  } catch (error) {
    console.error('Error in code execution:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to execute code'
    });
  }
});

// Skill Assessment
router.post('/assess-skill', async (req, res) => {
  try {
    const { topic, chatHistory } = req.body;
    if (!topic) {
      return res.status(400).json({ error: 'Topic is required' });
    }

    const assessment = await aiService.generateSkillAssessment(topic, chatHistory);
    res.json(assessment);
  } catch (error) {
    console.error('Error generating skill assessment:', error);
    res.status(500).json({ error: 'Failed to generate assessment' });
  }
});

// Generate Curriculum
router.post('/generate-curriculum', async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { topic, assessmentResults, chatHistory } = req.body;

    if (!topic) {
      return res.status(400).json({ error: 'Topic is required' });
    }

    // Generate curriculum structure
    const curriculum = await aiService.generateCurriculum(topic, assessmentResults, chatHistory);

    // Create the subject in the database
    const subject = await prisma.learningSubject.create({
      data: {
        user_id: userId,
        name: curriculum.title,
        description: curriculum.description,
        goals: JSON.stringify([`Master ${topic}`])
      }
    });

    // Create modules
    const modules = await Promise.all(curriculum.modules.map((mod, index) =>
      prisma.learningModule.create({
        data: {
          subject_id: subject.id,
          title: mod.title,
          description: mod.description,
          estimated_time: mod.estimated_time,
          difficulty: mod.difficulty,
          order_index: index,
          checkpoints: JSON.stringify(mod.checkpoints || [])
        }
      })
    ));

    // NEW: Search for suggested YouTube videos for each module
    const modulesWithVideos = await Promise.all(
      modules.map(async (module, index) => {
        try {
          const searchQuery = `${topic} ${module.title} tutorial`;
          console.log(`📹 Searching YouTube for module: ${module.title}`);

          const ytResult = await youtubeService.searchYouTubeVideos(searchQuery, 3);

          if (ytResult.videos.length > 0) {
            // Store YouTube suggestions in module metadata
            await prisma.learningModule.update({
              where: { id: module.id },
              data: {
                content: `${module.description || ''}\n\n## Suggested Videos:\n${ytResult.videos.map(v =>
                  `- [${v.title}](${v.url}) by ${v.channelTitle}`
                ).join('\n')}`
              }
            });

            console.log(`✅ Added ${ytResult.videos.length} video suggestions for "${module.title}"`);

            return {
              ...module,
              suggestedVideos: ytResult.videos.map(v => ({
                id: v.id,
                title: v.title,
                url: v.url,
                thumbnail: v.thumbnail,
                channelTitle: v.channelTitle,
                duration: v.duration
              }))
            };
          }
        } catch (error) {
          console.warn(`Failed to fetch YouTube videos for module "${module.title}":`, error);
        }

        return { ...module, suggestedVideos: [] };
      })
    );

    res.json({
      title: subject.name,
      description: subject.description,
      modules: modulesWithVideos,
      id: subject.id
    });
  } catch (error) {
    console.error('Error generating curriculum:', error);
    res.status(500).json({ error: 'Failed to generate curriculum' });
  }
});

// Archive Subject
router.patch('/subjects/:id/archive', async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;

    const subject = await prisma.learningSubject.updateMany({
      where: { id, user_id: userId },
      data: { is_active: false }
    });

    if (subject.count === 0) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error archiving subject:', error);
    res.status(500).json({ error: 'Failed to archive subject' });
  }
});

// Delete Subject
router.delete('/subjects/:id', async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;

    const subject = await prisma.learningSubject.deleteMany({
      where: { id, user_id: userId }
    });

    if (subject.count === 0) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting subject:', error);
    res.status(500).json({ error: 'Failed to delete subject' });
  }
});

export default router;