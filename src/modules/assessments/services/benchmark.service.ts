import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AssignmentSubmission } from '../schemas/assignment-submission.schema';

@Injectable()
export class BenchmarkService {
  constructor(
    @InjectModel(AssignmentSubmission.name)
    private readonly submissionModel: Model<AssignmentSubmission>,
  ) {}

  async compareToClassMedian(
    assignmentId: string,
    runtimeMs: number,
    memoryKb: number,
  ) {
    const subs = await this.submissionModel
      .find({
        assignmentId: new Types.ObjectId(assignmentId),
        runtime: { $exists: true, $ne: null },
      })
      .select('runtime memory')
      .exec();

    if (subs.length < 2) {
      return {
        sampleSize: subs.length,
        suggestions: ['Not enough submissions for class comparison yet'],
      };
    }

    const runtimes = subs.map((s) => s.runtime ?? 0).sort((a, b) => a - b);
    const memories = subs.map((s) => s.memory ?? 0).sort((a, b) => a - b);
    const medianRuntime = runtimes[Math.floor(runtimes.length / 2)] ?? 0;
    const medianMemory = memories[Math.floor(memories.length / 2)] ?? 0;

    const suggestions: string[] = [];
    if (runtimeMs > medianRuntime * 1.5) {
      suggestions.push(
        `Runtime (${runtimeMs}ms) is above class median (${medianRuntime}ms); consider algorithmic optimization`,
      );
    } else if (runtimeMs < medianRuntime * 0.5) {
      suggestions.push(
        'Runtime is well below class median — excellent performance',
      );
    }
    if (memoryKb > medianMemory * 1.5) {
      suggestions.push(
        `Memory (${memoryKb}KB) exceeds class median (${medianMemory}KB); review data structures`,
      );
    }
    if (!suggestions.length) {
      suggestions.push('Performance is near class median');
    }

    return {
      sampleSize: subs.length,
      medianRuntimeMs: medianRuntime,
      medianMemoryKb: medianMemory,
      yourRuntimeMs: runtimeMs,
      yourMemoryKb: memoryKb,
      suggestions,
    };
  }
}
