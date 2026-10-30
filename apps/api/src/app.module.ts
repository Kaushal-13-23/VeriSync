import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { AuditModule } from './audit/audit.module';
import { CandidatesModule } from './candidates/candidates.module';
import { QuestionsModule } from './questions/questions.module';
import { AssessmentsModule } from './assessments/assessments.module';
import { SessionsModule } from './sessions/sessions.module';
import { EvaluationModule } from './evaluation/evaluation.module';
import { ResultsModule } from './results/results.module';
import { PrismaService } from './common/prisma.service';
import { CorrelationIdMiddleware } from './common/correlation-id.middleware';
import { AllExceptionsFilter } from './common/all-exceptions.filter';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';

@Module({
  imports: [
    AuditModule,
    AuthModule,
    CandidatesModule,
    QuestionsModule,
    AssessmentsModule,
    SessionsModule,
    EvaluationModule,
    ResultsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    PrismaService,
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
