import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { BadgeType, BadgeLevel } from '../enums/gamification.enums';

export type BadgeDocument = HydratedDocument<Badge>;

@Schema({ timestamps: true, collection: 'badges' })
export class Badge {
  @Prop({ required: true, unique: true })
  name!: string;

  @Prop({ required: true })
  description!: string;

  @Prop({ type: String, enum: BadgeType, required: true })
  type!: string;

  @Prop({ type: Object, default: {} })
  criteria!: Record<string, unknown>;

  @Prop()
  icon?: string;

  @Prop({ required: true, default: 0 })
  pointsValue!: number;

  @Prop({ type: String, enum: BadgeLevel, default: BadgeLevel.Bronze })
  level!: string;
}

export const BadgeSchema = SchemaFactory.createForClass(Badge);
